import { useAuth } from '@/context/AuthContext';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
    const { user, isLoading, needsOnboarding } = useAuth();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#FFC300" />
            </View>
        );
    }

    if (!user) return <Redirect href="/signin" />;
    if (needsOnboarding) return <Redirect href="/onboarding" />;
    return <Redirect href="/(tabs)/dashboard" />;
}
