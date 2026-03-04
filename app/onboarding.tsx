import { Button } from '@/components/ui/Button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppColors } from '@/constants/theme';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, SafeAreaView, StyleSheet, Text, View } from 'react-native';

const { width } = Dimensions.get('window');

const ONBOARDING_STEPS = [
    {
        title: 'Welcome to VirtuaDynamics',
        subtitle: 'Connecting your health with advanced drone assistance.',
        icon: 'heart.text.square.fill',
        content: 'Start by wearing your health monitoring device. It will constantly check your vital signs like Heart Rate and SpO₂ to ensure your safety.',
    },
    {
        title: 'Drone Companion',
        subtitle: 'Your personal automated responder.',
        icon: 'airplane.circle.fill',
        content: 'In case of any anomalies detected in your vital signs or a fall, our drone will automatically dispatch to your location for visual and vocal assistance.',
    },
    {
        title: 'Safety First',
        subtitle: 'Acknowledge safety guidelines.',
        icon: 'shield.fill',
        content: 'VirtuaDynamics provides monitoring and rapid response but is not a replacement for professional emergency medical services. Always contact emergency services for severe medical issues.',
    },
];

export default function OnboardingScreen() {
    const [currentStep, setCurrentStep] = useState(0);

    const handleNext = () => {
        if (currentStep < ONBOARDING_STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            // Navigate to main app
            router.replace('/(tabs)/dashboard');
        }
    };

    const step = ONBOARDING_STEPS[currentStep];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <IconSymbol name={step.icon as any} size={80} color={AppColors.primary} />
                </View>

                <View style={styles.textContainer}>
                    <Text style={styles.title}>{step.title}</Text>
                    <Text style={styles.subtitle}>{step.subtitle}</Text>
                    <Text style={styles.description}>{step.content}</Text>
                </View>

                <View style={styles.pagination}>
                    {ONBOARDING_STEPS.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.dot,
                                currentStep === index && styles.activeDot,
                            ]}
                        />
                    ))}
                </View>
            </View>

            <View style={styles.footer}>
                <Button
                    title={currentStep === ONBOARDING_STEPS.length - 1 ? "Continue to Dashboard" : "Next"}
                    onPress={handleNext}
                    style={styles.button}
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: AppColors.background,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    iconContainer: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: `${AppColors.primary}15`,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
    },
    textContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: AppColors.textPrimary,
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 18,
        fontWeight: '600',
        color: AppColors.textSecondary,
        marginBottom: 16,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        color: AppColors.textLabel,
        textAlign: 'center',
        lineHeight: 24,
    },
    pagination: {
        flexDirection: 'row',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: AppColors.border,
    },
    activeDot: {
        width: 24,
        backgroundColor: AppColors.primary,
    },
    footer: {
        padding: 24,
        paddingBottom: 40,
    },
    button: {
        width: '100%',
    },
});
