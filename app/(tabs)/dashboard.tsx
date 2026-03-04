import { SmartRingCard } from '@/components/ui/SmartRingCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { VitalCard } from '@/components/ui/VitalCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppColors } from '@/constants/theme';
import React, { useState } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

const DRONES = [
    {
        id: '1',
        name: 'VD-Responder Alpha',
        status: 'standby' as const,
        location: 'Base Station',
        battery: 100,
        speed: 0,
    },
    {
        id: '2',
        name: 'VD-Responder Beta',
        status: 'active' as const,
        location: 'Sector 4 — En Route',
        battery: 74,
        speed: 68,
    },
    {
        id: '3',
        name: 'VD-Responder Gamma',
        status: 'charging' as const,
        location: 'Charging Bay 2',
        battery: 38,
        speed: 0,
    },
    {
        id: '4',
        name: 'VD-Scout Delta',
        status: 'offline' as const,
        location: 'Maintenance',
        battery: 0,
        speed: 0,
    },
];

type DroneStatus = 'standby' | 'active' | 'charging' | 'offline';

const STATUS_CONFIG: Record<DroneStatus, { label: string; color: string; bg: string }> = {
    active: { label: 'Active', color: AppColors.success, bg: `${AppColors.success}15` },
    standby: { label: 'Standby', color: AppColors.primary, bg: `${AppColors.primary}15` },
    charging: { label: 'Charging', color: AppColors.warning, bg: `${AppColors.warning}15` },
    offline: { label: 'Offline', color: AppColors.disconnected, bg: `${AppColors.disconnected}20` },
};

export default function DashboardScreen() {
    const [droneModalVisible, setDroneModalVisible] = useState(false);

    return (
        <View style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                {/* Header Section */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>Good Morning,</Text>
                        <Text style={styles.patientName}>John Doe</Text>
                    </View>
                    <StatusBadge status="stable" />
                </View>

                {/* Vital Grid (2x2) */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Live Vitals</Text>
                    <View style={styles.grid}>
                        <View style={styles.gridRow}>
                            <VitalCard
                                title="Heart Rate"
                                value={72}
                                unit="BPM"
                                status="normal"
                                trend="flat"
                                iconName="heart.fill"
                            />
                            <VitalCard
                                title="Blood Oxygen"
                                value={98}
                                unit="%"
                                status="normal"
                                trend="up"
                                iconName="lungs.fill"
                            />
                        </View>
                        <View style={styles.gridRow}>
                            <VitalCard
                                title="Temperature"
                                value={36.5}
                                unit="°C"
                                status="normal"
                                trend="flat"
                                iconName="thermometer"
                            />
                            <VitalCard
                                title="Blood Pressure"
                                value="120/80"
                                unit="mmHg"
                                status="warning"
                                trend="up"
                                iconName="drop.fill"
                            />
                        </View>
                    </View>
                </View>

                {/* Smart Ring Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Smart Ring</Text>
                    <SmartRingCard />
                </View>

                {/* Drone Status Card */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Active Drone</Text>
                    <View style={styles.droneCard}>
                        <View style={styles.droneHeader}>
                            <View style={styles.droneInfo}>
                                <View style={styles.droneIconContainer}>
                                    <IconSymbol name="airplane" size={24} color={AppColors.primary} />
                                </View>
                                <View>
                                    <Text style={styles.droneName}>VD-Responder Alpha</Text>
                                    <Text style={styles.droneStatusText}>Standby - Base Station</Text>
                                </View>
                            </View>
                            <View style={styles.droneBattery}>
                                <IconSymbol name="battery.100" size={16} color={AppColors.success} />
                                <Text style={styles.batteryText}>100%</Text>
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
                            <Text style={styles.modalSubtitle}>{DRONES.length} devices registered</Text>
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
                        {DRONES.map((drone) => {
                            const cfg = STATUS_CONFIG[drone.status];
                            const batteryColor =
                                drone.battery > 50 ? AppColors.success :
                                    drone.battery > 20 ? AppColors.warning :
                                        AppColors.critical;

                            return (
                                <View key={drone.id} style={styles.droneItem}>
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
                                </View>
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
