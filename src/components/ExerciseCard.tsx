/**
 * ExerciseCard Component
 * 
 * A card displaying an exercise with all its sets.
 * Design inspired by Hevy's card-based layout.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { WorkoutExercise, WorkoutSet } from '../models/workout';
import { colors, spacing, borderRadius, typography } from '../theme';
import SetRow from './SetRow';

// Focus state type for keyboard coordination
export interface FocusState {
    exerciseId: string;
    setId: string;
    field: 'weight' | 'reps';
}

interface ExerciseCardProps {
    workoutExercise: WorkoutExercise;
    focusState?: FocusState | null;
    onUpdateSet: (setId: string, updates: Partial<WorkoutSet>) => void;
    onCompleteSet: (setId: string) => void;
    onAddSet: () => void;
    onRemoveSet: (setId: string) => void;
    onRemoveExercise: () => void;
    onFocusField?: (exerciseId: string, setId: string, field: 'weight' | 'reps') => void;
}

export default function ExerciseCard({
    workoutExercise,
    focusState,
    onUpdateSet,
    onCompleteSet,
    onAddSet,
    onRemoveSet,
    onRemoveExercise,
    onFocusField,
}: ExerciseCardProps) {
    const { exercise, sets } = workoutExercise;

    // Get completed sets count
    const completedSets = sets.filter(s => s.status === 'completed').length;
    const totalSets = sets.length;

    // Get primary muscle group for display
    const primaryMuscle = exercise.muscleGroups.find(mg => mg.isPrimary)?.muscle ?? 'unknown';
    const formattedMuscle = primaryMuscle.replace('_', ' ');

    // Count working sets (non-warmup, non-completed)
    const workingSetNumber = (setIndex: number): number => {
        let count = 0;
        for (let i = 0; i <= setIndex; i++) {
            if (sets[i].type !== 'warmup') {
                count++;
            }
        }
        return count;
    };

    // Check if a specific field is focused
    const isFieldFocused = (setId: string, field: 'weight' | 'reps') => {
        return focusState?.exerciseId === workoutExercise.id &&
            focusState?.setId === setId &&
            focusState?.field === field;
    };

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <Text style={styles.muscleTag}>{formattedMuscle}</Text>
                </View>
                <TouchableOpacity style={styles.menuButton} onPress={onRemoveExercise}>
                    <Text style={styles.menuIcon}>×</Text>
                </TouchableOpacity>
            </View>

            {/* Sets header row */}
            <View style={styles.setsHeader}>
                <Text style={[styles.columnHeader, styles.setColumn]}>SET</Text>
                {exercise.trackWeight && (
                    <Text style={[styles.columnHeader, styles.weightColumn]}>WEIGHT</Text>
                )}
                {exercise.trackReps && (
                    <Text style={[styles.columnHeader, styles.repsColumn]}>REPS</Text>
                )}
                {exercise.trackTime && !exercise.trackReps && (
                    <Text style={[styles.columnHeader, styles.repsColumn]}>TIME</Text>
                )}
                <Text style={[styles.columnHeader, styles.checkColumn]}>✓</Text>
            </View>

            {/* Sets list */}
            <View style={styles.setsList}>
                {sets.map((set, index) => (
                    <SetRow
                        key={set.id}
                        set={set}
                        setNumber={set.type === 'warmup' ? 0 : workingSetNumber(index)}
                        trackWeight={exercise.trackWeight}
                        trackReps={exercise.trackReps}
                        trackTime={exercise.trackTime}
                        isWeightFocused={isFieldFocused(set.id, 'weight')}
                        isRepsFocused={isFieldFocused(set.id, 'reps')}
                        onUpdate={(updates) => onUpdateSet(set.id, updates)}
                        onComplete={() => onCompleteSet(set.id)}
                        onRemove={() => onRemoveSet(set.id)}
                        onFocusWeight={() => onFocusField?.(workoutExercise.id, set.id, 'weight')}
                        onFocusReps={() => onFocusField?.(workoutExercise.id, set.id, 'reps')}
                    />
                ))}
            </View>

            {/* Add set button */}
            <TouchableOpacity style={styles.addSetButton} onPress={onAddSet}>
                <Text style={styles.addSetText}>+ Add Set</Text>
            </TouchableOpacity>

            {/* Progress indicator */}
            {totalSets > 0 && (
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <View
                            style={[
                                styles.progressFill,
                                { width: `${(completedSets / totalSets) * 100}%` }
                            ]}
                        />
                    </View>
                    <Text style={styles.progressText}>
                        {completedSets}/{totalSets} sets
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.md,
        overflow: 'hidden',
    },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: spacing.md,
        paddingBottom: spacing.sm,
    },
    headerLeft: {
        flex: 1,
    },
    exerciseName: {
        color: colors.text.primary,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        marginBottom: spacing.xs,
    },
    muscleTag: {
        color: colors.accent.primary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
    },
    menuButton: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuIcon: {
        color: colors.text.secondary,
        fontSize: typography.size.xxl,
        lineHeight: typography.size.xxl,
    },

    // Sets header
    setsHeader: {
        flexDirection: 'row',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: colors.separator,
    },
    columnHeader: {
        color: colors.text.secondary,
        fontSize: typography.size.xs,
        fontWeight: typography.weight.medium,
    },
    setColumn: {
        width: 40,
    },
    weightColumn: {
        flex: 1,
        textAlign: 'center',
    },
    repsColumn: {
        flex: 1,
        textAlign: 'center',
    },
    checkColumn: {
        width: 50,
        textAlign: 'center',
    },

    // Sets list
    setsList: {
        padding: spacing.sm,
    },

    // Add set button
    addSetButton: {
        paddingVertical: spacing.md,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: colors.separator,
    },
    addSetText: {
        color: colors.accent.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
    },

    // Progress
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.md,
    },
    progressBar: {
        flex: 1,
        height: 4,
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.full,
        overflow: 'hidden',
        marginRight: spacing.sm,
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.accent.success,
        borderRadius: borderRadius.full,
    },
    progressText: {
        color: colors.text.secondary,
        fontSize: typography.size.xs,
    },
});
