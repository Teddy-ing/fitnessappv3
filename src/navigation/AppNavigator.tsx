/**
 * Main Navigation Configuration
 * 
 * Bottom tab navigation with 3 tabs:
 * - AI Assistant (left)
 * - Workout (center, primary)
 * - Profile/Stats (right)
 * 
 * Following the Thumb Zone rule: navigation at bottom 30% of screen
 * 
 * TODO: Replace emoji icons with custom icon library (e.g., react-native-vector-icons
 * or custom SVG icons) for a more polished look.
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
 * TODO: Replace with custom icon library
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
    // Get safe area insets to handle different device navigation types:
    // - Gesture navigation (swipe up bar)
    // - 3-button navigation (always visible home, back, recent)
    // - Older devices with physical buttons
    // This ensures the tab bar doesn't overlap with system navigation
    const insets = useSafeAreaInsets();

    // Calculate dynamic tab bar height based on safe area
    // Minimum padding of 8 for devices with no bottom inset
    const bottomInset = Math.max(insets.bottom, 8);
    const tabBarHeight = 56 + bottomInset;

    return (
        <NavigationContainer>
            <Tab.Navigator
                initialRouteName="Workout"
                screenOptions={{
                    // Tab bar styling (dark theme)
                    // Dynamic height to accommodate system navigation
                    tabBarStyle: {
                        backgroundColor: colors.background.secondary,
                        borderTopColor: colors.border,
                        borderTopWidth: 1,
                        height: tabBarHeight,
                        paddingBottom: bottomInset,
                        paddingTop: spacing.xs,
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
                    },
                    headerTintColor: colors.text.primary,
                    headerTitleStyle: {
                        fontWeight: '600',
                    },
                    headerShadowVisible: false,
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
        fontSize: 26,
    },
});
