/**
 * SupersetGroup Component
 *
 * Visual bracketing wrapper for superset exercise groups.
 * Renders a purple vertical line, "SUPERSET" badge, and collects
 * all ExerciseCards in the same superset group.
 *
 * Extracted from WorkoutScreen to reduce component size (TD-030).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { WorkoutExercise } from '../../models/workout';
import { PreviousSetData } from '../../models/workout';
import { FocusState } from '../ExerciseCard';
import ExerciseCard from '../ExerciseCard';
import ErrorBoundary from '../ErrorBoundary';

interface SupersetGroupProps {
    /** All exercises in this superset group, pre-sliced from the full list */
    exercises: WorkoutExercise[];
    /** Total exercises count in the workout (for canSuperset calculation) */
    totalExercises: number;
    /** Starting index of this group within the full exercise list */
    startIndex: number;
    focusState: FocusState | null;
    collapsedExercises: Set<string>;
    showPrevious: boolean;
    showRpe: boolean;
    showRir: boolean;
    previousSets: Map<string, PreviousSetData[]>;
    defaultWarmupSets: number;

    // Callbacks — passed through to ExerciseCard
    onUpdateSet: (...args: any[]) => void;
    onCompleteSet: (...args: any[]) => void;
    onAddSet: (...args: any[]) => void;
    onRemoveSet: (...args: any[]) => void;
    onRemoveExercise: (...args: any[]) => void;
    onToggleSuperset: (...args: any[]) => void;
    onFocusField: (...args: any[]) => void;
    onUpdateNote: (...args: any[]) => void;
    onAddWarmupSets: (exerciseId: string, count: number) => void;
    onReplaceExercise: (exerciseId: string) => void;
    onToggleCollapse: (...args: any[]) => void;
}

export default function SupersetGroup({
    exercises,
    totalExercises,
    startIndex,
    focusState,
    collapsedExercises,
    showPrevious,
    showRpe,
    showRir,
    previousSets,
    defaultWarmupSets,
    onUpdateSet,
    onCompleteSet,
    onAddSet,
    onRemoveSet,
    onRemoveExercise,
    onToggleSuperset,
    onFocusField,
    onUpdateNote,
    onAddWarmupSets,
    onReplaceExercise,
    onToggleCollapse,
}: SupersetGroupProps) {
    return (
        <View style={styles.container}>
            <View style={styles.line} />
            <View style={styles.badge}>
                <Text style={styles.badgeText}>SUPERSET</Text>
            </View>
            <View style={styles.cards}>
                {exercises.map((ex, i) => {
                    const globalIndex = startIndex + i;
                    const isFirst = i === 0;
                    const isLast = i === exercises.length - 1;
                    const canSuperset = globalIndex < totalExercises - 1;

                    return (
                        <ErrorBoundary
                            key={ex.id}
                            fallback="card"
                            label={ex.exercise.name}
                        >
                            <ExerciseCard
                                workoutExercise={ex}
                                focusState={focusState}
                                isInSuperset={true}
                                isFirstInSuperset={isFirst}
                                isLastInSuperset={isLast}
                                canSuperset={canSuperset}
                                exerciseId={ex.id}
                                isCollapsed={collapsedExercises.has(ex.id)}
                                showPrevious={showPrevious}
                                showRpe={showRpe}
                                showRir={showRir}
                                defaultWarmupSets={defaultWarmupSets}
                                previousSets={previousSets.get(ex.exerciseId)}
                                onUpdateSet={onUpdateSet}
                                onCompleteSet={onCompleteSet}
                                onAddSet={onAddSet}
                                onRemoveSet={onRemoveSet}
                                onRemoveExercise={onRemoveExercise}
                                onToggleSuperset={onToggleSuperset}
                                onFocusField={onFocusField}
                                onUpdateNote={onUpdateNote}
                                onAddWarmupSets={onAddWarmupSets}
                                onReplaceExercise={onReplaceExercise}
                                onToggleCollapse={onToggleCollapse}
                            />
                        </ErrorBoundary>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.md,
        position: 'relative',
    },
    line: {
        position: 'absolute',
        left: 0,
        top: 24,
        bottom: spacing.md,
        width: 3,
        backgroundColor: colors.accent.primary,
        borderRadius: 2,
    },
    badge: {
        backgroundColor: colors.accent.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
        alignSelf: 'flex-start',
        marginLeft: spacing.sm,
        marginBottom: spacing.xs,
    },
    badgeText: {
        color: colors.text.primary,
        fontSize: typography.size.xs,
        fontWeight: typography.weight.bold,
        letterSpacing: 1,
    },
    cards: {
        paddingLeft: spacing.sm,
    },
});
