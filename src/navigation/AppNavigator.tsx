/**
 * Main Navigation Configuration
 * 
 * Bottom tab navigation with 3 tabs:
 * - AI Assistant (left)
 * - Workout (center, primary)
 * - Profile/Stats (right)
 * 
 * Following the Thumb Zone rule: navigation at bottom 30% of screen
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';

import { colors, spacing } from '../theme';

// Placeholder screens - will be replaced with actual implementations
import WorkoutScreen from '../screens/WorkoutScreen';
import AssistantScreen from '../screens/AssistantScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Tab navigator type definitions
export type RootTabParamList = {
    Assistant: undefined;
    Workout: undefined;
    Profile: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

/**
 * Simple icon component - will be replaced with proper icons later
 */
function TabIcon({ name, focused }: { name: string; focused: boolean }) {
    const icons: Record<string, string> = {
        Assistant: '🤖',
        Workout: '💪',
        Profile: '👤',
    };

    return (
        <Text style={[styles.icon, focused && styles.iconFocused]}>
            {icons[name] || '•'}
        </Text>
    );
}

/**
 * Main App Navigator
 */
export default function AppNavigator() {
    return (
        <NavigationContainer>
            <Tab.Navigator
                initialRouteName="Workout"
                screenOptions={{
                    // Tab bar styling (dark theme)
                    tabBarStyle: {
                        backgroundColor: colors.background.secondary,
                        borderTopColor: colors.border,
                        borderTopWidth: 1,
                        height: 80,
                        paddingBottom: spacing.md,
                        paddingTop: spacing.sm,
                    },
                    tabBarActiveTintColor: colors.accent.primary,
                    tabBarInactiveTintColor: colors.text.secondary,
                    tabBarLabelStyle: {
                        fontSize: 12,
                        fontWeight: '500',
                    },
                    // Header styling
                    headerStyle: {
                        backgroundColor: colors.background.primary,
                        borderBottomColor: colors.border,
                        borderBottomWidth: 1,
                    },
                    headerTintColor: colors.text.primary,
                    headerTitleStyle: {
                        fontWeight: '600',
                    },
                }}
            >
                {/* Left tab: AI Assistant */}
                <Tab.Screen
                    name="Assistant"
                    component={AssistantScreen}
                    options={{
                        title: 'Assistant',
                        tabBarIcon: ({ focused }) => (
                            <TabIcon name="Assistant" focused={focused} />
                        ),
                    }}
                />

                {/* Center tab: Workout (primary) */}
                <Tab.Screen
                    name="Workout"
                    component={WorkoutScreen}
                    options={{
                        title: 'Workout',
                        tabBarIcon: ({ focused }) => (
                            <TabIcon name="Workout" focused={focused} />
                        ),
                    }}
                />

                {/* Right tab: Profile/Stats */}
                <Tab.Screen
                    name="Profile"
                    component={ProfileScreen}
                    options={{
                        title: 'Profile',
                        tabBarIcon: ({ focused }) => (
                            <TabIcon name="Profile" focused={focused} />
                        ),
                    }}
                />
            </Tab.Navigator>
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    icon: {
        fontSize: 24,
    },
    iconFocused: {
        transform: [{ scale: 1.1 }],
    },
});
