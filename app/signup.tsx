import { AppColors } from '@/constants/theme';
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
import { authService } from '../services/api';

export default function Login() {
  const router = useRouter()

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    setError('');

    // Basic validation
    if (!username || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      console.debug(`[DEBUG][SignUp] Attempting signup for email=${email}, username=${username}`);
      const response = await authService.signup({
        email,
        password,
        confirm_password: confirmPassword,
        username,
      });
      console.debug('[DEBUG][SignUp] Signup response:', JSON.stringify(response));
      if (response.error) {
        console.debug('[DEBUG][SignUp] Signup failed:', response);
        if (response.message && response.message.includes('not activated')) {
          router.replace({
            pathname: '/verify-otp',
            params: { email }
          });
          return;
        }
        setError(response.message || 'Signup failed.');
        return;
      }
      console.debug('[DEBUG][SignUp] Signup successful:', response);
      // Optional: Redirect locally to login or home
      router.replace({
        pathname: '/verify-otp',
        params: { email }
      });
    } catch (err: any) {
      console.error('[DEBUG][SignUp] Signup error:', err);
      setError(err.message || 'Failed to sign up.');
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

            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Sign up to get started!</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your username"
                placeholderTextColor={AppColors.placeholder}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

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
                  placeholder="Create a password"
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

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Confirm your password"
                  placeholderTextColor={AppColors.placeholder}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye-off" : "eye"}
                    size={20}
                    color={AppColors.placeholder}
                  />
                </TouchableOpacity>
              </View>
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{loading ? 'Signing up...' : 'Sign Up'}</Text>
            </TouchableOpacity>
            <View style={styles.footerContainer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/signin')}>
                <Text style={styles.footerLink}>Sign in</Text>
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
    color: AppColors.textPrimary, // Changed text color to ensure contrast with light yellow
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