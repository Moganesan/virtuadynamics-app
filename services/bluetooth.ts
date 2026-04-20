/**
 * useBluetooth — BLE scanning, connection, and live vitals via GATT notifications
 *
 * State machine:
 *   BT off                            → bluetoothOn=false
 *   BT on, no saved watch             → pairedWatch=null
 *   BT on, saved watch, not connected → pairedWatch≠null, isGattConnected=false
 *   BT on, GATT connected             → isGattConnected=true
 *   GATT connected + vitals flowing   → vitalsStreaming=true
 *
 * Vitals flow:
 *   Watch GATT server notifies characteristic
 *   → monitorCharacteristicForService callback
 *   → DeviceEventEmitter.emit('ble:vitals', parsedJSON)
 *   → useWearOS Transport 1 picks it up
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter, Linking, PermissionsAndroid, Platform } from 'react-native';
import { BleErrorCode, BleManager, Device, State, Subscription } from 'react-native-ble-plx';

// ── Singleton ─────────────────────────────────────────────────────────────────

let _singleton: BleManager | null = null;
function getManager(): BleManager {
    if (!_singleton) _singleton = new BleManager();
    return _singleton;
}

// ── GATT UUIDs — must match VitalMonitoringService.kt on the watch ─────────────

export const VITALS_SERVICE_UUID = '4FAFC201-1FB5-459E-8FCC-C5C9C331914B';
export const VITALS_CHAR_UUID    = 'BEB5483E-36E1-4688-B7F5-EA07361B26A8';

// ── Module-level GATT state ───────────────────────────────────────────────────

let _connectedDevice: Device | null = null;
let _vitalsSubscription: Subscription | null = null;

function cleanupGatt() {
    _vitalsSubscription?.remove();
    _vitalsSubscription = null;
    _connectedDevice = null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PAIRED_WATCH_KEY   = 'vd_paired_watch';
const CONNECT_TIMEOUT_MS = 15_000;

const WATCH_NAME_PATTERNS = [
    /wear/i, /watch/i, /galaxy watch/i, /pixel watch/i,
    /ticwatch/i, /fossil/i, /oppo watch/i, /oneplus watch/i,
    /huawei watch/i, /honor watch/i, /montblanc/i, /skagen/i,
    /diesel/i, /michael kors/i, /tag heuer/i, /misfit/i, /mobvoi/i,
];

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BLEDevice {
    id: string;
    name: string;
    rssi: number | null;
    isWearOS: boolean;
}

export interface BluetoothState {
    bluetoothOn: boolean;
    scanning: boolean;
    devices: BLEDevice[];
    pairedWatch: BLEDevice | null;
    permissionsGranted: boolean;
    locationEnabled: boolean;
    connectingId: string | null;
    connectError: string | null;
    /** GATT connection is currently live */
    isGattConnected: boolean;
    /** GATT is live AND vitals notifications are flowing */
    vitalsStreaming: boolean;
    requestPermissions: () => Promise<boolean>;
    openLocationSettings: () => void;
    startScan: (durationMs?: number) => void;
    stopScan: () => void;
    connectDevice: (device: BLEDevice) => Promise<boolean>;
    reconnectSavedWatch: () => Promise<boolean>;
    pairDevice: (device: BLEDevice) => Promise<void>;
    unpairDevice: () => Promise<void>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isWearOSDevice(name: string | null): boolean {
    if (!name) return false;
    return WATCH_NAME_PATTERNS.some((p) => p.test(name));
}

async function requestBLEPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    try {
        if (Platform.Version >= 31) {
            const results = await PermissionsAndroid.requestMultiple([
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            ]);
            return (
                results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN]       === PermissionsAndroid.RESULTS.GRANTED &&
                results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]    === PermissionsAndroid.RESULTS.GRANTED &&
                results[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED
            );
        }
        const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        return result === PermissionsAndroid.RESULTS.GRANTED;
    } catch (e) {
        console.warn('[BLE] Permission request failed:', e);
        return false;
    }
}

function openLocationSettings(): void {
    if (Platform.OS === 'android') {
        Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS').catch(() => Linking.openSettings());
    } else {
        Linking.openSettings();
    }
}

