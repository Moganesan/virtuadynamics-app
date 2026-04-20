/**
 * useWearOS — Wear OS real-time vitals hook
 *
 * Three connection states:
 *   unpaired   — no watch saved in storage, nothing to wait for
 *   paired     — watch was BLE-paired and saved, but no vitals yet
 *   connected  — vitals are actively flowing
 *
 * Transport priority:
 *   1. BLE GATT notifications  ← primary (direct Bluetooth, no WiFi/server needed)
 *      bluetooth.ts subscribes to the vitals characteristic and emits 'ble:vitals'.
 *   2. Wearable Data Layer     ← only works with Galaxy Wearable app OS pairing
 *   3. Server socket relay     ← fallback when BLE isn't connected
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { getSocket } from './socket';

// Same key used by bluetooth.ts — kept in sync manually
const PAIRED_WATCH_KEY = 'vd_paired_watch';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WearVitals {
    heartRate: string;
    spo2: string;           // blood oxygen %
    steps: string;
    calories: string;
    distance: string;
    temperature?: string;   // °C — available from server relay
    bloodPressure?: string; // systolic/diastolic — available from server relay
    trend?: string;
}

export interface WearDevice {
    id: string;
    displayName: string;
    isNearby?: boolean;
}

export interface WearOSState {
    /** Watch was saved via BLE pairing (persistent across sessions) */
    paired: boolean;
    /** Watch is actively sending vitals right now */
    connected: boolean;
    /** Display name of the paired watch */
    device: WearDevice | null;
    /** Latest vitals from the watch */
    vitals: WearVitals | null;
    /** When the last message arrived */
    lastUpdated: Date | null;
    /**
     * Send a "start_vitals" command to the watch via Wearable Data Layer.
     * Requires Galaxy Wearable / Wear OS companion app pairing.
     * Falls back gracefully if no Wearable nodes are found.
     */
    pingWatch: () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useWearOS(): WearOSState {
    const [paired,      setPaired]      = useState(false);
    const [connected,   setConnected]   = useState(false);
    const [device,      setDevice]      = useState<WearDevice | null>(null);
    const [vitals,      setVitals]      = useState<WearVitals | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const staleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Mark disconnected if no message arrives for 60 s (but keep paired=true)
    const resetStaleTimer = () => {
        if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
        staleTimerRef.current = setTimeout(() => setConnected(false), 60_000);
    };

    // ── Shared vitals handler — called by any transport ───────────────────────
    const applyVitals = (v: WearVitals) => {
        setVitals(v);
        setLastUpdated(new Date());
        setConnected(true);
        setPaired(true);
        setDevice((prev) => prev ?? { id: 'wear-os-watch', displayName: 'Wear OS Watch' });
        resetStaleTimer();
    };

    // ── Check AsyncStorage for a previously paired watch ─────────────────────
    useEffect(() => {
        AsyncStorage.getItem(PAIRED_WATCH_KEY)
            .then((raw) => {
                if (!raw) return;
                const saved = JSON.parse(raw);
                setPaired(true);
                setDevice({ id: saved.id, displayName: saved.name });
            })
            .catch(() => {});
    }, []);

    // ── Transport 1: BLE GATT notifications ──────────────────────────────────
    // bluetooth.ts keeps the GATT connection alive and emits 'ble:vitals' whenever
    // the watch sends a characteristic notification. No WiFi or server required.
    useEffect(() => {
        const vitalsSub = DeviceEventEmitter.addListener('ble:vitals', (message: Record<string, unknown>) => {
            const heartRate = String(message.heartRate ?? '--');
            const spo2      = String(message.spo2      ?? '--');
            const steps     = String(message.steps     ?? '--');
            const calories  = String(message.calories  ?? '--');
            const distance  = String(message.distance  ?? '--');
            applyVitals({ heartRate, spo2, steps, calories, distance });
        });

        // When GATT drops (BT off, device out of range), immediately mark disconnected
        const discSub = DeviceEventEmitter.addListener('ble:disconnected', () => {
            setConnected(false);
            if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
        });

        return () => {
            vitalsSub.remove();
            discSub.remove();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Transport 2: Wearable Data Layer ─────────────────────────────────────
    //
    // WearConnectivityMessageClient.onMessageReceived reads getPath() as JSON,
    // fires a HeadlessJsTask → DeviceEventEmitter.emit('message', data).
    // watchEvents.on is a thin wrapper over the same DeviceEventEmitter on Android.
    // We register both to be safe.
    useEffect(() => {
        const handleWearMessage = (message: Record<string, unknown>) => {
            const heartRate = String(message.heartRate ?? message.heart_rate ?? '--');
            const spo2      = String(message.spo2      ?? message.blood_oxygen ?? '--');
            const steps     = String(message.steps     ?? '--');
            const calories  = String(message.calories  ?? '--');
            const distance  = String(message.distance  ?? '--');
            applyVitals({ heartRate, spo2, steps, calories, distance });
        };

        const deeSub = DeviceEventEmitter.addListener('message', handleWearMessage);

        let wearUnsubscribe: (() => void) | null = null;
        try {
            const wearConn = require('react-native-wear-connectivity');
            wearUnsubscribe = wearConn.watchEvents.on('message', handleWearMessage);
        } catch (e) {
            console.warn('[WearOS] react-native-wear-connectivity not available:', e);
        }

        return () => {
            deeSub.remove();
            if (wearUnsubscribe) wearUnsubscribe();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Transport 2: Server socket relay ─────────────────────────────────────
    //
    // The watch POSTs vitals to the Node.js server (VitalMonitoringService.kt →
    // Retrofit → POST /api/vitals). The server saves and broadcasts vitals:new.
    // This path works without any Wearable Data Layer / OS-level pairing.
    useEffect(() => {
        const socket = getSocket();

        const handleSocketVitals = (vital: {
            heartRate?: number;
            bloodOxygen?: number;
            temperature?: number;
            bloodPressure?: string;
            trend?: string;
        }) => {
            console.log('[WearOS] Vitals via server socket relay:', vital);
            applyVitals({
                heartRate:     vital.heartRate    != null ? String(vital.heartRate)    : '--',
                spo2:          vital.bloodOxygen  != null ? String(vital.bloodOxygen)  : '--',
                steps:         '--',  // server route doesn't carry steps
                calories:      '--',
                distance:      '--',
                temperature:   vital.temperature  != null ? String(vital.temperature)  : undefined,
                bloodPressure: vital.bloodPressure ?? undefined,
                trend:         vital.trend        ?? undefined,
            });
        };

        socket.on('vitals:new',     handleSocketVitals);
        socket.on('vitals:updated', handleSocketVitals);
        socket.on('watch:vitals',   handleSocketVitals);

        return () => {
            socket.off('vitals:new',     handleSocketVitals);
            socket.off('vitals:updated', handleSocketVitals);
            socket.off('watch:vitals',   handleSocketVitals);
            if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Listen for pairing changes from bluetooth.ts (AsyncStorage writes) ───
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const raw = await AsyncStorage.getItem(PAIRED_WATCH_KEY);
                if (raw && !paired) {
                    const saved = JSON.parse(raw);
                    setPaired(true);
                    setDevice({ id: saved.id, displayName: saved.name });
                } else if (!raw && paired && !connected) {
                    setPaired(false);
                    setDevice(null);
                }
            } catch { /* ignore */ }
        }, 3_000);
        return () => clearInterval(interval);
    }, [paired, connected]);

    // ── Ping the watch to start sending vitals immediately ───────────────────
    // sendMessage(data, successCb, errorCb) — returns void, NOT a Promise.
    // Requires Wearable Data Layer (OS-level Wear OS/Galaxy Wearable pairing).
    const pingWatch = () => {
        try {
            const { sendMessage } = require('react-native-wear-connectivity');
            sendMessage(
                { command: 'start_vitals', event: 'message' },
                (reply: string) => console.log('[WearOS] Wearable Data Layer ping acknowledged:', reply),
                (_err: string)  => {
                    // "No connected nodes" is expected unless the watch is paired via
                    // Galaxy Wearable / Wear OS companion app (OS-level pairing).
                    // Vitals are delivered via the server socket relay regardless.
                }
            );
        } catch (e) {
            console.warn('[WearOS] sendMessage not available:', e);
        }
    };

    return { paired, connected, device, vitals, lastUpdated, pingWatch };
}
