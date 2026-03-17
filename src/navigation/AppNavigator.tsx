/**
 * Main Navigation Configuration
 * 
 * Bottom tab navigation with 3 tabs:
 * - AI Assistant (left)
 * - Workout (center, primary - raised icon)
 * - Profile/Stats (right) — contains a stack navigator for sub-screens
 * 
 * Following the Thumb Zone rule: navigation at bottom 30% of screen
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, spacing } from '../theme';
import { useWorkoutStore } from '../stores';
import { ErrorBoundary } from '../components';

// Screen imports
import WorkoutScreen from '../screens/WorkoutScreen';
import AssistantScreen from '../screens/AssistantScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import ExerciseAnalyticsScreen from '../screens/ExerciseAnalyticsScreen';
import CalendarScreen from '../screens/CalendarScreen';

// Wrap each screen in its own error boundary so one tab crashing
// doesn't take down the other tabs
const WorkoutScreenWithBoundary = () => (
    <ErrorBoundary fallback="screen" label="WorkoutScreen">
        <WorkoutScreen />
    </ErrorBoundary>
);
const AssistantScreenWithBoundary = () => (
    <ErrorBoundary fallback="screen" label="AssistantScreen">
        <AssistantScreen />
    </ErrorBoundary>
);

// ============================================================
// Profile Stack Navigator
// ============================================================

export type ProfileStackParamList = {
    ProfileHome: undefined;
    Analytics: undefined;
    ExerciseAnalytics: { exerciseId: string; exerciseName: string };
    Calendar: undefined;
};

const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

// On web, jump straight to the exercise analytics screen for chart debugging
const IS_WEB = Platform.OS === 'web';

// Wrap analytics screens in their own error boundaries so a chart library
// crash shows a screen-level fallback instead of taking down the profile stack
const AnalyticsScreenWithBoundary = () => (
    <ErrorBoundary fallback="screen" label="AnalyticsScreen">
        <AnalyticsScreen />
    </ErrorBoundary>
);
const ExerciseAnalyticsScreenWithBoundary = (props: any) => (
    <ErrorBoundary fallback="screen" label="ExerciseAnalyticsScreen">
        <ExerciseAnalyticsScreen {...props} />
    </ErrorBoundary>
);
const CalendarScreenWithBoundary = () => (
    <ErrorBoundary fallback="screen" label="CalendarScreen">
        <CalendarScreen />
    </ErrorBoundary>
);

function ProfileStackNavigator() {
    return (
        <ErrorBoundary fallback="screen" label="ProfileStack">
            <ProfileStack.Navigator
                initialRouteName={IS_WEB ? 'ExerciseAnalytics' : 'ProfileHome'}
                screenOptions={{
                    headerStyle: {
                        backgroundColor: colors.background.primary,
                    },
                    headerTintColor: colors.text.primary,
                    headerTitleStyle: {
                        fontWeight: '600',
                    },
                    headerShadowVisible: false,
                    contentStyle: {
                        backgroundColor: colors.background.primary,
                    },
                }}
            >
                <ProfileStack.Screen
                    name="ProfileHome"
                    component={ProfileScreen}
                    options={{ headerShown: false }}
                />
                <ProfileStack.Screen
                    name="Analytics"
                    component={AnalyticsScreenWithBoundary}
                    options={{
                        title: 'Analytics',
                    }}
                />
                <ProfileStack.Screen
                    name="ExerciseAnalytics"
                    component={ExerciseAnalyticsScreenWithBoundary}
                    options={({ route }) => ({
                        title: route.params.exerciseName,
                    })}
                    initialParams={IS_WEB ? { exerciseId: 'mock', exerciseName: 'Mock Bench Press' } : undefined}
                />
                <ProfileStack.Screen
                    name="Calendar"
                    component={CalendarScreenWithBoundary}
                    options={{
                        title: 'Calendar',
                    }}
                />
            </ProfileStack.Navigator>
        </ErrorBoundary>
    );
}

// ============================================================
// Bottom Tab Navigator
// ============================================================

// Tab navigator type definitions
export type RootTabParamList = {
    Assistant: undefined;
    Workout: undefined;
    Profile: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const TAB_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
    Assistant: 'smart-toy',
    Workout: 'fitness-center',
    Profile: 'person',
};

/**
 * Custom Tab Bar with raised center icon and purple gradient separator
 */
function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();
    const bottomPadding = Math.max(insets.bottom, 8);

    // Hide tab bar during active workout
    const activeWorkout = useWorkoutStore(s => s.activeWorkout);
    if (activeWorkout) return null;

    // Hide tab bar when navigated into profile sub-screens (Analytics, etc.)
    const profileRoute = state.routes.find(r => r.name === 'Profile');
    const profileChild = profileRoute?.state?.routes?.[profileRoute.state.index ?? 0];
    if (profileChild && profileChild.name !== 'ProfileHome') return null;

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
                                    <MaterialIcons
                                        name={TAB_ICONS[route.name]}
                                        size={26}
                                        color="#fff"
                                    />
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
                            <MaterialIcons
                                name={TAB_ICONS[route.name]}
                                size={24}
                                color={isFocused ? colors.accent.primary : colors.text.secondary}
                                style={{ opacity: isFocused ? 1 : 0.5 }}
                            />
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
                    component={AssistantScreenWithBoundary}
                    options={{
                        title: 'Assistant',
                    }}
                />

                {/* Center tab: Workout (primary) */}
                <Tab.Screen
                    name="Workout"
                    component={WorkoutScreenWithBoundary}
                    options={{
                        title: 'Workout',
                        headerShown: false,
                    }}
                />

                {/* Right tab: Profile/Stats — uses stack navigator for sub-screens */}
                <Tab.Screen
                    name="Profile"
                    component={ProfileStackNavigator}
                    options={{
                        title: 'Profile',
                        headerShown: false,
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
        // Kept for potential future use, MaterialIcons handles sizing via props
    },
    tabLabel: {
        fontSize: 10,
        fontWeight: '500',
    },
});
