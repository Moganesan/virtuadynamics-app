import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService, settingsService } from '@/services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserProfile {
    profile_id: number;
    link: string;
    profile_link: string;
    first_name: string;
    last_name: string;
    phone: string;
    nickname: string;
    country: string;
    phone_verified: number;
    auth_otp: string;
    profile_picture: string;
    date_of_birth: string;
    home_address: string;
    office_address: string;
    newsletter: string;
    two_factor_auth: string;
    history: string;
    default_profile: string;
    required_crypto_profile: number;
    created_at: string;
}

export interface AuthUser {
    user_id: number;
    account_id: number;
    seed_verifier: string;
    first_name: string;
    last_name: string;
    username: string;
    email: string;
    api_token: string;
    is_email_verified: string;
    is_active: string;
    profile_picture: string;
    country_code: string;
    phone: string;
    date_of_birth: string;
    location: string;
    first_time_login: string;
    last_login: string;
    user_profiles: UserProfile[];
    [key: string]: any;
}

interface AuthContextType {
    user: AuthUser | null;
    localToken: string | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<{ error?: boolean; message?: string }>;
    logout: () => Promise<void>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AUTH_STORAGE_KEY = 'vd_auth_session';
const LOCAL_TOKEN_KEY = 'vd_local_token';

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [localToken, setLocalToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Restore session from storage on app startup
    useEffect(() => {
        Promise.all([
            AsyncStorage.getItem(AUTH_STORAGE_KEY),
            AsyncStorage.getItem(LOCAL_TOKEN_KEY),
        ])
            .then(([stored, storedLocalToken]) => {
                if (stored) setUser(JSON.parse(stored));
                if (storedLocalToken) setLocalToken(storedLocalToken);
            })
            .catch(() => {})
            .finally(() => setIsLoading(false));
    }, []);

    const login = async (email: string, password: string): Promise<{ error?: boolean; message?: string }> => {
        try {
            const response = await authService.signin({ email, password });

            if (response.error) {
                return { error: true, message: response.message || 'Login failed.' };
            }

            // The external API returns: { error, statusCode, message, data: { ...user fields, api_token } }
            // We store data directly so user.api_token, user.username etc. are all top-level
            const session: AuthUser = response.data;
            await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
            setUser(session);

            // Create/retrieve a local session on our own backend for settings/contacts/notifications
            try {
                const localRes = await settingsService.createSession({
                    externalUserId: String(session.user_id),
                    email: session.email,
                    username: session.username,
                });
                if (localRes.token) {
                    await AsyncStorage.setItem(LOCAL_TOKEN_KEY, localRes.token);
                    setLocalToken(localRes.token);
                }
            } catch {
                // Non-fatal: settings will degrade gracefully without a local token
            }

            return {};
        } catch (err: any) {
            return { error: true, message: err.message || 'Failed to sign in.' };
        }
    };

    const logout = async () => {
        try {
            if (user?.api_token) {
                await authService.logout(user.api_token).catch(() => {});
            }
        } finally {
            await AsyncStorage.multiRemove([AUTH_STORAGE_KEY, LOCAL_TOKEN_KEY]);
            setUser(null);
            setLocalToken(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, localToken, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
    return ctx;
}
