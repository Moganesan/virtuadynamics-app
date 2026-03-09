import { useAuth } from '@/context/AuthContext';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#FFC300" />
            </View>
        );
    }

    // Immediately redirect — no flash, no flicker
    return <Redirect href={user ? '/(tabs)/dashboard' : '/signin'} />;
}
