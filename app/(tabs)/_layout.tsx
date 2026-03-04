import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
    const colorScheme = useColorScheme();

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: AppColors.primary,
                headerShown: true,
                tabBarButton: HapticTab,
                tabBarStyle: {
                    backgroundColor: AppColors.surface,
                    borderTopColor: AppColors.border,
                },
            }}>
            <Tabs.Screen
                name="dashboard"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
                }}
            />
            <Tabs.Screen
                name="monitoring"
                options={{
                    title: 'History',
                    tabBarIcon: ({ color }) => <IconSymbol size={28} name="clock.rotate.left" color={color} />,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ color }) => <IconSymbol size={28} name="settings.fill" color={color} />,
                }}
            />
        </Tabs>
    );
}
