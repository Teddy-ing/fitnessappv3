/**
 * Root Navigation Ref
 *
 * Provides programmatic cross-tab navigation from anywhere in the app.
 * Used by the DailyWorkoutModal to switch to the Workout tab when
 * editing a historical workout.
 */

import { createNavigationContainerRef } from '@react-navigation/native';
import type { ExerciseDetailsParams, RootTabParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootTabParamList>();

/**
 * Navigate to a specific tab in the bottom tab navigator.
 * Safe-to-call even before the NavigationContainer is mounted.
 */
export function navigateToTab(tabName: keyof RootTabParamList) {
    if (navigationRef.isReady()) {
        navigationRef.navigate(tabName);
    }
}

/** Entry points that start or edit a workout must reveal the existing home screen. */
export function navigateToWorkoutHome() {
    if (navigationRef.isReady()) {
        navigationRef.navigate('Workout', { screen: 'WorkoutHome', initial: false, pop: true });
    }
}

/** Keep workout information in the Workout stack so Back pops to the same session. */
export function openWorkoutExerciseDetails(params: ExerciseDetailsParams) {
    if (navigationRef.isReady()) {
        navigationRef.navigate('Workout', {
            screen: 'ExerciseDetails',
            params,
            initial: false,
        });
    }
}
