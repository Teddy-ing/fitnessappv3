/**
 * Root Navigation Ref
 *
 * Provides programmatic cross-tab navigation from anywhere in the app.
 * Used by the DailyWorkoutModal to switch to the Workout tab when
 * editing a historical workout.
 */

import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<any>();

/**
 * Navigate to a specific tab in the bottom tab navigator.
 * Safe-to-call even before the NavigationContainer is mounted.
 */
export function navigateToTab(tabName: string) {
    if (navigationRef.isReady()) {
        navigationRef.navigate(tabName as never);
    }
}
