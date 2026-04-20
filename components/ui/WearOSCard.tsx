import { BluetoothScanModal } from '@/components/ui/BluetoothScanModal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppColors } from '@/constants/theme';
import { BLEDevice, useBluetooth } from '@/services/bluetooth';
import { useWearOS } from '@/services/wearOS';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

// ── Mini vitals stat ──────────────────────────────────────────────────────────

const MiniStat = ({ icon, value, unit, color }: {
    icon: string; value: string; unit: string; color: string;
}) => (
    <View style={s.miniStat}>
        <IconSymbol name={icon} size={14} color={color} />
        <Text style={[s.miniVal, { color }]}>{value}</Text>
        <Text style={s.miniUnit}>{unit}</Text>
    </View>
);

// ── Live pulse dot ────────────────────────────────────────────────────────────

const LivePulse = () => {
    const anim = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 1.6, duration: 600, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 1,   duration: 600, useNativeDriver: true }),
            ])
        ).start();
        return () => anim.stopAnimation();
    }, []);
    return (
        <View style={s.pulseWrapper}>
            <Animated.View style={[s.pulseRing, { transform: [{ scale: anim }], opacity: 0.3 }]} />
            <View style={s.pulseDot} />
        </View>
    );
};

// ── Waiting pulse (slower, amber) ─────────────────────────────────────────────

const WaitPulse = () => {
    const anim = useRef(new Animated.Value(0.4)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0.4, duration: 900, useNativeDriver: true }),
            ])
        ).start();
        return () => anim.stopAnimation();
    }, []);
    return (
        <Animated.View style={[s.waitDot, { opacity: anim }]} />
    );
};

// ── Main card ─────────────────────────────────────────────────────────────────

