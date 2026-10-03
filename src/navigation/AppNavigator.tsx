/**
 * Main Navigation Configuration
 * 
 * Bottom tab navigation with 2 tabs:
 * - Workout (primary) — workout and its exercise information
 * - Profile/Stats (right) — profile and its sub-screens
 * 
 * Following the Thumb Zone rule: navigation at bottom 30% of screen
 */

import React, { useMemo } from 'react';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

import { spacing, createThemedStyles, useThemeColors, type ThemeColors } from '../theme';
import { useWorkoutStore } from '../stores';
import { ErrorBoundary } from '../components';
import { navigationRef, navigateToTab } from './navigationRef';
import { shouldHideTabBar } from './tabBarVisibility';
import SwipeableTabScreen from '../components/SwipeableTabScreen';
import { useStartup } from '../components/startup/StartupContext';

// Screen imports
import WorkoutScreen from '../screens/WorkoutScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import ExerciseDetailsScreen from '../screens/ExerciseDetailsScreen';
import CalendarScreen from '../screens/CalendarScreen';
import MeasurementsScreen from '../screens/MeasurementsScreen';
import GoalsScreen from '../screens/GoalsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ExerciseMappingScreen from '../screens/ExerciseMappingScreen';
import type { ProfileStackParamList, RootTabParamList, WorkoutStackParamList } from './types';
export type { ProfileStackParamList, RootTabParamList, WorkoutStackParamList, SharedStackParamList } from './types';

// Wrap each screen in its own error boundary + swipe navigation
// Tab order: Workout → Profile
const WorkoutScreenWithBoundary = () => {
    const { onInitializationComplete } = useStartup();
    // Disable swipe navigation during an active workout
    const hasActiveWorkout = useWorkoutStore(s => !!s.activeWorkout);
    return (
        <SwipeableTabScreen
            onSwipeLeft={hasActiveWorkout ? undefined : () => navigateToTab('Profile')}
        >
            <ErrorBoundary fallback="screen" label="WorkoutScreen" onError={onInitializationComplete}>
                <WorkoutScreen />
            </ErrorBoundary>
        </SwipeableTabScreen>
    );
};

// Profile uses a stack navigator — only enable swipe on the home screen
// Sub-screens (Analytics, Calendar, etc.) should not swipe to change tabs
const ProfileSwipeWrapper = ({ children }: { children: React.ReactNode }) => (
    <SwipeableTabScreen
        onSwipeRight={() => navigateToTab('Workout')}
    >
        {children}
    </SwipeableTabScreen>
);

// ============================================================
// Profile Stack Navigator
// ============================================================

const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const WorkoutStack = createNativeStackNavigator<WorkoutStackParamList>();

const getStackScreenOptions = (colors: ThemeColors) => ({
    headerStyle: { backgroundColor: colors.background.primary },
    headerTintColor: colors.text.primary,
    headerTitleStyle: { fontWeight: '600' as const },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: colors.background.primary },
});

// Wrap analytics screens in their own error boundaries so a chart library
// crash shows a screen-level fallback instead of taking down the profile stack
const AnalyticsScreenWithBoundary = () => (
    <ErrorBoundary fallback="screen" label="AnalyticsScreen">
        <AnalyticsScreen />
    </ErrorBoundary>
);
const ExerciseDetailsScreenWithBoundary = (props: React.ComponentProps<typeof ExerciseDetailsScreen>) => (
    <ErrorBoundary fallback="screen" label="ExerciseDetailsScreen">
        <ExerciseDetailsScreen {...props} />
    </ErrorBoundary>
);
const CalendarScreenWithBoundary = () => (
    <ErrorBoundary fallback="screen" label="CalendarScreen">
        <CalendarScreen />
    </ErrorBoundary>
);
const MeasurementsScreenWithBoundary = () => (
    <ErrorBoundary fallback="screen" label="MeasurementsScreen">
        <MeasurementsScreen />
    </ErrorBoundary>
);
const GoalsScreenWithBoundary = () => (
    <ErrorBoundary fallback="screen" label="GoalsScreen">
        <GoalsScreen />
    </ErrorBoundary>
);
const SettingsScreenWithBoundary = () => (
    <ErrorBoundary fallback="screen" label="SettingsScreen">
        <SettingsScreen />
    </ErrorBoundary>
);

const ProfileHomeWithSwipe = ({ navigation }: { navigation: any }) => (
    <ProfileSwipeWrapper>
        <ProfileScreen navigation={navigation} />
    </ProfileSwipeWrapper>
);

