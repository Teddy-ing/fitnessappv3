/**
 * Exercise Details Screen ("Master Guide")
 *
 * Comprehensive per-exercise reference with four tabs:
 * - About:   Form guide, instructions, persistent exercise notes
 * - History: Timeline of every session this exercise appeared in
 * - Charts:  Est. 1RM, Max Weight, Volume line/bar charts
 * - Records: Best weight at each rep count with calculated Est. 1RM
 *
 * Navigation paths:
 * - Path A: Analytics > Exercises tab > tap row (default: About tab)
 * - Path B: Active workout > info icon (default: About tab)
 * - Path C: Pinned Exercise widget deep-link (default: Charts tab)
 */

import React, { useEffect, useCallback } from 'react';
import {
    Text,
    TouchableOpacity,
    BackHandler,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '../theme';
import type { ProfileStackParamList } from '../navigation/AppNavigator';
import { navigateToTab } from '../navigation/navigationRef';
import ExerciseDetailsContent from '../components/exerciseDetails/ExerciseDetailsContent';
export type { ExerciseDetailsTab } from '../components/exerciseDetails/ExerciseDetailsContent';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ExerciseDetails'>;

// ============================================================
// Main Screen
// ============================================================

export default function ExerciseDetailsScreen({ route, navigation }: Props) {
    const { exerciseId, initialTab, source } = route.params;
    const cameFromWorkout = source === 'workout';

    // Navigate back to the Workout tab (for workout-sourced navigation)
    const goBackToWorkout = useCallback(() => {
        navigateToTab('Workout');
    }, []);

    // Override header back button when opened from a workout
    useEffect(() => {
        navigation.setOptions({
            headerLeft: cameFromWorkout ? () => (
                <TouchableOpacity onPress={goBackToWorkout} style={{ paddingRight: spacing.sm }}>
                    <Text style={{ color: colors.text.primary, fontSize: 28 }}>‹</Text>
                </TouchableOpacity>
            ) : undefined,
        });
    }, [cameFromWorkout, navigation, goBackToWorkout]);

    // Android hardware back → return to workout instead of triggering discard dialog
    useFocusEffect(useCallback(() => {
        if (!cameFromWorkout) return;

        const handler = BackHandler.addEventListener('hardwareBackPress', () => {
            goBackToWorkout();
            return true; // Consume the event — don't propagate to WorkoutScreen's handler
        });

        return () => handler.remove();
    }, [cameFromWorkout, goBackToWorkout]));

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }} edges={['bottom']}>
            <ExerciseDetailsContent
                key={exerciseId}
                exerciseId={exerciseId}
                initialTab={initialTab}
            />
        </SafeAreaView>
    );
}
