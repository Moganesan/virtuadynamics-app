import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

function AuthGate() {
    const { user, isLoading, needsOnboarding } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;
        // Wait until expo-router has settled on a real segment
        if (!segments[0]) return;

        const currentSegment = segments[0] as string;
        const inProtectedRoute = currentSegment === '(tabs)';
        const inAuthScreen = ['signin', 'signup', 'index'].includes(currentSegment);
        const inOnboarding = currentSegment === 'onboarding';

        if (!user && inProtectedRoute) {
            // Unauthenticated user hit a protected tab → send to signin
            router.replace('/signin');
        } else if (user && needsOnboarding && !inOnboarding) {
            // Logged in but profile not created → send to onboarding
            router.replace('/onboarding');
        } else if (user && !needsOnboarding && (inAuthScreen || inOnboarding)) {
            // Fully onboarded user on auth/onboarding screen → send to dashboard
            router.replace('/(tabs)/dashboard');
        }
        // All other routes (verify-otp, etc.) are left alone
    }, [user, segments, isLoading, needsOnboarding]);

    return (
        <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="signup" options={{ headerShown: false }} />
            <Stack.Screen name="signin" options={{ headerShown: false }} />
            <Stack.Screen name="verify-otp" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="devices" options={{ title: 'Linked Devices' }} />
            <Stack.Screen name="device-detail" options={{ title: 'Device Details' }} />
            <Stack.Screen name="incident-history" options={{ title: 'Incident History' }} />
            <Stack.Screen name="incident-detail" options={{ title: 'Incident Details' }} />
        </Stack>
    );
}

export default function RootLayout() {
    const colorScheme = useColorScheme();

    return (
        <AuthProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                <StatusBar style="auto" />
                <AuthGate />
            </ThemeProvider>
        </AuthProvider>
    );
}
