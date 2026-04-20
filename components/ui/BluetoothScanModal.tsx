import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppColors } from '@/constants/theme';
import { BLEDevice, BluetoothState } from '@/services/bluetooth';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

interface Props extends Pick<BluetoothState,
    | 'bluetoothOn' | 'scanning' | 'devices'
    | 'permissionsGranted' | 'locationEnabled'
    | 'connectingId' | 'connectError'
    | 'requestPermissions' | 'openLocationSettings'
    | 'startScan' | 'stopScan' | 'connectDevice'
> {
    visible: boolean;
    onClose: () => void;
    /** Called after a device is successfully paired (GATT success or saved-on-fail) */
    onDeviceSelected: (device: BLEDevice) => void;
}

// ── Signal strength bars ──────────────────────────────────────────────────────

const SignalBars = ({ rssi }: { rssi: number | null }) => {
    if (rssi === null) return null;
    const strength = rssi >= -55 ? 3 : rssi >= -70 ? 2 : 1;
    return (
        <View style={ss.barsRow}>
            {[1, 2, 3].map((level) => (
                <View
                    key={level}
                    style={[ss.bar, { height: level * 5 + 2 },
                        level <= strength ? ss.barActive : ss.barInactive]}
                />
            ))}
        </View>
    );
};

// ── Spinning scan ring ────────────────────────────────────────────────────────

const ScanRing = () => {
    const spin = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(
            Animated.timing(spin, { toValue: 1, duration: 1400, useNativeDriver: true })
        ).start();
        return () => spin.stopAnimation();
    }, []);
    const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    return <Animated.View style={[ss.scanRing, { transform: [{ rotate }] }]} />;
};

// ── Main modal ────────────────────────────────────────────────────────────────