function ProfileStackNavigator() {
    const colors = useThemeColors();
    return (
        <ErrorBoundary fallback="screen" label="ProfileStack">
            <ProfileStack.Navigator
                initialRouteName="ProfileHome"
                screenOptions={getStackScreenOptions(colors)}
            >
                <ProfileStack.Screen
                    name="ProfileHome"
                    component={ProfileHomeWithSwipe}
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
                    name="ExerciseDetails"
                    component={ExerciseDetailsScreenWithBoundary}
                    options={({ route }) => ({
                        title: route.params.exerciseName,
                    })}
                />
                <ProfileStack.Screen
                    name="Calendar"
                    component={CalendarScreenWithBoundary}
                    options={{
                        title: 'Calendar',
                    }}
                />
                <ProfileStack.Screen
                    name="Measurements"
                    component={MeasurementsScreenWithBoundary}
                    options={{
                        title: 'Measurements',
                    }}
                />
                <ProfileStack.Screen
                    name="Goals"
                    component={GoalsScreenWithBoundary}
                    options={{
                        title: 'Goals',
                    }}
                />
                <ProfileStack.Screen
                    name="Settings"
                    component={SettingsScreenWithBoundary}
                    options={{
                        title: 'Settings',
                    }}
                />
                <ProfileStack.Screen
                    name="ExerciseMapping"
                    component={ExerciseMappingScreen}
                    options={{
                        title: 'Import',
                        presentation: 'fullScreenModal',
                        headerShown: false,
                    }}
                />
            </ProfileStack.Navigator>
        </ErrorBoundary>
    );
}

function WorkoutStackNavigator() {
    const colors = useThemeColors();
    const { onInitializationComplete } = useStartup();
    return (
        <ErrorBoundary fallback="screen" label="WorkoutStack" onError={onInitializationComplete}>
            <WorkoutStack.Navigator initialRouteName="WorkoutHome" screenOptions={getStackScreenOptions(colors)}>
                <WorkoutStack.Screen
                    name="WorkoutHome"
                    component={WorkoutScreenWithBoundary}
                    options={{ headerShown: false }}
                />
                <WorkoutStack.Screen
                    name="ExerciseDetails"
                    component={ExerciseDetailsScreenWithBoundary}
                    options={({ route }) => ({ title: route.params.exerciseName })}
                />
                <WorkoutStack.Screen
                    name="Settings"
                    component={SettingsScreenWithBoundary}
                    options={{ title: 'Settings' }}
                />
                <WorkoutStack.Screen
                    name="ExerciseMapping"
                    component={ExerciseMappingScreen}
                    options={{ title: 'Import', presentation: 'fullScreenModal', headerShown: false }}
                />
            </WorkoutStack.Navigator>
        </ErrorBoundary>
    );
}

// ============================================================
// Bottom Tab Navigator
// ============================================================

const Tab = createBottomTabNavigator<RootTabParamList>();

const TAB_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
    Workout: 'fitness-center',
    Profile: 'person',
};

/**
 * Matching tab icons with the selected theme's gradient separator
 */
function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const colors = useThemeColors();
    const styles = useStyles();
    const insets = useSafeAreaInsets();
    const bottomPadding = Math.max(insets.bottom, 8);

    // Hide tab bar during active workout
    const activeWorkout = useWorkoutStore(s => s.activeWorkout);
    // Retained routes in another tab must not hide the selected tab's navigation.
    if (shouldHideTabBar(state, !!activeWorkout)) return null;

    return (
        <View style={styles.tabBarContainer}>
            {/* Theme gradient separator line */}
            <LinearGradient
                colors={colors.gradient.tabBar}
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

                    // Regular tab buttons
                    return (
                        <TouchableOpacity
                            key={route.key}
                            accessibilityRole="button"
                            accessibilityLabel={typeof label === 'string' ? label : route.name}
                            accessibilityState={{ selected: isFocused }}
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
    const colors = useThemeColors();
    const navigationTheme = useMemo(() => ({
        ...DarkTheme,
        colors: {
            ...DarkTheme.colors,
            primary: colors.accent.primary,
            background: colors.background.primary,
            card: colors.background.secondary,
            text: colors.text.primary,
            border: colors.border,
            notification: colors.accent.primary,
        },
    }), [colors]);
    return (
        <NavigationContainer ref={navigationRef} theme={navigationTheme}>
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
                {/* Workout (primary) */}
                <Tab.Screen
                    name="Workout"
                    component={WorkoutStackNavigator}
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

const useStyles = createThemedStyles(colors => ({
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
    tabLabel: {
        fontSize: 10,
        fontWeight: '500',
    },
}));