function decodeCharacteristicValue(b64: string | null): string | null {
    if (!b64) return null;
    try { return atob(b64); } catch { return null; }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useBluetooth(): BluetoothState {
    const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [bluetoothOn,        setBluetoothOn]        = useState(false);
    const [scanning,           setScanning]           = useState(false);
    const [devices,            setDevices]            = useState<BLEDevice[]>([]);
    const [pairedWatch,        setPairedWatch]        = useState<BLEDevice | null>(null);
    const [permissionsGranted, setPermissionsGranted] = useState(false);
    const [locationEnabled,    setLocationEnabled]    = useState(true);
    const [connectingId,       setConnectingId]       = useState<string | null>(null);
    const [connectError,       setConnectError]       = useState<string | null>(null);
    const [isGattConnected,    setIsGattConnected]    = useState(false);
    const [vitalsStreaming,    setVitalsStreaming]    = useState(false);

    // Keep latest pairedWatch in a ref so callbacks always see current value
    const pairedWatchRef = useRef<BLEDevice | null>(null);
    pairedWatchRef.current = pairedWatch;

    // ── Internal: subscribe to vitals characteristic ──────────────────────────
    const subscribeToVitals = useCallback(async (device: Device): Promise<boolean> => {
        try {
            await device.discoverAllServicesAndCharacteristics();
            const services = await device.services();
            const hasService = services.some(
                (s) => s.uuid.toUpperCase() === VITALS_SERVICE_UUID.toUpperCase()
            );
            if (!hasService) {
                console.warn('[BLE] Vitals GATT service not found — watch app may not be running');
                return false;
            }

            _vitalsSubscription?.remove();
            _vitalsSubscription = device.monitorCharacteristicForService(
                VITALS_SERVICE_UUID,
                VITALS_CHAR_UUID,
                (error, characteristic) => {
                    if (error) {
                        // GATT disconnected — update state
                        console.warn('[BLE] GATT notification error (device disconnected?):', error.message);
                        setIsGattConnected(false);
                        setVitalsStreaming(false);
                        cleanupGatt();
                        DeviceEventEmitter.emit('ble:disconnected', {});
                        return;
                    }
                    const raw = decodeCharacteristicValue(characteristic?.value ?? null);
                    if (!raw) return;
                    try {
                        const vitals = JSON.parse(raw);
                        setVitalsStreaming(true);
                        DeviceEventEmitter.emit('ble:vitals', vitals);
                    } catch {
                        console.warn('[BLE] Failed to parse vitals JSON:', raw);
                    }
                }
            );
            console.log('[BLE] Subscribed to vitals GATT notifications');
            return true;
        } catch (e: any) {
            console.warn('[BLE] subscribeToVitals error:', e?.message);
            return false;
        }
    }, []);

    // ── BT adapter state + load saved watch + auto-connect ───────────────────
    useEffect(() => {
        const manager = getManager();

        const sub = manager.onStateChange(async (state) => {
            const on = state === State.PoweredOn;
            console.log('[BLE] Adapter state:', state);
            setBluetoothOn(on);

            if (!on) {
                // BT turned off — clear GATT state immediately
                setIsGattConnected(false);
                setVitalsStreaming(false);
                cleanupGatt();
                DeviceEventEmitter.emit('ble:disconnected', {});
            }
        }, true);

        // Load saved watch from storage
        AsyncStorage.getItem(PAIRED_WATCH_KEY)
            .then((raw) => {
                if (raw) {
                    const saved = JSON.parse(raw);
                    setPairedWatch(saved);
                }
            })
            .catch(() => {});

        // Check existing permissions
        (async () => {
            if (Platform.OS !== 'android') { setPermissionsGranted(true); return; }
            if (Platform.Version >= 31) {
                const scan = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
                const conn = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
                const loc  = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
                setPermissionsGranted(scan && conn && loc);
            } else {
                const loc = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
                setPermissionsGranted(loc);
            }
        })();

        return () => sub.remove();
    }, []);

    // ── Auto-reconnect when BT turns on and we have a saved watch ────────────
    useEffect(() => {
        if (!bluetoothOn || !pairedWatch || isGattConnected) return;
        // Small delay so BT stack is fully ready
        const timer = setTimeout(async () => {
            if (!pairedWatchRef.current || isGattConnected) return;
            console.log('[BLE] Auto-reconnecting to saved watch:', pairedWatchRef.current.name);
            const manager = getManager();
            try {
                const connected = await manager.connectToDevice(pairedWatchRef.current.id, {
                    timeout: CONNECT_TIMEOUT_MS,
                    autoConnect: true, // let Android reconnect automatically
                });
                if (await connected.isConnected()) {
                    _connectedDevice = connected;
                    setIsGattConnected(true);
                    await subscribeToVitals(connected);
                }
            } catch (e: any) {
                console.log('[BLE] Auto-reconnect failed (watch may be out of range):', e?.message);
            }
        }, 2_000);
        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bluetoothOn, pairedWatch]);

    // ── Request permissions ───────────────────────────────────────────────────
    const requestPermissions = useCallback(async (): Promise<boolean> => {
        const granted = await requestBLEPermissions();
        setPermissionsGranted(granted);
        return granted;
    }, []);

    // ── Stop scan ─────────────────────────────────────────────────────────────
    const stopScan = useCallback(() => {
        if (scanTimerRef.current) { clearTimeout(scanTimerRef.current); scanTimerRef.current = null; }
        getManager().stopDeviceScan();
        setScanning(false);
    }, []);

    // ── Start scan ────────────────────────────────────────────────────────────
    const startScan = useCallback(async (durationMs = 12_000) => {
        let permsOk = permissionsGranted;
        if (!permsOk) {
            permsOk = await requestBLEPermissions();
            setPermissionsGranted(permsOk);
        }
        if (!permsOk) { console.warn('[BLE] Scan blocked: permissions denied'); return; }

        const manager = getManager();
        const adapterState = await manager.state();
        const isOn = adapterState === State.PoweredOn;
        setBluetoothOn(isOn);
        if (!isOn) { console.warn('[BLE] Scan blocked: adapter state:', adapterState); return; }

        setLocationEnabled(true);
        setDevices([]);
        setScanning(true);

        manager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
            if (error) {
                if (
                    error.errorCode === BleErrorCode.LocationServicesDisabled ||
                    error.message?.toLowerCase().includes('location services')
                ) {
                    setLocationEnabled(false);
                } else {
                    console.warn('[BLE] Scan error:', error.errorCode, error.message);
                }
                stopScan();
                return;
            }
            if (!device || (!device.name && !device.localName)) return;
            const name = device.name || device.localName || 'Unknown';
            const entry: BLEDevice = { id: device.id, name, rssi: device.rssi, isWearOS: isWearOSDevice(name) };
            setDevices((prev) => {
                const exists = prev.find((d) => d.id === entry.id);
                if (exists) return prev.map((d) => d.id === entry.id ? { ...d, rssi: entry.rssi } : d);
                return [...prev, entry].sort((a, b) => {
                    if (a.isWearOS !== b.isWearOS) return a.isWearOS ? -1 : 1;
                    return a.name.localeCompare(b.name);
                });
            });
        });

        scanTimerRef.current = setTimeout(stopScan, durationMs);
    }, [permissionsGranted, stopScan]);

    // ── Connect device ────────────────────────────────────────────────────────
    const connectDevice = useCallback(async (device: BLEDevice): Promise<boolean> => {
        const manager = getManager();
        setConnectingId(device.id);
        setConnectError(null);
        setIsGattConnected(false);
        setVitalsStreaming(false);
        cleanupGatt();
        stopScan();

        try {
            const connected = await manager.connectToDevice(device.id, {
                timeout: CONNECT_TIMEOUT_MS,
                autoConnect: false,
            });
            if (!await connected.isConnected()) throw new Error('Device reported not connected after link');

            await AsyncStorage.setItem(PAIRED_WATCH_KEY, JSON.stringify(device));
            setPairedWatch(device);
            _connectedDevice = connected;
            setIsGattConnected(true);

            console.log('[BLE] Connected to:', device.name);

            const streaming = await subscribeToVitals(connected);
            setVitalsStreaming(streaming);
            if (!streaming) {
                console.warn('[BLE] Vitals service not found — start the watch app first');
            }

            setConnectingId(null);
            return true;
        } catch (e: any) {
            const msg: string = e?.message ?? 'Connection failed';
            console.warn('[BLE] Connect error:', msg);
            setConnectError(msg);
            setConnectingId(null);
            setIsGattConnected(false);
            // Still save the watch so user stays paired even if GATT failed
            await AsyncStorage.setItem(PAIRED_WATCH_KEY, JSON.stringify(device));
            setPairedWatch(device);
            return false;
        }
    }, [stopScan, subscribeToVitals]);

    // ── Reconnect saved watch manually (e.g. after BT was off) ───────────────
    const reconnectSavedWatch = useCallback(async (): Promise<boolean> => {
        const watch = pairedWatchRef.current;
        if (!watch) return false;
        return connectDevice(watch);
    }, [connectDevice]);

    // ── Pair / Unpair ─────────────────────────────────────────────────────────
    const pairDevice = useCallback(async (device: BLEDevice) => {
        await AsyncStorage.setItem(PAIRED_WATCH_KEY, JSON.stringify(device));
        setPairedWatch(device);
    }, []);

    const unpairDevice = useCallback(async () => {
        cleanupGatt();
        if (_connectedDevice) {
            await getManager().cancelDeviceConnection(_connectedDevice.id).catch(() => {});
        }
        await AsyncStorage.removeItem(PAIRED_WATCH_KEY);
        setPairedWatch(null);
        setIsGattConnected(false);
        setVitalsStreaming(false);
        DeviceEventEmitter.emit('ble:disconnected', {});
    }, []);

    return {
        bluetoothOn, scanning, devices, pairedWatch,
        permissionsGranted, locationEnabled,
        connectingId, connectError,
        isGattConnected, vitalsStreaming,
        requestPermissions, openLocationSettings,
        startScan, stopScan,
        connectDevice, reconnectSavedWatch, pairDevice, unpairDevice,
    };
}
