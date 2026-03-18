import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService, settingsService } from '@/services/api';
import { connectSocket, disconnectSocket } from '@/services/socket';

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
    auth_id?: number;
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
    needsOnboarding: boolean;
    login: (email: string, password: string) => Promise<{ error?: boolean; message?: string }>;
    logout: () => Promise<void>;
    updateUser: (updates: Partial<AuthUser>) => Promise<void>;
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
                if (stored) {
                    const parsed = JSON.parse(stored);
                    setUser(parsed);
                    connectSocket(String(parsed.user_id));
                }
                if (storedLocalToken) setLocalToken(storedLocalToken);
            })
            .catch(() => {})
            .finally(() => setIsLoading(false));
    }, []);

    const login = async (email: string, password: string): Promise<{ error?: boolean; message?: string }> => {
        try {
            console.debug(`[DEBUG][AuthContext] Calling authService.signin for email=${email}`);
            const response = await authService.signin({ email, password });
            console.debug('[DEBUG][AuthContext] Signin response:', JSON.stringify(response));

            if (response.error) {
                return { error: true, message: response.message || 'Login failed.' };
            }

            // The external API returns: { error, statusCode, message, data: { ...user fields, api_token } }
            // We store data directly so user.api_token, user.username etc. are all top-level
            const session: AuthUser = response.data;
            await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
            setUser(session);

            // Connect socket for real-time updates
            console.debug(`[DEBUG][AuthContext] Connecting socket for user_id=${session.user_id}`);
            connectSocket(String(session.user_id));

            // Create/retrieve a local session on our own backend for health data/contacts/notifications
            try {
                console.debug('[DEBUG][AuthContext] Creating local session...');
                const localRes = await settingsService.createSession({
                    externalUserId: String(session.user_id),
                    email: session.email,
                });
                console.debug('[DEBUG][AuthContext] Local session response:', JSON.stringify(localRes));
                if (localRes.token) {
                    await AsyncStorage.setItem(LOCAL_TOKEN_KEY, localRes.token);
                    setLocalToken(localRes.token);
                }
            } catch (localErr) {
                console.error('[DEBUG][AuthContext] Local session creation failed:', localErr);
                // Non-fatal: local features will degrade gracefully without a local token
            }

            return {};
        } catch (err: any) {
            console.error('[DEBUG][AuthContext] Login error:', err);
            return { error: true, message: err.message || 'Failed to sign in.' };
        }
    };

    const logout = async () => {
        console.debug('[DEBUG][AuthContext] Logging out — clearing local state first');
        // Clear local state immediately so the UI redirects to signin right away
        const apiToken = user?.api_token;
        disconnectSocket();
        setUser(null);
        setLocalToken(null);
        await AsyncStorage.multiRemove([AUTH_STORAGE_KEY, LOCAL_TOKEN_KEY]);

        // Fire-and-forget: notify VirtuaLogin (don't block logout on this)
        if (apiToken) {
            authService.logout(apiToken).catch((err) => {
                console.error('[DEBUG][AuthContext] VirtuaLogin logout error (non-blocking):', err);
            });
        }
    };

    /** Update the locally-cached user object (e.g. after an external profile update) */
    const updateUser = async (updates: Partial<AuthUser>) => {
        if (!user) return;
        const updated = { ...user, ...updates };
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
        setUser(updated);
    };

    // TODO: Re-enable profile check after backend testing is complete
    // Check if the user has a profile with at least a first_name filled in.
    // VirtuaLogin may auto-create an empty profile during signup, so we check the actual content.
    // const primaryProfile = user?.user_profiles?.[0];
    // const needsOnboarding = !!user && (!primaryProfile || !primaryProfile.first_name?.trim());
    const needsOnboarding = false;

    return (
        <AuthContext.Provider value={{ user, localToken, isLoading, needsOnboarding, login, logout, updateUser }}>
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
