import { StyleSheet, View, Text } from 'react-native';

export default function DeviceDetailScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Device Details</Text>
            <Text style={styles.subtitle}>Coming soon</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a1a',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 8,
    },
    subtitle: {
        color: '#888',
        fontSize: 14,
    },
});
