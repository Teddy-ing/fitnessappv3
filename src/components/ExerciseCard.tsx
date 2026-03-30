/**
 * ExerciseCard Component
 * 
 * A card displaying an exercise with all its sets in a tight table layout.
 * Phase 3: Auto-collapsing cards, LayoutAnimation transitions.
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    LayoutAnimation,
    Platform,
    UIManager,
} from 'react-native';
import { WorkoutExercise, WorkoutSet } from '../models/workout';
import { PreviousSetData } from '../services/workoutService';
import { colors, spacing, borderRadius, typography } from '../theme';
import { useRestTimerStore } from '../stores/restTimerStore';
import SetRow from './SetRow';
import ActiveRestLine from './ActiveRestLine';
import ExerciseMenu from './ExerciseMenu';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Focus state type for keyboard coordination
export interface FocusState {
    exerciseId: string;
    setId: string;
    field: 'weight' | 'reps' | 'duration';
}

interface ExerciseCardProps {
    workoutExercise: WorkoutExercise;
    exerciseId: string;
    focusState?: FocusState | null;
    previousSets?: PreviousSetData[];
    isInSuperset?: boolean;
    isFirstInSuperset?: boolean;
    isLastInSuperset?: boolean;
    canSuperset?: boolean;
    isCollapsed?: boolean;
    showSwipeHint?: boolean;
    showPrevious?: boolean;
    showRpe?: boolean;
    showRir?: boolean;
    onUpdateSet: (exerciseId: string, setId: string, updates: Partial<WorkoutSet>) => void;
    onCompleteSet: (exerciseId: string, setId: string) => void;
    onAddSet: (exerciseId: string) => void;
    onRemoveSet: (exerciseId: string, setId: string) => void;
    onRemoveExercise: (exerciseId: string) => void;
    onToggleSuperset?: (exerciseId: string) => void;
    onFocusField?: (exerciseId: string, setId: string, field: 'weight' | 'reps' | 'duration') => void;
    onUpdateNote?: (exerciseId: string, note: string | null) => void;
    onAddWarmupSets?: (exerciseId: string) => void;
    onReplaceExercise?: (exerciseId: string) => void;
    onToggleCollapse?: (exerciseId: string) => void;
}

function ExerciseCardInner({
    workoutExercise,
    exerciseId,
    focusState,
    previousSets,
    isInSuperset = false,
    isFirstInSuperset = true,
    isLastInSuperset = false,
    canSuperset = false,
    isCollapsed = false,
    showSwipeHint = false,
    showPrevious = true,
    showRpe = false,
    showRir = false,
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
}: ExerciseCardProps) {
    const { exercise, sets } = workoutExercise;

    // Local UI state
    const [menuVisible, setMenuVisible] = useState(false);
    const [isEditingNote, setIsEditingNote] = useState(false);
    const [noteInput, setNoteInput] = useState(workoutExercise.note ?? '');

    // Get primary muscle group for display
    const primaryMuscle = exercise.muscleGroups.find(mg => mg.isPrimary)?.muscle ?? 'unknown';
    const formattedMuscle = primaryMuscle.replace('_', ' ');

    // Count working sets (non-warmup)
    const workingSetNumber = (setIndex: number): number => {
        let count = 0;
        for (let i = 0; i <= setIndex; i++) {
            if (sets[i].type !== 'warmup') {
                count++;
            }
        }
        return count;
    };

    // Compute active set index: first uncompleted set
    const activeSetIndex = sets.findIndex(s => s.status !== 'completed');

    // Check if a specific field is focused
    const isFieldFocused = (setId: string, field: 'weight' | 'reps' | 'duration') => {
        return focusState?.exerciseId === workoutExercise.id &&
            focusState?.setId === setId &&
            focusState?.field === field;
    };

    // Rest timer selectors
    const restTimerActive = useRestTimerStore(s => s.restTimerActive);
    const restTimerRemaining = useRestTimerStore(s => s.restTimerRemaining);
    const restTimerDuration = useRestTimerStore(s => s.restTimerDuration);
    const activeRestTimerExerciseId = useRestTimerStore(s => s.activeRestTimerExerciseId);
    const activeRestTimerSetId = useRestTimerStore(s => s.activeRestTimerSetId);
    const adjustRestTimer = useRestTimerStore(s => s.adjustRestTimer);
    const stopRestTimer = useRestTimerStore(s => s.stopRestTimer);

    const isSetTimerActive = (setId: string) => {
        return restTimerActive &&
            activeRestTimerExerciseId === workoutExercise.id &&
            activeRestTimerSetId === setId;
    };

    // Note handlers
    const handleAddNote = () => {
        setNoteInput(workoutExercise.note ?? '');
        setIsEditingNote(true);
    };

    const handleSaveNote = () => {
        const trimmed = noteInput.trim();
        onUpdateNote?.(exerciseId, trimmed || null);
        setIsEditingNote(false);
    };

    const handleCancelNote = () => {
        setNoteInput(workoutExercise.note ?? '');
        setIsEditingNote(false);
    };

    // Collapse/expand with LayoutAnimation
    const handleToggleCollapse = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        onToggleCollapse?.(exerciseId);
    };

    // Stats for collapsed view
    const completedSets = sets.filter(s => s.status === 'completed').length;

    // ========================
    // COLLAPSED VIEW
    // ========================
    if (isCollapsed) {
        return (
            <TouchableOpacity
                style={[styles.card, styles.collapsedCard]}
                onPress={handleToggleCollapse}
                activeOpacity={0.7}
            >
                <View style={styles.collapsedRow}>
                    <View style={styles.collapsedCheckmark}>
                        <Text style={styles.collapsedCheckmarkText}>✓</Text>
                    </View>
                    <Text style={styles.collapsedName} numberOfLines={1}>
                        {exercise.name}
                    </Text>
                    <Text style={styles.collapsedSets}>
                        {completedSets} {completedSets === 1 ? 'Set' : 'Sets'}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    }

    // ========================
    // EXPANDED VIEW (default)
    // ========================

    const noteText = workoutExercise.note;

    return (
        <View style={[
            styles.card,
            isInSuperset && !isLastInSuperset && styles.cardInSuperset,
            isInSuperset && !isFirstInSuperset && styles.cardSubsequentInSuperset
        ]}>
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
                <TouchableOpacity
                    style={styles.menuButton}
                    onPress={() => setMenuVisible(true)}
                >
                    <Text style={styles.menuIcon}>⋯</Text>
                </TouchableOpacity>
            </View>

            {/* Exercise-level note — display mode */}
            {noteText && !isEditingNote ? (
                <TouchableOpacity onPress={handleAddNote}>
                    <Text style={styles.exerciseNote}>{noteText}</Text>
                </TouchableOpacity>
            ) : null}

            {/* Exercise-level note — edit mode */}
            {isEditingNote && (
                <View style={styles.noteInputContainer}>
                    <TextInput
                        style={styles.noteInput}
                        value={noteInput}
                        onChangeText={setNoteInput}
                        placeholder="Add a note..."
                        placeholderTextColor={colors.text.disabled}
                        multiline
                        autoFocus
                        maxLength={200}
                    />
                    <View style={styles.noteActions}>
                        <TouchableOpacity onPress={handleCancelNote} style={styles.noteActionButton}>
                            <Text style={styles.noteActionCancel}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleSaveNote} style={styles.noteActionButton}>
                            <Text style={styles.noteActionSave}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Sets header row */}
            <View style={styles.setsHeader}>
                <Text style={[styles.columnHeader, styles.setColumn]}>SET</Text>
                {showPrevious && <Text style={[styles.columnHeader, styles.prevColumn]}>PREVIOUS</Text>}
                {exercise.trackWeight && (
                    <Text style={[styles.columnHeader, styles.weightColumn]}>WEIGHT</Text>
                )}
                {exercise.trackReps && (
                    <Text style={[styles.columnHeader, styles.repsColumn]}>REPS</Text>
                )}
                {exercise.trackTime && !exercise.trackReps && (
                    <Text style={[styles.columnHeader, styles.repsColumn]}>TIME</Text>
                )}
                {showRpe && (
                    <Text style={[styles.columnHeader, styles.rpeColumn]}>RPE</Text>
                )}
                {showRir && (
                    <Text style={[styles.columnHeader, styles.rpeColumn]}>RIR</Text>
                )}
                <Text style={[styles.columnHeader, styles.checkColumn]}>✓</Text>
            </View>

            {/* Sets list */}
            <View style={styles.setsList}>
                {sets.map((set, index) => (
                    <React.Fragment key={set.id}>
                        <SetRow
                            set={set}
                            exerciseId={exerciseId}
                            setId={set.id}
                            setNumber={set.type === 'warmup' ? 0 : workingSetNumber(index)}
                            trackWeight={exercise.trackWeight}
                            trackReps={exercise.trackReps}
                            trackTime={exercise.trackTime}
                            previousData={previousSets?.[index] ?? null}
                            isActiveSet={index === activeSetIndex}
                            showSwipeHint={showSwipeHint && index === 0}
                            isWeightFocused={isFieldFocused(set.id, 'weight')}
                            isRepsFocused={isFieldFocused(set.id, 'reps')}
                            isDurationFocused={isFieldFocused(set.id, 'duration')}
                            showPrevious={showPrevious}
                            showRpe={showRpe}
                            showRir={showRir}
                            onUpdateSet={onUpdateSet}
                            onCompleteSet={onCompleteSet}
                            onRemoveSet={onRemoveSet}
                            onFocusField={onFocusField}
                        />
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

            {/* Add set button */}
            <TouchableOpacity style={styles.addSetButton} onPress={() => onAddSet(exerciseId)}>
                <Text style={styles.addSetText}>+ Add Set</Text>
            </TouchableOpacity>

            {/* Exercise action menu */}
            <ExerciseMenu
                visible={menuVisible}
                exerciseName={exercise.name}
                isInSuperset={isInSuperset}
                canSuperset={canSuperset}
                onClose={() => setMenuVisible(false)}
                onAddNote={handleAddNote}
                onAddWarmupSets={() => onAddWarmupSets?.(exerciseId)}
                onReplaceExercise={() => onReplaceExercise?.(exerciseId)}
                onToggleSuperset={() => onToggleSuperset?.(exerciseId)}
                onRemoveExercise={() => onRemoveExercise(exerciseId)}
            />
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
    cardSubsequentInSuperset: {
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
    },

    // Collapsed card
    collapsedCard: {
        // Same card base, no extra padding needed
    },
    collapsedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
    },
    collapsedCheckmark: {
        width: 28,
        height: 28,
        borderRadius: borderRadius.full,
        backgroundColor: colors.accent.success,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    collapsedCheckmarkText: {
        color: colors.text.primary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.bold,
    },
    collapsedName: {
        flex: 1,
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
    },
    collapsedSets: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        marginLeft: spacing.sm,
    },

    // Superset badge
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
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: borderRadius.full,
    },
    menuIcon: {
        color: colors.text.secondary,
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        letterSpacing: 2,
    },

    // Exercise-level note
    exerciseNote: {
        color: colors.text.secondary,
        fontSize: typography.size.xs,
        fontStyle: 'italic',
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.sm,
    },

    // Note editing
    noteInputContainer: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.sm,
    },
    noteInput: {
        color: colors.text.primary,
        fontSize: typography.size.sm,
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        minHeight: 36,
        maxHeight: 80,
        borderWidth: 1,
        borderColor: colors.accent.primary,
    },
    noteActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: spacing.xs,
        gap: spacing.md,
    },
    noteActionButton: {
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
    },
    noteActionCancel: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
    },
    noteActionSave: {
        color: colors.accent.primary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
    },

    // Sets header
    setsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: colors.separator,
    },
    columnHeader: {
        color: colors.text.secondary,
        fontSize: typography.size.xs,
        fontWeight: typography.weight.medium,
        textAlign: 'center',
    },
    setColumn: {
        width: 40,
    },
    prevColumn: {
        width: 72,
    },
    weightColumn: {
        flex: 1,
        textAlign: 'center',
    },
    repsColumn: {
        flex: 1,
        textAlign: 'center',
    },
    rpeColumn: {
        width: 44,
        textAlign: 'center',
    },
    checkColumn: {
        width: 44,
        textAlign: 'center',
    },

    // Sets list
    setsList: {
        paddingHorizontal: spacing.sm,
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
});
