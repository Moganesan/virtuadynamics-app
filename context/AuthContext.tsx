import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '@/services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
    email: string;
    token?: string;
    [key: string]: any;
}

interface AuthContextType {
    user: AuthUser | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<{ error?: boolean; message?: string }>;
    logout: () => Promise<void>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AUTH_STORAGE_KEY = 'vd_auth_session';

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Restore session from storage on app startup
    useEffect(() => {
        AsyncStorage.getItem(AUTH_STORAGE_KEY)
            .then((stored) => {
                if (stored) {
                    setUser(JSON.parse(stored));
                }
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

            // Store full response (includes token, user info, etc.)
            const session: AuthUser = { email, ...response };
            await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
            setUser(session);
            return {};
        } catch (err: any) {
            return { error: true, message: err.message || 'Failed to sign in.' };
        }
    };

    const logout = async () => {
        try {
            // Attempt backend logout if endpoint exists (fire-and-forget)
            await authService.logout().catch(() => {});
        } finally {
            await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout }}>
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