export const BluetoothScanModal = ({
    visible, onClose, onDeviceSelected,
    bluetoothOn, scanning, devices,
    permissionsGranted, locationEnabled,
    connectingId, connectError,
    requestPermissions, openLocationSettings,
    startScan, stopScan, connectDevice,
}: Props) => {
    // Track which device just succeeded so we can show a tick before closing
    const [succeededId, setSucceededId] = useState<string | null>(null);

    // Auto-start scan when modal opens
    useEffect(() => {
        if (!visible) {
            setSucceededId(null);
            return;
        }
        const t = setTimeout(() => startScan(12_000), 300);
        return () => {
            clearTimeout(t);
            stopScan();
        };
    }, [visible]);

    const handleConnect = async (device: BLEDevice) => {
        const ok = await connectDevice(device);
        if (ok) {
            setSucceededId(device.id);
            // Show success tick briefly, then close
            setTimeout(() => {
                onDeviceSelected(device);
                onClose();
            }, 900);
        } else {
            // connectDevice already saves the device even on GATT failure,
            // so we still surface it as "saved" and let the user decide
            setSucceededId(device.id);
            setTimeout(() => {
                onDeviceSelected(device);
                onClose();
            }, 1200);
        }
    };

    const watchDevices = devices.filter((d) => d.isWearOS);
    const otherDevices = devices.filter((d) => !d.isWearOS);
    const isConnecting = connectingId !== null;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={isConnecting ? undefined : onClose}>
                <View style={ss.overlay} />
            </TouchableWithoutFeedback>

            <View style={ss.sheet}>
                <View style={ss.handle} />

                {/* ── Header ── */}
                <View style={ss.header}>
                    <View style={ss.headerLeft}>
                        <Text style={ss.title}>
                            {isConnecting ? 'Connecting…' : 'Scan for Watch'}
                        </Text>
                        <Text style={ss.subtitle}>
                            {isConnecting
                                ? `Pairing with ${devices.find(d => d.id === connectingId)?.name ?? 'device'}…`
                                : !bluetoothOn
                                    ? 'Bluetooth is off'
                                    : !permissionsGranted
                                        ? 'Permissions required'
                                        : !locationEnabled
                                            ? 'Location Services disabled'
                                            : scanning
                                                ? 'Scanning nearby devices…'
                                                : `${devices.length} device${devices.length !== 1 ? 's' : ''} found`}
                        </Text>
                    </View>

                    {bluetoothOn && permissionsGranted && locationEnabled && !isConnecting && (
                        <TouchableOpacity
                            style={[ss.scanBtn, scanning && ss.scanBtnActive]}
                            onPress={() => scanning ? stopScan() : startScan(12_000)}
                            activeOpacity={0.75}
                        >
                            {scanning && <ScanRing />}
                            <IconSymbol
                                name={scanning ? 'stop.circle.fill' : 'arrow.clockwise.circle.fill'}
                                size={20}
                                color={scanning ? AppColors.critical : AppColors.primary}
                            />
                            <Text style={[ss.scanBtnLabel, scanning && { color: AppColors.critical }]}>
                                {scanning ? 'Stop' : 'Scan'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* ── Full-screen connecting overlay ── */}
                {isConnecting && (
                    <View style={ss.connectingBody}>
                        <View style={ss.connectingRingOuter}>
                            <ActivityIndicator size="large" color={AppColors.primary} />
                        </View>
                        <Text style={ss.connectingName}>
                            {devices.find(d => d.id === connectingId)?.name ?? 'Device'}
                        </Text>
                        <Text style={ss.connectingHint}>
                            Establishing connection…{'\n'}Keep your watch nearby.
                        </Text>
                    </View>
                )}

                {/* ── Error banner (shown briefly above list if GATT failed but saved) ── */}
                {!isConnecting && connectError && (
                    <View style={ss.errorBanner}>
                        <IconSymbol name="exclamationmark.triangle.fill" size={14} color={AppColors.warning} />
                        <Text style={ss.errorText} numberOfLines={2}>
                            GATT link failed — watch saved anyway. Vitals will arrive once the watch app is running.
                        </Text>
                    </View>
                )}

                {/* ── Bluetooth off ── */}
                {!isConnecting && !bluetoothOn && (
                    <View style={ss.emptyState}>
                        <IconSymbol name="bluetooth" size={40} color={AppColors.border} />
                        <Text style={ss.emptyTitle}>Bluetooth is off</Text>
                        <Text style={ss.emptyHint}>Enable Bluetooth in your device settings, then tap Scan.</Text>
                        <TouchableOpacity style={ss.retryBtn} onPress={() => startScan(12_000)}>
                            <Text style={ss.retryLabel}>Try Again</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── Permissions ── */}
                {!isConnecting && bluetoothOn && !permissionsGranted && (
                    <View style={ss.emptyState}>
                        <IconSymbol name="lock.fill" size={36} color={AppColors.warning} />
                        <Text style={ss.emptyTitle}>Permission Required</Text>
                        <Text style={ss.emptyHint}>Bluetooth scan permission is needed to find nearby watches.</Text>
                        <TouchableOpacity style={ss.retryBtn} onPress={async () => {
                            const ok = await requestPermissions();
                            if (ok) startScan(12_000);
                        }}>
                            <Text style={ss.retryLabel}>Grant Permission</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── Location Services off ── */}
                {!isConnecting && bluetoothOn && permissionsGranted && !locationEnabled && (
                    <View style={ss.emptyState}>
                        <IconSymbol name="location.slash.fill" size={36} color={AppColors.warning} />
                        <Text style={ss.emptyTitle}>Location Services Off</Text>
                        <Text style={ss.emptyHint}>
                            Android requires Location Services to be ON{'\n'}
                            to scan for Bluetooth devices.{'\n'}
                            Your location is not collected or shared.
                        </Text>
                        <TouchableOpacity style={ss.retryBtn} onPress={openLocationSettings}>
                            <Text style={ss.retryLabel}>Open Location Settings</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[ss.retryBtn, { marginTop: 6, backgroundColor: `${AppColors.border}40` }]}
                            onPress={() => startScan(12_000)}>
                            <Text style={[ss.retryLabel, { color: AppColors.textSecondary }]}>Try Again</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── Device list ── */}
                {!isConnecting && bluetoothOn && permissionsGranted && locationEnabled && (
                    <ScrollView style={ss.list} showsVerticalScrollIndicator={false}>
                        {scanning && devices.length === 0 && (
                            <View style={ss.scanningRow}>
                                <ActivityIndicator size="small" color={AppColors.primary} />
                                <Text style={ss.scanningText}>Looking for devices…</Text>
                            </View>
                        )}

                        {!scanning && devices.length === 0 && (
                            <View style={ss.emptyState}>
                                <IconSymbol name="applewatch" size={36} color={AppColors.border} />
                                <Text style={ss.emptyTitle}>No devices found</Text>
                                <Text style={ss.emptyHint}>
                                    Make sure your watch is nearby and not in power-saving mode.
                                </Text>
                                <TouchableOpacity style={ss.retryBtn} onPress={() => startScan(12_000)}>
                                    <Text style={ss.retryLabel}>Scan Again</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {watchDevices.length > 0 && (
                            <>
                                <Text style={ss.groupLabel}>WEAR OS WATCHES</Text>
                                {watchDevices.map((d) => (
                                    <DeviceRow
                                        key={d.id}
                                        device={d}
                                        onConnect={handleConnect}
                                        isConnecting={connectingId === d.id}
                                        isSucceeded={succeededId === d.id}
                                        highlight
                                    />
                                ))}
                            </>
                        )}

                        {otherDevices.length > 0 && (
                            <>
                                <Text style={ss.groupLabel}>OTHER DEVICES</Text>
                                {otherDevices.map((d) => (
                                    <DeviceRow
                                        key={d.id}
                                        device={d}
                                        onConnect={handleConnect}
                                        isConnecting={connectingId === d.id}
                                        isSucceeded={succeededId === d.id}
                                    />
                                ))}
                            </>
                        )}

                        <View style={{ height: 24 }} />
                    </ScrollView>
                )}
            </View>
        </Modal>
    );
};

// ── Device row ────────────────────────────────────────────────────────────────

interface RowProps {
    device: BLEDevice;
    onConnect: (d: BLEDevice) => void;
    isConnecting: boolean;
    isSucceeded: boolean;
    highlight?: boolean;
}

const DeviceRow = ({ device, onConnect, isConnecting, isSucceeded, highlight }: RowProps) => (
    <TouchableOpacity
        style={[ss.deviceRow, isConnecting && ss.deviceRowActive]}
        onPress={() => !isConnecting && !isSucceeded && onConnect(device)}
        activeOpacity={0.7}
        disabled={isConnecting || isSucceeded}
    >
        <View style={[ss.deviceIcon, highlight && ss.deviceIconHL, isSucceeded && ss.deviceIconOk]}>
            {isConnecting
                ? <ActivityIndicator size="small" color={AppColors.primary} />
                : isSucceeded
                    ? <IconSymbol name="checkmark" size={18} color={AppColors.success} />
                    : <IconSymbol
                        name={highlight ? 'applewatch' : 'wave.3.right'}
                        size={18}
                        color={highlight ? AppColors.primary : AppColors.textSecondary}
                    />}
        </View>

        <View style={ss.deviceInfo}>
            <Text style={ss.deviceName} numberOfLines={1}>{device.name}</Text>
            <Text style={[ss.deviceStatus,
                isConnecting ? { color: AppColors.primary } :
                isSucceeded  ? { color: AppColors.success }  :
                { color: AppColors.textSecondary }
            ]}>
                {isConnecting ? 'Connecting…' : isSucceeded ? 'Paired ✓' : device.id}
            </Text>
        </View>

        <View style={ss.deviceRight}>
            {!isConnecting && !isSucceeded && <SignalBars rssi={device.rssi} />}
            {!isConnecting && !isSucceeded && (
                <View style={[ss.connectBtn, highlight && ss.connectBtnHL]}>
                    <Text style={[ss.connectBtnLabel, highlight && { color: AppColors.primary }]}>
                        Connect
                    </Text>
                </View>
            )}
        </View>
    </TouchableOpacity>
);

// ── Styles ────────────────────────────────────────────────────────────────────

const ss = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: {
        backgroundColor: AppColors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingBottom: 30,
        paddingTop: 12,
        maxHeight: '82%',
    },
    handle: {
        width: 40, height: 4, borderRadius: 2,
        backgroundColor: AppColors.border,
        alignSelf: 'center', marginBottom: 20,
    },
    header: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 16,
    },
    headerLeft: { flex: 1 },
    title:    { fontSize: 20, fontWeight: '700', color: AppColors.textPrimary, marginBottom: 2 },
    subtitle: { fontSize: 13, color: AppColors.textSecondary },
    scanBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: 20, backgroundColor: `${AppColors.primary}15`, overflow: 'hidden',
    },
    scanBtnActive:  { backgroundColor: `${AppColors.critical}12` },
    scanBtnLabel:   { fontSize: 13, fontWeight: '700', color: AppColors.primary },
    scanRing: {
        position: 'absolute', width: 52, height: 52, borderRadius: 26,
        borderWidth: 2, borderColor: `${AppColors.critical}40`, borderTopColor: AppColors.critical,
    },
    // connecting full-body
    connectingBody: {
        alignItems: 'center', paddingVertical: 36, gap: 14,
    },
    connectingRingOuter: {
        width: 72, height: 72, borderRadius: 36,
        borderWidth: 2, borderColor: `${AppColors.primary}30`,
        justifyContent: 'center', alignItems: 'center',
        backgroundColor: `${AppColors.primary}0a`,
    },
    connectingName: {
        fontSize: 18, fontWeight: '700', color: AppColors.textPrimary,
    },
    connectingHint: {
        fontSize: 13, color: AppColors.textSecondary,
        textAlign: 'center', lineHeight: 20,
    },
    // error banner
    errorBanner: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 8,
        backgroundColor: `${AppColors.warning}15`,
        borderRadius: 10, padding: 10, marginBottom: 12,
    },
    errorText: {
        flex: 1, fontSize: 12, color: AppColors.warning, lineHeight: 17,
    },
    list: { flexGrow: 0 },
    scanningRow: {
        flexDirection: 'row', alignItems: 'center',
        gap: 12, paddingVertical: 24, justifyContent: 'center',
    },
    scanningText: { fontSize: 14, color: AppColors.textSecondary },
    emptyState:  { alignItems: 'center', gap: 8, paddingVertical: 24 },
    emptyTitle:  { fontSize: 16, fontWeight: '600', color: AppColors.textSecondary },
    emptyHint: {
        fontSize: 13, color: AppColors.disconnected,
        textAlign: 'center', paddingHorizontal: 16, lineHeight: 18,
    },
    retryBtn: {
        marginTop: 8, paddingHorizontal: 20, paddingVertical: 8,
        backgroundColor: `${AppColors.primary}15`, borderRadius: 16,
    },
    retryLabel: { fontSize: 14, fontWeight: '700', color: AppColors.primary },
    groupLabel: {
        fontSize: 10, fontWeight: '700', color: AppColors.textSecondary,
        letterSpacing: 1.2, marginBottom: 8, marginTop: 4,
    },
    deviceRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 12, gap: 12,
        borderBottomWidth: 1, borderBottomColor: AppColors.border,
    },
    deviceRowActive: { backgroundColor: `${AppColors.primary}06` },
    deviceIcon: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: AppColors.background, justifyContent: 'center', alignItems: 'center',
    },
    deviceIconHL: { backgroundColor: `${AppColors.primary}15` },
    deviceIconOk: { backgroundColor: `${AppColors.success}15` },
    deviceInfo:   { flex: 1 },
    deviceName:   { fontSize: 14, fontWeight: '600', color: AppColors.textPrimary, marginBottom: 2 },
    deviceStatus: { fontSize: 11 },
    deviceRight:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
    connectBtn: {
        paddingHorizontal: 12, paddingVertical: 5,
        borderRadius: 12, backgroundColor: AppColors.background,
        borderWidth: 1, borderColor: AppColors.border,
    },
    connectBtnHL: {
        backgroundColor: `${AppColors.primary}12`,
        borderColor: `${AppColors.primary}40`,
    },
    connectBtnLabel: { fontSize: 12, fontWeight: '700', color: AppColors.textSecondary },
    barsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 18 },
    bar:        { width: 4, borderRadius: 2 },
    barActive:  { backgroundColor: AppColors.success },
    barInactive:{ backgroundColor: AppColors.border },
});
