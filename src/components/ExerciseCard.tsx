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
import { useRestTimerStore } from '../stores/restTimerStore';
import SetRow from './SetRow';
import ActiveRestLine from './ActiveRestLine';

// Focus state type for keyboard coordination
export interface FocusState {
    exerciseId: string;
    setId: string;
    field: 'weight' | 'reps';
}

// PP-006 fix: Props now accept store-shaped action signatures + exerciseId.
// This lets the parent pass stable references (e.g. from getState()), avoiding
// inline arrow closures that defeat React.memo.
interface ExerciseCardProps {
    workoutExercise: WorkoutExercise;
    exerciseId: string;
    focusState?: FocusState | null;
    isInSuperset?: boolean;           // Is this exercise part of a superset?
    isLastInSuperset?: boolean;       // Is this the last exercise in its superset group?
    canSuperset?: boolean;            // Can this exercise be linked (not last in list)?
    onUpdateSet: (exerciseId: string, setId: string, updates: Partial<WorkoutSet>) => void;
    onCompleteSet: (exerciseId: string, setId: string) => void;
    onAddSet: (exerciseId: string) => void;
    onRemoveSet: (exerciseId: string, setId: string) => void;
    onRemoveExercise: (exerciseId: string) => void;
    onToggleSuperset?: (exerciseId: string) => void;
    onFocusField?: (exerciseId: string, setId: string, field: 'weight' | 'reps') => void;
}

// PP-005 fix: React.memo prevents re-rendering when parent re-renders but props haven't changed
function ExerciseCardInner({
    workoutExercise,
    exerciseId,
    focusState,
    isInSuperset = false,
    isLastInSuperset = false,
    canSuperset = false,
    onUpdateSet,
    onCompleteSet,
    onAddSet,
    onRemoveSet,
    onRemoveExercise,
    onToggleSuperset,
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

    // PP-003 fix: Fine-grained selectors — only subscribe to fields this card reads.
    // Prevents all ExerciseCards from re-rendering on every timer tick.
    const restTimerActive = useRestTimerStore(s => s.restTimerActive);
    const restTimerRemaining = useRestTimerStore(s => s.restTimerRemaining);
    const restTimerDuration = useRestTimerStore(s => s.restTimerDuration);
    const activeRestTimerExerciseId = useRestTimerStore(s => s.activeRestTimerExerciseId);
    const activeRestTimerSetId = useRestTimerStore(s => s.activeRestTimerSetId);
    const adjustRestTimer = useRestTimerStore(s => s.adjustRestTimer);
    const stopRestTimer = useRestTimerStore(s => s.stopRestTimer);

    // Check if a specific set has the active timer
    const isSetTimerActive = (setId: string) => {
        return restTimerActive &&
            activeRestTimerExerciseId === workoutExercise.id &&
            activeRestTimerSetId === setId;
    };

    return (
        <View style={[styles.card, isInSuperset && !isLastInSuperset && styles.cardInSuperset]}>
            {/* Superset badge */}
            {isInSuperset && (
                <View style={styles.supersetBadge}>
                    <Text style={styles.supersetBadgeText}>SUPERSET</Text>
                </View>
            )}

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <Text style={styles.muscleTag}>{formattedMuscle}</Text>
                </View>
                <TouchableOpacity style={styles.menuButton} onPress={() => onRemoveExercise(exerciseId)}>
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
                    <React.Fragment key={set.id}>
                        <SetRow
                            set={set}
                            setNumber={set.type === 'warmup' ? 0 : workingSetNumber(index)}
                            trackWeight={exercise.trackWeight}
                            trackReps={exercise.trackReps}
                            trackTime={exercise.trackTime}
                            isWeightFocused={isFieldFocused(set.id, 'weight')}
                            isRepsFocused={isFieldFocused(set.id, 'reps')}
                            onUpdate={(updates) => onUpdateSet(exerciseId, set.id, updates)}
                            onComplete={() => onCompleteSet(exerciseId, set.id)}
                            onRemove={() => onRemoveSet(exerciseId, set.id)}
                            onFocusWeight={() => onFocusField?.(exerciseId, set.id, 'weight')}
                            onFocusReps={() => onFocusField?.(exerciseId, set.id, 'reps')}
                            onChangeSetType={(newType) => onUpdateSet(exerciseId, set.id, { type: newType })}
                        />
                        {/* Show rest timer after completed sets */}
                        {isSetTimerActive(set.id) && (
                            <ActiveRestLine
                                duration={restTimerDuration}
                                remaining={restTimerRemaining}
                                isActive={true}
                                onAdjustTime={adjustRestTimer}
                                onSkip={stopRestTimer}
                            />
                        )}
                    </React.Fragment>
                ))}
            </View>

            {/* Add set and superset buttons */}
            <View style={styles.actionRow}>
                <TouchableOpacity style={styles.addSetButton} onPress={() => onAddSet(exerciseId)}>
                    <Text style={styles.addSetText}>+ Add Set</Text>
                </TouchableOpacity>
                {canSuperset && onToggleSuperset && (
                    <TouchableOpacity style={styles.supersetButton} onPress={() => onToggleSuperset?.(exerciseId)}>
                        <Text style={styles.supersetButtonText}>
                            {isInSuperset ? '🔗 Unlink' : '🔗 Link'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

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

export default React.memo(ExerciseCardInner);

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.md,
        overflow: 'hidden',
    },
    cardInSuperset: {
        marginBottom: 0,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        borderBottomWidth: 2,
        borderBottomColor: colors.accent.primary,
    },
    supersetBadge: {
        backgroundColor: colors.accent.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
    },
    supersetBadgeText: {
        color: colors.text.primary,
        fontSize: typography.size.xs,
        fontWeight: typography.weight.semibold,
        textAlign: 'center',
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
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: colors.separator,
    },
    supersetButton: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
    },
    supersetButtonText: {
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
