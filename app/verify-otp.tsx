import { AppColors } from '@/constants/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { authService } from '../services/api';

export default function VerifyOtp() {
    const router = useRouter();
    const { email } = useLocalSearchParams<{ email: string }>();

    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [timer, setTimer] = useState(60);

    useEffect(() => {
        // Initial OTP Request when user enters screen
        const sendInitialOtp = async () => {
            if (email) {
                try {
                    await authService.requestOtp(email);
                } catch (err) {
                    console.error("Failed to send initial OTP", err);
                }
            }
        };
        sendInitialOtp();
    }, [email]);

    useEffect(() => {
        if (timer > 0) {
            const interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [timer]);

    const handleVerify = async () => {
        setError('');

        if (!otp) {
            setError('Please enter the OTP.');
            return;
        }

        try {
            setLoading(true);
            const response = await authService.verifyOtp({
                email: email || '',
                auth_otp: otp,
            });

            if (response.error) {
                setError(response.message || 'Verification failed.');
                return;
            }

            console.log('OTP Verification Successful', response);
            Alert.alert("Success", "Account activated successfully!", [
                { text: "OK", onPress: () => router.replace('/signin') }
            ]);
        } catch (err: any) {
            setError(err.message || 'Failed to verify OTP.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (timer > 0) return;

        setTimer(60);
        try {
            await authService.requestOtp(email || '');
            Alert.alert("Sent", "A new OTP has been sent to your email.", [
                { text: "OK" }
            ]);
        } catch (err: any) {
            setError(err.message || 'Failed to resend OTP.');
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.formContainer}>
                        <Text style={styles.title}>Verify Email</Text>
                        <Text style={styles.subtitle}>
                            We sent an OTP to {email}. Please enter it below.
                        </Text>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>OTP Code</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter verification code"
                                placeholderTextColor={AppColors.placeholder}
                                value={otp}
                                onChangeText={setOtp}
                                keyboardType="number-pad"
                                maxLength={6}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>

                        {error ? <Text style={styles.errorText}>{error}</Text> : null}

                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={handleVerify}
                            disabled={loading}
                        >
                            <Text style={styles.buttonText}>{loading ? 'Verifying...' : 'Verify OTP'}</Text>
                        </TouchableOpacity>

                        <View style={styles.footerContainer}>
                            <Text style={styles.footerText}>Didn't receive the code? </Text>
                            <TouchableOpacity onPress={handleResend} disabled={timer > 0}>
                                <Text style={[styles.footerLink, timer > 0 && styles.footerLinkDisabled]}>
                                    {timer > 0 ? `Resend in ${timer}s` : 'Resend OTP'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: AppColors.background,
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    formContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 32,
    },
    backButton: {
        margin: 20,
        marginBottom: 0,
        alignSelf: 'flex-start',
    },
    backButtonText: {
        fontSize: 16,
        color: AppColors.primary,
        fontWeight: '600',
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: AppColors.textPrimary,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: AppColors.textSecondary,
        marginBottom: 24,
    },
    errorText: {
        color: '#ef4444',
        fontSize: 12,
        marginBottom: 16,
        textAlign: 'center',
        fontWeight: '500',
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: AppColors.textLabel,
        marginBottom: 8,
    },
    input: {
        backgroundColor: AppColors.surface,
        borderWidth: 1,
        borderColor: AppColors.border,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: AppColors.textPrimary,
    },
    button: {
        backgroundColor: AppColors.primary,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 12,
        shadowColor: AppColors.primary,
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonDisabled: {
        backgroundColor: '#cbd5e1',
        shadowOpacity: 0,
        elevation: 0,
    },
    buttonText: {
        color: AppColors.textPrimary,
        fontSize: 16,
        fontWeight: '700',
    },
    footerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 32,
    },
    footerText: {
        fontSize: 14,
        color: AppColors.textSecondary,
    },
    footerLink: {
        fontSize: 14,
        fontWeight: '600',
        color: AppColors.primary,
    },
    footerLinkDisabled: {
        color: AppColors.placeholder,
    }
});
