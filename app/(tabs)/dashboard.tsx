import { WearOSCard } from '@/components/ui/WearOSCard';
import { useWearOS } from '@/services/wearOS';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { VitalCard } from '@/components/ui/VitalCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { dronesService } from '@/services/api';
import { getSocket } from '@/services/socket';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

interface Drone {
    id: string;
    name: string;
    status: DroneStatus;
    location: string;
    battery: number;
    speed: number;
    apiUrl?: string;
}

type DroneStatus = 'standby' | 'active' | 'charging' | 'offline';

const STATUS_CONFIG: Record<DroneStatus, { label: string; color: string; bg: string }> = {
    active: { label: 'Active', color: AppColors.success, bg: `${AppColors.success}15` },
    standby: { label: 'Standby', color: AppColors.primary, bg: `${AppColors.primary}15` },
    charging: { label: 'Charging', color: AppColors.warning, bg: `${AppColors.warning}15` },
    offline: { label: 'Offline', color: AppColors.disconnected, bg: `${AppColors.disconnected}20` },
};

export default function DashboardScreen() {
    const { user, localToken } = useAuth();
    const router = useRouter();
    const [droneModalVisible, setDroneModalVisible] = useState(false);
    const [drones, setDrones] = useState<Drone[]>([]);
    const [loading, setLoading] = useState(true);

    // All vitals come exclusively from the Wear OS watch in real-time
    const { vitals: wearVitals } = useWearOS();

    const primaryProfile = user?.user_profiles?.[0];
    const firstName = primaryProfile?.first_name || user?.first_name || '';
    const displayName = firstName
        ? `${firstName}${(primaryProfile?.last_name || user?.last_name) ? ' ' + (primaryProfile?.last_name || user?.last_name) : ''}`
        : (user?.username || 'User');

    const fetchData = useCallback(async () => {
        if (!localToken) {
            setLoading(false);
            return;
        }
        console.debug('[DEBUG][Dashboard] Fetching drones and vitals...');
        try {
            const dronesRes = await dronesService.getAll(localToken);
            console.debug('[DEBUG][Dashboard] Drones response:', JSON.stringify(dronesRes));
            if (dronesRes.success && dronesRes.data) {
                setDrones(dronesRes.data);
            }
        } catch (err) {
            console.error('[DEBUG][Dashboard] Fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [localToken]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Real-time socket listeners
    useEffect(() => {
        const socket = getSocket();

        const handleDroneUpdate = (drone: Drone) => {
            console.debug('[DEBUG][Dashboard] Socket drone update:', JSON.stringify(drone));
            setDrones((prev) => prev.map((d) => (d.id === drone.id ? drone : d)));
        };

        const handleDroneNew = (drone: Drone) => {
            console.debug('[DEBUG][Dashboard] Socket new drone:', JSON.stringify(drone));
            setDrones((prev) => [...prev, drone]);
        };

        const handleDroneDeleted = ({ id }: { id: string }) => {
            console.debug('[DEBUG][Dashboard] Socket drone deleted:', id);
            setDrones((prev) => prev.filter((d) => d.id !== id));
        };

        socket.on('drones:updated', handleDroneUpdate);
        socket.on('drones:statusChanged', handleDroneUpdate);
        socket.on('drones:new', handleDroneNew);
        socket.on('drones:deleted', handleDroneDeleted);

        return () => {
            socket.off('drones:updated', handleDroneUpdate);
            socket.off('drones:statusChanged', handleDroneUpdate);
            socket.off('drones:new', handleDroneNew);
            socket.off('drones:deleted', handleDroneDeleted);
        };
    }, []);

    // Determine the primary (first active or first) drone for the card
    const primaryDrone = drones.find((d) => d.status === 'active') || drones[0];

    const getVitalStatus = (type: string, value: number): 'normal' | 'warning' | 'critical' => {
        if (type === 'heartRate') return value > 100 || value < 50 ? 'warning' : 'normal';
        if (type === 'bloodOxygen') return value < 92 ? 'critical' : value < 95 ? 'warning' : 'normal';
        if (type === 'temperature') return value > 38 || value < 35.5 ? 'warning' : 'normal';
        return 'normal';
    };

    const getBpStatus = (bp: string): 'normal' | 'warning' | 'critical' => {
        const parts = bp.split('/');
        if (parts.length !== 2) return 'normal';
        const systolic = parseInt(parts[0], 10);
        if (systolic > 140 || systolic < 90) return 'warning';
        return 'normal';
    };

    return (
        <View style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                {/* Header Section */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>Good Morning,</Text>
                        <Text style={styles.patientName}>{displayName}</Text>
                    </View>
                    <StatusBadge status="stable" />
                </View>

                {/* Vital Grid (2x2) */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Live Vitals</Text>
                    {loading ? (
                        <ActivityIndicator size="small" color={AppColors.primary} />
                    ) : (
                        <View style={styles.grid}>
                            <View style={styles.gridRow}>
                                <VitalCard
                                    title="Heart Rate"
                                    value={wearVitals?.heartRate ?? '--'}
                                    unit="BPM"
                                    status={wearVitals?.heartRate && wearVitals.heartRate !== '--'
                                        ? getVitalStatus('heartRate', Number(wearVitals.heartRate))
                                        : 'normal'}
                                    trend="flat"
                                    iconName="heart.fill"
                                />
                                <VitalCard
                                    title="Blood Oxygen"
                                    value={wearVitals?.spo2 ?? '--'}
                                    unit="%"
                                    status={wearVitals?.spo2 && wearVitals.spo2 !== '--'
                                        ? getVitalStatus('bloodOxygen', Number(wearVitals.spo2))
                                        : 'normal'}
                                    trend="flat"
                                    iconName="lungs.fill"
                                />
                            </View>
                            <View style={styles.gridRow}>
                                <VitalCard
                                    title="Temperature"
                                    value={wearVitals?.temperature ?? '--'}
                                    unit="°C"
                                    status={wearVitals?.temperature
                                        ? getVitalStatus('temperature', Number(wearVitals.temperature))
                                        : 'normal'}
                                    trend="flat"
                                    iconName="thermometer"
                                />
                                <VitalCard
                                    title="Blood Pressure"
                                    value={wearVitals?.bloodPressure ?? '--'}
                                    unit="mmHg"
                                    status={wearVitals?.bloodPressure
                                        ? getBpStatus(wearVitals.bloodPressure)
                                        : 'normal'}
                                    trend={(wearVitals?.trend as any) ?? 'flat'}
                                    iconName="drop.fill"
                                />
                            </View>
                        </View>
                    )}
                </View>

                {/* Wear OS Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Wear OS Watch</Text>
                    <WearOSCard />
                </View>

                {/* Drone Status Card */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Active Drone</Text>
                    <View style={styles.droneCard}>
                        {primaryDrone ? (
                            <>
                                <View style={styles.droneHeader}>
                                    <View style={styles.droneInfo}>
                                        <View style={styles.droneIconContainer}>
                                            <IconSymbol name="airplane" size={24} color={AppColors.primary} />
                                        </View>
                                        <View>
                                            <Text style={styles.droneName}>{primaryDrone.name}</Text>
                                            <Text style={styles.droneStatusText}>
                                                {STATUS_CONFIG[primaryDrone.status]?.label ?? primaryDrone.status} - {primaryDrone.location}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.droneBattery}>
                                        <IconSymbol name="battery.100" size={16} color={AppColors.success} />
                                        <Text style={styles.batteryText}>{primaryDrone.battery}%</Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    style={styles.manageButton}
                                    onPress={() => setDroneModalVisible(true)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.manageButtonText}>Manage Devices</Text>
                                    <IconSymbol name="chevron.right" size={16} color={AppColors.primary} />
                                </TouchableOpacity>
                            </>
                        ) : (
                            <Text style={styles.droneStatusText}>No drones available</Text>
                        )}
                    </View>
                </View>

                {/* Emergency Buttons */}
                <View style={styles.emergencyContainer}>
                    <TouchableOpacity style={styles.emergencyButton} activeOpacity={0.8}>
                        <IconSymbol name="exclamationmark.triangle.fill" size={24} color={AppColors.white} />
                        <Text style={styles.emergencyButtonText}>Manual SOS</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Drone Manager Modal */}
            <Modal
                visible={droneModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setDroneModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setDroneModalVisible(false)}>
                    <View style={styles.modalOverlay} />
                </TouchableWithoutFeedback>

                <View style={styles.modalSheet}>
                    {/* Handle */}
                    <View style={styles.modalHandle} />

                    {/* Modal Header */}
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitle}>Active Drones</Text>
                            <Text style={styles.modalSubtitle}>{drones.length} devices registered</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.modalCloseBtn}
                            onPress={() => setDroneModalVisible(false)}
                            activeOpacity={0.7}
                        >
                            <IconSymbol name="xmark.circle.fill" size={28} color={AppColors.border} />
                        </TouchableOpacity>
                    </View>

                    {/* Drone List */}
                    <ScrollView showsVerticalScrollIndicator={false} style={styles.droneList}>
                        {drones.map((drone) => {
                            const cfg = STATUS_CONFIG[drone.status] || STATUS_CONFIG.offline;
                            const batteryColor =
                                drone.battery > 50 ? AppColors.success :
                                    drone.battery > 20 ? AppColors.warning :
                                        AppColors.critical;

                            return (
                                <TouchableOpacity
                                    key={drone.id}
                                    style={styles.droneItem}
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        setDroneModalVisible(false);
                                        router.push({
                                            pathname: '/drone-control',
                                            params: {
                                                id: drone.id,
                                                name: drone.name,
                                                battery: String(drone.battery),
                                                status: drone.status,
                                                apiUrl: drone.apiUrl ?? '',
                                            },
                                        });
                                    }}
                                >
                                    {/* Left: icon + info */}
                                    <View style={styles.droneItemLeft}>
                                        <View style={[styles.droneItemIcon, { backgroundColor: cfg.bg }]}>
                                            <IconSymbol name="airplane" size={20} color={cfg.color} />
                                        </View>
                                        <View style={styles.droneItemInfo}>
                                            <Text style={styles.droneItemName}>{drone.name}</Text>
                                            <Text style={styles.droneItemLocation}>{drone.location}</Text>
                                            {drone.status === 'active' && drone.speed > 0 && (
                                                <Text style={styles.droneItemSpeed}>{drone.speed} km/h</Text>
                                            )}
                                        </View>
                                    </View>

                                    {/* Right: status + battery */}
                                    <View style={styles.droneItemRight}>
                                        <View style={[styles.droneBadge, { backgroundColor: cfg.bg }]}>
                                            <View style={[styles.droneDot, { backgroundColor: cfg.color }]} />
                                            <Text style={[styles.droneBadgeText, { color: cfg.color }]}>
                                                {cfg.label}
                                            </Text>
                                        </View>
                                        {drone.battery > 0 && (
                                            <View style={styles.droneItemBattery}>
                                                <View style={styles.batteryTrack}>
                                                    <View style={[
                                                        styles.batteryFill,
                                                        { width: `${drone.battery}%` as any, backgroundColor: batteryColor }
                                                    ]} />
                                                </View>
                                                <Text style={[styles.batteryPct, { color: batteryColor }]}>
                                                    {drone.battery}%
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: AppColors.background,
    },
    container: {
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
    },
    greeting: {
        fontSize: 16,
        color: AppColors.textSecondary,
        marginBottom: 4,
    },
    patientName: {
        fontSize: 28,
        fontWeight: '700',
        color: AppColors.textPrimary,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: AppColors.textPrimary,
        marginBottom: 16,
    },
    grid: {
        gap: 16,
    },
    gridRow: {
        flexDirection: 'row',
        gap: 16,
    },
    droneCard: {
        backgroundColor: AppColors.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: AppColors.border,
    },
    droneHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    droneInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    droneIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: `${AppColors.primary}15`,
        justifyContent: 'center',
        alignItems: 'center',
    },
    droneName: {
        fontSize: 16,
        fontWeight: '600',
        color: AppColors.textPrimary,
    },
    droneStatusText: {
        fontSize: 14,
        color: AppColors.textSecondary,
    },
    droneBattery: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#dcfce7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    batteryText: {
        fontSize: 12,
        fontWeight: '600',
        color: AppColors.success,
    },
    manageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        backgroundColor: `${AppColors.primary}10`,
        borderRadius: 12,
        gap: 8,
    },
    manageButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: AppColors.primary,
    },
    emergencyContainer: {
        marginTop: 10,
    },
    emergencyButton: {
        backgroundColor: AppColors.critical,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        gap: 12,
        shadowColor: AppColors.critical,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    emergencyButtonText: {
        color: AppColors.white,
        fontSize: 18,
        fontWeight: '700',
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    modalSheet: {
        backgroundColor: AppColors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingBottom: 36,
        paddingTop: 12,
        maxHeight: '75%',
    },
    modalHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: AppColors.border,
        alignSelf: 'center',
        marginBottom: 16,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: AppColors.textPrimary,
        marginBottom: 2,
    },
    modalSubtitle: {
        fontSize: 13,
        color: AppColors.textSecondary,
    },
    modalCloseBtn: {
        padding: 2,
    },
    droneList: {
        flexGrow: 0,
    },
    droneItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: AppColors.border,
        gap: 12,
    },
    droneItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    droneItemIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    droneItemInfo: {
        flex: 1,
    },
    droneItemName: {
        fontSize: 15,
        fontWeight: '600',
        color: AppColors.textPrimary,
        marginBottom: 2,
    },
    droneItemLocation: {
        fontSize: 12,
        color: AppColors.textSecondary,
    },
    droneItemSpeed: {
        fontSize: 12,
        color: AppColors.primary,
        fontWeight: '600',
        marginTop: 2,
    },
    droneItemRight: {
        alignItems: 'flex-end',
        gap: 6,
    },
    droneBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 20,
    },
    droneDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    droneBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    droneItemBattery: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    batteryTrack: {
        width: 48,
        height: 5,
        backgroundColor: AppColors.border,
        borderRadius: 3,
        overflow: 'hidden',
    },
    batteryFill: {
        height: '100%',
        borderRadius: 3,
    },
    batteryPct: {
        fontSize: 11,
        fontWeight: '700',
        minWidth: 28,
        textAlign: 'right',
    },
});