export const WearOSCard = () => {
    const wearOS = useWearOS();
    const ble    = useBluetooth();
    const [scanVisible,    setScanVisible]    = useState(false);
    const [reconnecting,   setReconnecting]   = useState(false);

    const handleDeviceSelected = async (device: BLEDevice) => {
        if (!ble.pairedWatch || ble.pairedWatch.id !== device.id) {
            await ble.pairDevice(device);
        }
        wearOS.pingWatch();
    };

    const handleReconnect = async () => {
        setReconnecting(true);
        await ble.reconnectSavedWatch();
        setReconnecting(false);
    };

    // ── Derive display state from BLE + WearOS ─────────────────────────────
    const btOn         = ble.bluetoothOn;
    const hasSavedWatch = ble.pairedWatch !== null;
    const gattConnected = ble.isGattConnected;
    const vitalsLive    = wearOS.connected;           // vitals are actively flowing
    const watchName     = ble.pairedWatch?.name ?? wearOS.device?.displayName ?? 'Wear OS Watch';

    // Badge
    let badgeColor: string;
    let badgeLabel: string;
    if (!btOn) {
        badgeColor = AppColors.disconnected;
        badgeLabel = 'BT Off';
    } else if (vitalsLive) {
        badgeColor = AppColors.success;
        badgeLabel = 'Live';
    } else if (gattConnected) {
        badgeColor = AppColors.warning;
        badgeLabel = 'Connecting…';
    } else if (hasSavedWatch) {
        badgeColor = AppColors.warning;
        badgeLabel = 'Not Connected';
    } else {
        badgeColor = AppColors.disconnected;
        badgeLabel = 'Offline';
    }
    const badgeBg = `${badgeColor}18`;

    const lastSyncLabel = wearOS.lastUpdated
        ? `Last sync ${formatRelative(wearOS.lastUpdated)}`
        : null;

    return (
        <View style={s.card}>
            {/* ── Header ── */}
            <View style={s.header}>
                <View style={s.titleRow}>
                    <View style={[s.watchIcon, { borderColor: `${badgeColor}50` }]}>
                        <IconSymbol name="applewatch" size={20} color={badgeColor} />
                    </View>
                    <View>
                        <Text style={s.title}>Wear OS Watch</Text>
                        <Text style={s.subtitle}>
                            {hasSavedWatch ? watchName : 'No watch connected'}
                        </Text>
                    </View>
                </View>

                {/* Status badge */}
                <View style={[s.badge, { backgroundColor: badgeBg }]}>
                    {vitalsLive
                        ? <LivePulse />
                        : gattConnected
                            ? <ActivityIndicator size={8} color={AppColors.warning} style={{ marginRight: 2 }} />
                            : hasSavedWatch && btOn
                                ? <WaitPulse />
                                : <View style={[s.pulseDot, { backgroundColor: badgeColor }]} />}
                    <Text style={[s.badgeText, { color: badgeColor }]}>{badgeLabel}</Text>
                </View>
            </View>

            {/* ── STATE: BT off ── */}
            {!btOn && (
                <View style={s.offlineBody}>
                    <View style={[s.watchVisual, { borderColor: `${AppColors.disconnected}40` }]}>
                        <IconSymbol name="applewatch" size={36} color={AppColors.disconnected} />
                    </View>
                    <Text style={s.offlineHint}>Bluetooth is turned off</Text>
                    <Text style={s.offlineSub}>
                        Enable Bluetooth to connect your Wear OS watch and receive live vitals.
                    </Text>
                </View>
            )}

            {/* ── STATE: BT on, live vitals flowing ── */}
            {btOn && vitalsLive && wearOS.vitals && (
                <>
                    <View style={s.statsRow}>
                        <MiniStat icon="heart.fill"  value={wearOS.vitals.heartRate} unit="BPM"   color={AppColors.critical} />
                        <View style={s.divider} />
                        <MiniStat icon="lungs.fill"  value={wearOS.vitals.spo2 !== '--' ? wearOS.vitals.spo2 : '--'} unit="%" color={AppColors.primary} />
                        <View style={s.divider} />
                        <MiniStat icon="figure.walk" value={wearOS.vitals.steps}     unit="steps" color={AppColors.success} />
                    </View>

                    <View style={s.extraRow}>
                        <View style={s.extraItem}>
                            <IconSymbol name="flame.fill"    size={12} color={AppColors.warning} />
                            <Text style={s.extraText}>{wearOS.vitals.calories} kcal</Text>
                        </View>
                        <View style={s.extraItem}>
                            <IconSymbol name="location.fill" size={12} color={AppColors.primary} />
                            <Text style={s.extraText}>{wearOS.vitals.distance}</Text>
                        </View>
                        {lastSyncLabel && <Text style={s.syncLabel}>{lastSyncLabel}</Text>}

                        <TouchableOpacity style={s.changeBtn} onPress={() => setScanVisible(true)} activeOpacity={0.7}>
                            <IconSymbol name="arrow.triangle.2.circlepath" size={11} color={AppColors.textSecondary} />
                            <Text style={s.changeBtnLabel}>Change</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}

            {/* ── STATE: BT on, GATT connected, waiting for first vitals ── */}
            {btOn && gattConnected && !vitalsLive && (
                <View style={s.waitBody}>
                    <ActivityIndicator size="large" color={AppColors.warning} />
                    <Text style={s.waitTitle}>Connected — waiting for vitals…</Text>
                    <Text style={s.waitSub}>
                        Make sure the VirtuaDynamics app is open on your watch.
                    </Text>
                </View>
            )}

            {/* ── STATE: BT on, saved watch, not connected ── */}
            {btOn && !gattConnected && hasSavedWatch && (
                <View style={s.waitBody}>
                    <View style={[s.watchVisual, { borderColor: `${AppColors.warning}50` }]}>
                        <IconSymbol name="applewatch" size={32} color={AppColors.warning} />
                    </View>
                    <Text style={s.waitTitle}>Watch saved — not connected</Text>
                    <Text style={s.waitSub}>
                        Bring your watch closer and tap Reconnect, or scan for a different watch.
                    </Text>

                    <View style={s.waitActions}>
                        <TouchableOpacity
                            style={[s.reconnectBtn, reconnecting && { opacity: 0.6 }]}
                            onPress={handleReconnect}
                            disabled={reconnecting}
                            activeOpacity={0.75}
                        >
                            {reconnecting
                                ? <ActivityIndicator size="small" color={AppColors.primary} />
                                : <IconSymbol name="arrow.triangle.2.circlepath" size={13} color={AppColors.primary} />}
                            <Text style={s.reconnectBtnLabel}>
                                {reconnecting ? 'Reconnecting…' : 'Reconnect'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={s.scanBtnSmall} onPress={() => setScanVisible(true)} activeOpacity={0.75}>
                            <IconSymbol name="bluetooth" size={13} color={AppColors.textSecondary} />
                            <Text style={s.scanBtnSmallLabel}>Change Watch</Text>
                        </TouchableOpacity>
                    </View>

                    {ble.connectError && (
                        <Text style={s.errorText}>{ble.connectError}</Text>
                    )}
                </View>
            )}

            {/* ── STATE: BT on, no saved watch ── */}
            {btOn && !hasSavedWatch && (
                <View style={s.offlineBody}>
                    <View style={s.watchVisual}>
                        <IconSymbol name="applewatch" size={36} color={AppColors.border} />
                    </View>
                    <Text style={s.offlineHint}>No Wear OS watch connected</Text>
                    <Text style={s.offlineSub}>
                        Scan for a nearby Wear OS watch to receive live vitals
                    </Text>
                    <TouchableOpacity style={s.scanBtn} onPress={() => setScanVisible(true)} activeOpacity={0.75}>
                        <IconSymbol name="bluetooth" size={14} color={AppColors.primary} />
                        <Text style={s.scanBtnLabel}>Scan for Watch</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* ── BLE scan modal ── */}
            <BluetoothScanModal
                visible={scanVisible}
                onClose={() => setScanVisible(false)}
                onDeviceSelected={handleDeviceSelected}
                bluetoothOn={ble.bluetoothOn}
                scanning={ble.scanning}
                devices={ble.devices}
                permissionsGranted={ble.permissionsGranted}
                locationEnabled={ble.locationEnabled}
                connectingId={ble.connectingId}
                connectError={ble.connectError}
                requestPermissions={ble.requestPermissions}
                openLocationSettings={ble.openLocationSettings}
                startScan={ble.startScan}
                stopScan={ble.stopScan}
                connectDevice={ble.connectDevice}
            />
        </View>
    );
};

// ── Util ──────────────────────────────────────────────────────────────────────

function formatRelative(date: Date): string {
    const secs = Math.floor((Date.now() - date.getTime()) / 1000);
    if (secs < 5)   return 'just now';
    if (secs < 60)  return `${secs}s ago`;
    if (secs < 120) return '1 min ago';
    return `${Math.floor(secs / 60)}m ago`;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    card: {
        backgroundColor: AppColors.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: AppColors.border,
    },
    header: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 14,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    watchIcon: {
        width: 44, height: 44, borderRadius: 22,
        borderWidth: 2, borderColor: `${AppColors.primary}30`,
        backgroundColor: `${AppColors.primary}0d`,
        justifyContent: 'center', alignItems: 'center',
    },
    title:    { fontSize: 15, fontWeight: '600', color: AppColors.textPrimary, marginBottom: 1 },
    subtitle: { fontSize: 12, color: AppColors.textSecondary },
    badge: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: 20, gap: 6,
    },
    badgeText: { fontSize: 11, fontWeight: '700' },
    pulseWrapper: { width: 12, height: 12, justifyContent: 'center', alignItems: 'center' },
    pulseRing: {
        position: 'absolute', width: 12, height: 12, borderRadius: 6,
        backgroundColor: AppColors.success,
    },
    pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: AppColors.success },
    waitDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: AppColors.warning },
    // live vitals
    statsRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
        backgroundColor: AppColors.background, borderRadius: 12,
        paddingVertical: 12, paddingHorizontal: 8, marginBottom: 10,
    },
    miniStat:  { alignItems: 'center', gap: 2, flex: 1 },
    miniVal:   { fontSize: 18, fontWeight: '700' },
    miniUnit:  { fontSize: 10, color: AppColors.textSecondary, fontWeight: '500' },
    divider:   { width: 1, height: 32, backgroundColor: AppColors.border },
    extraRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
    extraItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    extraText: { fontSize: 12, color: AppColors.textSecondary, fontWeight: '500' },
    syncLabel: { fontSize: 10, color: AppColors.disconnected, flex: 1 },
    changeBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 3,
        marginLeft: 'auto' as any,
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 8, backgroundColor: AppColors.background,
    },
    changeBtnLabel: { fontSize: 10, color: AppColors.textSecondary, fontWeight: '600' },
    // waiting / not-connected state
    waitBody:  { alignItems: 'center', gap: 8, paddingVertical: 8 },
    watchVisual: {
        width: 64, height: 64, borderRadius: 16,
        borderWidth: 2, borderColor: AppColors.border,
        justifyContent: 'center', alignItems: 'center', marginBottom: 4,
    },
    waitTitle: { fontSize: 14, fontWeight: '600', color: AppColors.warning },
    waitSub:   { fontSize: 12, color: AppColors.textSecondary, textAlign: 'center', lineHeight: 18 },
    waitActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
    reconnectBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: 14, backgroundColor: `${AppColors.primary}15`,
    },
    reconnectBtnLabel: { fontSize: 13, fontWeight: '700', color: AppColors.primary },
    scanBtnSmall: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: 14, backgroundColor: AppColors.background,
        borderWidth: 1, borderColor: AppColors.border,
    },
    scanBtnSmallLabel: { fontSize: 13, color: AppColors.textSecondary, fontWeight: '600' },
    errorText: { fontSize: 11, color: AppColors.critical, textAlign: 'center', marginTop: 4 },
    // unpaired / bt-off state
    offlineBody: { alignItems: 'center', gap: 8, paddingVertical: 8 },
    offlineHint: { fontSize: 14, fontWeight: '600', color: AppColors.textSecondary },
    offlineSub: {
        fontSize: 12, color: AppColors.disconnected,
        textAlign: 'center', paddingHorizontal: 8, lineHeight: 18,
    },
    scanBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        marginTop: 10, paddingHorizontal: 18, paddingVertical: 9,
        borderRadius: 16, backgroundColor: `${AppColors.primary}15`,
    },
    scanBtnLabel: { fontSize: 13, fontWeight: '700', color: AppColors.primary },
});
