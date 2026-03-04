import { AppColors } from '@/constants/theme';
import { ActivityIndicator, StyleSheet, Text, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'disabled';

interface ButtonProps {
    title: string;
    onPress?: () => void;
    variant?: ButtonVariant;
    style?: ViewStyle;
    textStyle?: TextStyle;
    disabled?: boolean;
    loading?: boolean;
    leftIcon?: React.ReactNode;
}

export const Button = ({
    title,
    onPress,
    variant = 'primary',
    style,
    textStyle,
    disabled = false,
    loading = false,
    leftIcon,
}: ButtonProps) => {
    const isPrimary = variant === 'primary';
    const isSecondary = variant === 'secondary';
    const isDanger = variant === 'danger';
    const isDisabledStyle = variant === 'disabled' || disabled;

    const getBackgroundColor = () => {
        if (isDisabledStyle) return AppColors.disabled;
        if (isPrimary) return AppColors.primary;
        if (isSecondary) return 'transparent';
        if (isDanger) return AppColors.critical;
        return AppColors.primary;
    };

    const getTextColor = () => {
        if (isDisabledStyle) return AppColors.textSecondary;
        if (isPrimary) return AppColors.textPrimary; // Dark text on yellow background for better contrast
        if (isSecondary) return AppColors.primary;
        if (isDanger) return AppColors.white;
        return AppColors.textPrimary;
    };

    return (
        <TouchableOpacity
            style={[
                styles.button,
                { backgroundColor: getBackgroundColor() },
                isSecondary && styles.secondaryBorder,
                style,
            ]}
            onPress={onPress}
            disabled={isDisabledStyle || loading}
            activeOpacity={0.8}
        >
            {loading ? (
                <ActivityIndicator color={getTextColor()} />
            ) : (
                <>
                    {leftIcon && leftIcon}
                    <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
                        {title}
                    </Text>
                </>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        height: 48,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        gap: 8,
    },
    secondaryBorder: {
        borderWidth: 1.5,
        borderColor: AppColors.primary,
    },
    text: {
        fontSize: 16,
        fontWeight: '600',
    },
});
