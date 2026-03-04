import { AppColors } from '@/constants/theme';
import { StyleSheet, Text, View } from 'react-native';

export type StatusType = 'stable' | 'warning' | 'critical' | 'disconnected';

interface StatusBadgeProps {
    status: StatusType;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
    const getStatusConfig = () => {
        switch (status) {
            case 'stable':
                return { bg: '#dcfce7', text: AppColors.success, label: 'Stable' };
            case 'warning':
                return { bg: '#fef3c7', text: AppColors.warning, label: 'Warning' };
            case 'critical':
                return { bg: '#fee2e2', text: AppColors.critical, label: 'Critical' };
            case 'disconnected':
            default:
                return { bg: '#f1f5f9', text: AppColors.disconnected, label: 'Disconnected' };
        }
    };

    const config = getStatusConfig();

    return (
        <View style={[styles.badge, { backgroundColor: config.bg }]}>
            <View style={[styles.dot, { backgroundColor: config.text }]} />
            <Text style={[styles.label, { color: config.text }]}>{config.label}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 100,
        gap: 6,
        alignSelf: 'flex-start',
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
});
