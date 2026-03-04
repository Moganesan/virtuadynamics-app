import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppColors } from '@/constants/theme';
import { StyleSheet, Text, View } from 'react-native';

type VitalStatus = 'normal' | 'warning' | 'critical';

interface VitalCardProps {
    title: string;
    value: string | number;
    unit: string;
    status: VitalStatus;
    trend?: 'up' | 'down' | 'flat';
    iconName: React.ComponentProps<typeof IconSymbol>['name'];
}

export const VitalCard = ({
    title,
    value,
    unit,
    status,
    trend,
    iconName,
}: VitalCardProps) => {
    const getStatusColor = () => {
        switch (status) {
            case 'normal':
                return AppColors.success;
            case 'warning':
                return AppColors.warning;
            case 'critical':
                return AppColors.critical;
            default:
                return AppColors.success;
        }
    };

    const color = getStatusColor();

    return (
        <View style={[styles.card, { borderColor: status === 'critical' ? AppColors.critical : AppColors.border }]}>
            <View style={styles.header}>
                <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
                    <IconSymbol name={iconName} size={20} color={color} />
                </View>
                <Text style={styles.title}>{title}</Text>
            </View>

            <View style={styles.content}>
                <Text style={styles.value}>
                    {value}
                    <Text style={styles.unit}> {unit}</Text>
                </Text>
            </View>

            <View style={styles.footer}>
                <Text style={[styles.statusText, { color }]}>
                    {status === 'normal' ? 'Normal' : status === 'warning' ? 'Warning' : 'Critical'}
                    {trend === 'up' && ' ↑'}
                    {trend === 'down' && ' ↓'}
                    {trend === 'flat' && ' ↔'}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: AppColors.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        shadowColor: AppColors.textPrimary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        flex: 1,
        minWidth: '45%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 14,
        color: AppColors.textSecondary,
        fontWeight: '500',
    },
    content: {
        marginBottom: 8,
    },
    value: {
        fontSize: 28,
        fontWeight: '700',
        color: AppColors.textPrimary,
    },
    unit: {
        fontSize: 14,
        fontWeight: '500',
        color: AppColors.textSecondary,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusText: {
        fontSize: 13,
        fontWeight: '600',
    },
});
