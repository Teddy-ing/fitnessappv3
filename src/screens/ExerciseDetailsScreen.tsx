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

import React from 'react';
import type { RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../theme';
import type { ExerciseDetailsParams } from '../navigation/types';
import ExerciseDetailsContent from '../components/exerciseDetails/ExerciseDetailsContent';
export type { ExerciseDetailsTab } from '../components/exerciseDetails/ExerciseDetailsContent';

type Props = { route: RouteProp<{ ExerciseDetails: ExerciseDetailsParams }, 'ExerciseDetails'> };

// ============================================================
// Main Screen
// ============================================================

export default function ExerciseDetailsScreen({ route }: Props) {
    const { exerciseId, initialTab } = route.params;

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
