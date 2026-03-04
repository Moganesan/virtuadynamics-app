import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppColors } from '@/constants/theme';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type ConnectionState = 'disconnected' | 'scanning' | 'connected';

interface ScannedDevice {
    id: string;
    name: string;
    rssi: number;
}

const MOCK_DEVICES: ScannedDevice[] = [
    { id: '1', name: 'VD SmartRing Pro', rssi: -42 },
    { id: '2', name: 'VD SmartRing Lite', rssi: -67 },
    { id: '3', name: 'SmartRing S2', rssi: -81 },
];

export const SmartRingCard = () => {
    const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
    const [connectedDevice, setConnectedDevice] = useState<ScannedDevice | null>(null);
    const [scannedDevices, setScannedDevices] = useState<ScannedDevice[]>([]);
    const [battery, setBattery] = useState(78);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (connectionState === 'scanning') {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.15, duration: 700, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
                ])
            ).start();

            // Simulate discovering devices after a delay
            const timer = setTimeout(() => {
                setScannedDevices(MOCK_DEVICES);
            }, 1500);

            return () => {
                clearTimeout(timer);
                pulseAnim.stopAnimation();
                pulseAnim.setValue(1);
            };
        }
    }, [connectionState]);

    const handleScan = () => {
        setScannedDevices([]);
        setConnectionState('scanning');
    };

    const handleConnect = (device: ScannedDevice) => {
        setConnectedDevice(device);
        setConnectionState('connected');
        setScannedDevices([]);
    };

    const handleDisconnect = () => {
        setConnectedDevice(null);
        setConnectionState('disconnected');
    };

    const getBatteryColor = () => {
        if (battery > 50) return AppColors.success;
        if (battery > 20) return AppColors.warning;
        return AppColors.critical;
    };

    const getSignalBars = (rssi: number) => {
        if (rssi >= -50) return 3;
        if (rssi >= -70) return 2;
        return 1;
    };

    return (
        <View style={styles.card}>
            {/* Card Header */}
            <View style={styles.cardHeader}>
                <View style={styles.titleRow}>
                    <View style={styles.ringIconWrapper}>
                        <View style={styles.ringIconOuter}>
                            <View style={styles.ringIconInner}>
                                <IconSymbol
                                    name={connectionState === 'connected' ? 'bluetooth' : 'bluetooth.slash'}
                                    size={16}
                                    color={connectionState === 'connected' ? AppColors.primary : AppColors.disconnected}
                                />
                            </View>
                        </View>
                    </View>
                    <View>
                        <Text style={styles.cardTitle}>Smart Ring</Text>
                        <Text style={styles.cardSubtitle}>
                            {connectionState === 'connected'
                                ? connectedDevice?.name
                                : connectionState === 'scanning'
                                ? 'Scanning...'
                                : 'No device paired'}
                        </Text>
                    </View>
                </View>

                {/* Status Badge */}
                <View style={[
                    styles.statusBadge,
                    connectionState === 'connected' && styles.statusConnected,
                    connectionState === 'scanning' && styles.statusScanning,
                    connectionState === 'disconnected' && styles.statusDisconnected,
                ]}>
                    {connectionState === 'scanning' ? (
                        <ActivityIndicator size={10} color={AppColors.primary} style={{ marginRight: 4 }} />
                    ) : (
                        <View style={[
                            styles.statusDot,
                            { backgroundColor: connectionState === 'connected' ? AppColors.success : AppColors.disconnected }
                        ]} />
                    )}
                    <Text style={[
                        styles.statusText,
                        { color: connectionState === 'connected' ? AppColors.success : connectionState === 'scanning' ? AppColors.primary : AppColors.disconnected }
                    ]}>
                        {connectionState === 'connected' ? 'Connected' : connectionState === 'scanning' ? 'Scanning' : 'Disconnected'}
                    </Text>
                </View>
            </View>

            {/* Connected State — battery + signal */}
            {connectionState === 'connected' && (
                <View style={styles.connectedBody}>
                    {/* Battery bar */}
                    <View style={styles.batteryRow}>
                        <IconSymbol name="battery.100" size={16} color={getBatteryColor()} />
                        <View style={styles.batteryBarTrack}>
                            <View style={[styles.batteryBarFill, { width: `${battery}%` as any, backgroundColor: getBatteryColor() }]} />
                        </View>
                        <Text style={[styles.batteryLabel, { color: getBatteryColor() }]}>{battery}%</Text>
                    </View>

                    <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnect} activeOpacity={0.7}>
                        <IconSymbol name="xmark.circle.fill" size={14} color={AppColors.critical} />
                        <Text style={styles.disconnectText}>Disconnect</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Scanning State — pulse + device list */}
            {connectionState === 'scanning' && (
                <View style={styles.scanningBody}>
                    <View style={styles.pulseContainer}>
                        <Animated.View style={[styles.pulseRing, styles.pulseRing3, { transform: [{ scale: pulseAnim }], opacity: 0.15 }]} />
                        <Animated.View style={[styles.pulseRing, styles.pulseRing2, { transform: [{ scale: pulseAnim }], opacity: 0.25 }]} />
                        <Animated.View style={[styles.pulseRing, styles.pulseRing1, { transform: [{ scale: pulseAnim }], opacity: 0.4 }]} />
                        <View style={styles.pulseCenter}>
                            <IconSymbol name="bluetooth" size={20} color={AppColors.primary} />
                        </View>
                    </View>

                    {scannedDevices.length === 0 ? (
                        <Text style={styles.scanningHint}>Looking for nearby smart rings...</Text>
                    ) : (
                        <View style={styles.deviceList}>
                            <Text style={styles.deviceListTitle}>Devices Found</Text>
                            {scannedDevices.map((device) => (
                                <TouchableOpacity
                                    key={device.id}
                                    style={styles.deviceRow}
                                    onPress={() => handleConnect(device)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.deviceRowLeft}>
                                        <View style={styles.deviceIconSmall}>
                                            <IconSymbol name="bluetooth" size={14} color={AppColors.primary} />
                                        </View>
                                        <Text style={styles.deviceName}>{device.name}</Text>
                                    </View>
                                    <View style={styles.deviceRowRight}>
                                        <SignalBars bars={getSignalBars(device.rssi)} />
                                        <Text style={styles.connectLabel}>Tap to pair</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    <TouchableOpacity style={styles.cancelButton} onPress={handleDisconnect} activeOpacity={0.7}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Disconnected State — search button */}
            {connectionState === 'disconnected' && (
                <View style={styles.disconnectedBody}>
                    <View style={styles.emptyRingVisual}>
                        <View style={styles.emptyRingOuter}>
                            <View style={styles.emptyRingMiddle}>
                                <View style={styles.emptyRingInner} />
                            </View>
                        </View>
                        <Text style={styles.emptyHint}>No smart ring connected</Text>
                        <Text style={styles.emptySubHint}>Pair your device to monitor vitals continuously</Text>
                    </View>

                    <TouchableOpacity style={styles.searchButton} onPress={handleScan} activeOpacity={0.7}>
                        <IconSymbol name="bluetooth" size={18} color={AppColors.white} />
                        <Text style={styles.searchButtonText}>Search Devices</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const SignalBars = ({ bars }: { bars: number }) => (
    <View style={styles.signalBars}>
        {[1, 2, 3].map((b) => (
            <View
                key={b}
                style={[
                    styles.signalBar,
                    { height: b * 4 + 2 },
                    b <= bars ? { backgroundColor: AppColors.success } : { backgroundColor: AppColors.border },
                ]}
            />
        ))}
    </View>
);

const styles = StyleSheet.create({
    card: {
        backgroundColor: AppColors.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: AppColors.border,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    ringIconWrapper: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ringIconOuter: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 3,
        borderColor: `${AppColors.primary}30`,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ringIconInner: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: `${AppColors.primary}60`,
        backgroundColor: `${AppColors.primary}10`,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: AppColors.textPrimary,
        marginBottom: 2,
    },
    cardSubtitle: {
        fontSize: 13,
        color: AppColors.textSecondary,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        gap: 5,
    },
    statusConnected: {
        backgroundColor: `${AppColors.success}15`,
    },
    statusScanning: {
        backgroundColor: `${AppColors.primary}15`,
    },
    statusDisconnected: {
        backgroundColor: `${AppColors.disconnected}20`,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    // Connected body
    connectedBody: {
        gap: 12,
    },
    batteryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    batteryBarTrack: {
        flex: 1,
        height: 6,
        backgroundColor: AppColors.border,
        borderRadius: 3,
        overflow: 'hidden',
    },
    batteryBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    batteryLabel: {
        fontSize: 12,
        fontWeight: '700',
        minWidth: 32,
        textAlign: 'right',
    },
    disconnectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        backgroundColor: `${AppColors.critical}10`,
        borderRadius: 10,
    },
    disconnectText: {
        fontSize: 13,
        fontWeight: '600',
        color: AppColors.critical,
    },
    // Scanning body
    scanningBody: {
        alignItems: 'center',
        gap: 16,
    },
    pulseContainer: {
        width: 80,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 4,
    },
    pulseRing: {
        position: 'absolute',
        borderRadius: 999,
        backgroundColor: AppColors.primary,
    },
    pulseRing1: { width: 56, height: 56 },
    pulseRing2: { width: 68, height: 68 },
    pulseRing3: { width: 80, height: 80 },
    pulseCenter: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: `${AppColors.primary}20`,
        borderWidth: 2,
        borderColor: AppColors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanningHint: {
        fontSize: 13,
        color: AppColors.textSecondary,
        textAlign: 'center',
    },
    deviceList: {
        width: '100%',
        gap: 8,
    },
    deviceListTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: AppColors.textSecondary,
        marginBottom: 4,
    },
    deviceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: AppColors.background,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: AppColors.border,
    },
    deviceRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    deviceIconSmall: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: `${AppColors.primary}15`,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deviceName: {
        fontSize: 14,
        fontWeight: '500',
        color: AppColors.textPrimary,
    },
    deviceRowRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    signalBars: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 2,
        height: 14,
    },
    signalBar: {
        width: 4,
        borderRadius: 1,
    },
    connectLabel: {
        fontSize: 11,
        color: AppColors.primary,
        fontWeight: '600',
    },
    cancelButton: {
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: AppColors.border,
    },
    cancelText: {
        fontSize: 13,
        fontWeight: '600',
        color: AppColors.textSecondary,
    },
    // Disconnected body
    disconnectedBody: {
        alignItems: 'center',
        gap: 16,
    },
    emptyRingVisual: {
        alignItems: 'center',
        gap: 6,
    },
    emptyRingOuter: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 4,
        borderColor: AppColors.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    emptyRingMiddle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 3,
        borderColor: `${AppColors.disconnected}50`,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyRingInner: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: `${AppColors.disconnected}20`,
    },
    emptyHint: {
        fontSize: 14,
        fontWeight: '600',
        color: AppColors.textSecondary,
    },
    emptySubHint: {
        fontSize: 12,
        color: AppColors.disconnected,
        textAlign: 'center',
        paddingHorizontal: 8,
    },
    searchButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: AppColors.primary,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        width: '100%',
    },
    searchButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: AppColors.white,
    },
});
