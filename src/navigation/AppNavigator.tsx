/**
 * Main Navigation Configuration
 * 
 * Bottom tab navigation with 3 tabs:
 * - AI Assistant (left)
 * - Workout (center, primary - raised icon)
 * - Profile/Stats (right)
 * 
 * Following the Thumb Zone rule: navigation at bottom 30% of screen
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

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

const TAB_ICONS: Record<string, string> = {
    Assistant: '🤖',
    Workout: '💪',
    Profile: '👤',
};

/**
 * Custom Tab Bar with raised center icon and purple gradient separator
 */
function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();
    const bottomPadding = Math.max(insets.bottom, 8);

    return (
        <View style={styles.tabBarContainer}>
            {/* Purple gradient separator line */}
            <LinearGradient
                colors={['#a855f7', '#4c1d95', '#a855f7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientSeparator}
            />

            <View style={[styles.tabBar, { paddingBottom: bottomPadding }]}>
                {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key];
                    const label = options.tabBarLabel !== undefined
                        ? options.tabBarLabel
                        : options.title !== undefined
                            ? options.title
                            : route.name;

                    const isFocused = state.index === index;
                    const isWorkout = route.name === 'Workout';

                    const onPress = () => {
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        });

                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(route.name);
                        }
                    };

                    if (isWorkout) {
                        // Raised center button - grey when not focused, purple when focused
                        return (
                            <TouchableOpacity
                                key={route.key}
                                onPress={onPress}
                                style={styles.centerTabButton}
                                activeOpacity={0.9}
                            >
                                <View style={[
                                    styles.raisedIconContainer,
                                    !isFocused && styles.raisedIconContainerInactive
                                ]}>
                                    <Text style={styles.raisedIcon}>{TAB_ICONS[route.name]}</Text>
                                </View>
                                <Text style={[
                                    styles.tabLabel,
                                    {
                                        color: isFocused ? colors.accent.primary : colors.text.secondary,
                                        fontWeight: isFocused ? '700' : '500'
                                    }
                                ]}>
                                    {typeof label === 'string' ? label : route.name}
                                </Text>
                            </TouchableOpacity>
                        );
                    }

                    // Regular tab buttons
                    return (
                        <TouchableOpacity
                            key={route.key}
                            onPress={onPress}
                            style={styles.tabButton}
                            activeOpacity={0.7}
                        >
                            <Text style={[
                                styles.tabIcon,
                                { opacity: isFocused ? 1 : 0.5 }
                            ]}>
                                {TAB_ICONS[route.name]}
                            </Text>
                            <Text style={[
                                styles.tabLabel,
                                { color: isFocused ? colors.accent.primary : colors.text.secondary }
                            ]}>
                                {typeof label === 'string' ? label : route.name}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
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
                tabBar={(props) => <CustomTabBar {...props} />}
                screenOptions={{
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
                    }}
                />

                {/* Center tab: Workout (primary) */}
                <Tab.Screen
                    name="Workout"
                    component={WorkoutScreen}
                    options={{
                        title: 'Workout',
                        headerShown: false,
                    }}
                />

                {/* Right tab: Profile/Stats */}
                <Tab.Screen
                    name="Profile"
                    component={ProfileScreen}
                    options={{
                        title: 'Profile',
                    }}
                />
            </Tab.Navigator>
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    tabBarContainer: {
        backgroundColor: colors.background.primary,
    },
    gradientSeparator: {
        height: 2,
        width: '100%',
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: colors.background.primary,
        paddingTop: spacing.sm,
        justifyContent: 'space-around',
        alignItems: 'flex-end',
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: spacing.xs,
        gap: 4,
    },
    centerTabButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: spacing.xs,
        gap: 4,
    },
    raisedIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.accent.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -28,
        borderWidth: 4,
        borderColor: colors.background.primary,
        shadowColor: colors.accent.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    raisedIconContainerInactive: {
        backgroundColor: '#404040', // Grey when not focused
        shadowOpacity: 0,
        elevation: 0,
    },
    raisedIcon: {
        fontSize: 24,
    },
    tabIcon: {
        fontSize: 24,
    },
    tabLabel: {
        fontSize: 10,
        fontWeight: '500',
    },
});
