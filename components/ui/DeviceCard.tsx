import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppColors } from '@/constants/theme';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { StatusBadge, StatusType } from './StatusBadge';

interface DeviceCardProps {
    name: string;
    type: 'wearable' | 'drone';
    status: StatusType;
    battery: number;
    lastSync?: string;
    onAction?: () => void;
    actionTitle?: string;
}

export const DeviceCard = ({
    name,
    type,
    status,
    battery,
    lastSync,
    onAction,
    actionTitle = 'Manage Device',
}: DeviceCardProps) => {
    const getBatteryColor = () => {
        if (battery > 50) return AppColors.success;
        if (battery > 20) return AppColors.warning;
        return AppColors.critical;
    };

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <IconSymbol
                        name={type === 'wearable' ? 'heart.circle.fill' : 'airplane.circle.fill'}
                        size={24}
                        color={AppColors.primary}
                    />
                    <Text style={styles.name}>{name}</Text>
                </View>
                <StatusBadge status={status} />
            </View>

            <View style={styles.detailsContainer}>
                <View style={styles.detailItem}>
                    <IconSymbol name="battery.100" size={16} color={getBatteryColor()} />
                    <Text style={styles.detailText}>{battery}% Battery</Text>
                </View>

                {lastSync && (
                    <View style={styles.detailItem}>
                        <IconSymbol name="clock.fill" size={16} color={AppColors.textSecondary} />
                        <Text style={styles.detailText}>Last sync: {lastSync}</Text>
                    </View>
                )}
            </View>

            <Button
                title={actionTitle}
                variant="secondary"
                onPress={onAction}
                style={styles.actionButton}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: AppColors.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: AppColors.border,
        shadowColor: AppColors.textPrimary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    name: {
        fontSize: 18,
        fontWeight: '600',
        color: AppColors.textPrimary,
    },
    detailsContainer: {
        gap: 12,
        marginBottom: 20,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    detailText: {
        fontSize: 14,
        color: AppColors.textSecondary,
        fontWeight: '500',
    },
    actionButton: {
        width: '100%',
    },
});
