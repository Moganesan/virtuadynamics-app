import { AppColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
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

export default function Login() {
    const router = useRouter();
    const { login } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
        setError('');

        if (!email || !password) {
            setError('Please fill in all fields.');
            return;
        }

        try {
            setLoading(true);
            console.debug(`[DEBUG][SignIn] Attempting login for email=${email}`);
            const result = await login(email, password);
            console.debug('[DEBUG][SignIn] Login result:', JSON.stringify(result));

            if (result.error) {
                if (result.message && result.message.includes('not activated')) {
                    router.replace({
                        pathname: '/verify-otp',
                        params: { email }
                    });
                    return;
                }
                setError(result.message || 'Login failed.');
                return;
            }

            // AuthGate in _layout.tsx will automatically redirect to /(tabs)/dashboard
        } catch (err: any) {
            console.error('[DEBUG][SignIn] Login error:', err);
            setError(err.message || 'Failed to sign in.');
        } finally {
            setLoading(false);
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
                        <Text style={styles.title}>Welcome Back</Text>
                        <Text style={styles.subtitle}>Sign in to your account</Text>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Email Address</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your email"
                                placeholderTextColor={AppColors.placeholder}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Password</Text>
                            <View style={styles.passwordContainer}>
                                <TextInput
                                    style={styles.passwordInput}
                                    placeholder="Enter your password"
                                    placeholderTextColor={AppColors.placeholder}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity
                                    style={styles.eyeIcon}
                                    onPress={() => setShowPassword(!showPassword)}
                                >
                                    <Ionicons
                                        name={showPassword ? "eye-off" : "eye"}
                                        size={20}
                                        color={AppColors.placeholder}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>
                        {error ? <Text style={styles.errorText}>{error}</Text> : null}
                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
                        </TouchableOpacity>
                        <View style={styles.footerContainer}>
                            <Text style={styles.footerText}>Don't have an account? </Text>
                            <TouchableOpacity onPress={() => router.push('/signup')}>
                                <Text style={styles.footerLink}>Sign up</Text>
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
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: AppColors.surface,
        borderWidth: 1,
        borderColor: AppColors.border,
        borderRadius: 12,
        paddingHorizontal: 16,
    },
    passwordInput: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 16,
        color: AppColors.textPrimary,
    },
    eyeIcon: {
        padding: 4,
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
});
