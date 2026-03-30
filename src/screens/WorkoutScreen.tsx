/**
 * Workout Screen
 *
 * The main/primary screen of the app.
 * This is where users log their workouts.
 *
 * Features:
 * - Start new workout or use template
 * - Add exercises and log sets
 * - Rest timer between sets
 * - Save completed workouts
 * - View workout history
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Alert,
    BackHandler,
    LayoutAnimation,
    Platform,
    UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { File, Paths } from 'expo-file-system';

import { colors, spacing, borderRadius, typography } from '../theme';
import { useWorkoutStore } from '../stores';
import { ExerciseCard, ExercisePicker, RestTimer, WorkoutKeyboard, SaveTemplateModal, ErrorBoundary } from '../components';
import { useElapsedTimer, formatElapsedTime, useWorkoutKeyboard, useHomeScreenData } from '../hooks';
import {
    saveWorkout,
    updateWorkout,
    findMatchingTemplate,
    startWorkoutFromTemplate,
    markWorkoutCompletedToday,
    getPreviousSetsForExercises,
    getSettings,
    Template,
} from '../services';
import { Workout } from '../models/workout';
import { useGoalCelebrationStore } from '../stores/goalCelebrationStore';
import WorkoutHomeView from './WorkoutHomeView';
import { navigateToTab, navigationRef } from '../navigation/navigationRef';

// Swipe hint persistence key
const SWIPE_HINT_FILE = new File(Paths.document, '.swipe_hint_seen');

export default function WorkoutScreen() {
    // PP-001 fix: Fine-grained selector — only re-render when activeWorkout changes.
    // Actions are stable references; access via getState() to avoid subscribing to them.
    const activeWorkout = useWorkoutStore(s => s.activeWorkout);
    const isEditMode = useWorkoutStore(s => s.isEditMode);
    const previousSets = useWorkoutStore(s => s.previousSets);
    const collapsedExercises = useWorkoutStore(s => s.collapsedExercises);
    const originalDuration = useWorkoutStore(s => s.originalDuration);
    const originalCompletedAt = useWorkoutStore(s => s.originalCompletedAt);
    const originalStartedAt = useWorkoutStore(s => s.originalStartedAt);
    const {
        startWorkout,
        finishWorkout,
        discardWorkout,
        addExercise,
        removeExercise,
        addSet,
        removeSet,
        updateSet,
        completeSet,
        toggleSuperset,
        updateExerciseNote,
        addWarmupSets,
        replaceExercise,
        toggleCollapse,
        updateWorkoutNote,
    } = useWorkoutStore.getState();

    // Home screen data - extracted to useHomeScreenData hook
    const {
        templates,
        activeSplit,
        currentTemplate,
        currentTemplateIndex,
        workoutDatesThisWeek,
        refreshing,
        loadData,
        onRefresh,
        handleChangeTemplateIndex,
        setActiveSplit,
    } = useHomeScreenData();

    // Exercise picker visibility — local UI state (not in Zustand store)
    const [isExercisePickerOpen, setExercisePickerOpen] = useState(false);

    // Replace exercise flow — tracks which exercise is being replaced
    const [replaceExerciseId, setReplaceExerciseId] = useState<string | null>(null);

    // Workout-level note state
    const [showWorkoutNote, setShowWorkoutNote] = useState(false);
    const [workoutNoteInput, setWorkoutNoteInput] = useState('');

    // Swipe-hint onboarding: show on first workout ever
    const [showSwipeHint, setShowSwipeHint] = useState(false);

    // RPE column visibility (loaded from settings)
    const [showRpe, setShowRpe] = useState(false);

    useEffect(() => {
        // Swipe hint check
        if (SWIPE_HINT_FILE.exists) {
            setShowSwipeHint(false);
        } else {
            setShowSwipeHint(true);
            SWIPE_HINT_FILE.write('1');
        }

        // Load RPE setting
        getSettings().then(s => setShowRpe(s.showRpe)).catch(() => {});
    }, []);

    // Live timer - extracted to useElapsedTimer hook
    const { elapsedTime } = useElapsedTimer(activeWorkout?.startedAt ?? null);

    // Save as template modal state
    const [showSaveTemplateModal, setSaveTemplateModal] = useState(false);
    const [pendingWorkout, setPendingWorkout] = useState<Workout | null>(null);

    // Custom keyboard - extracted to useWorkoutKeyboard hook
    const {
        focusState,
        keyboardValue,
        handleFocusField,
        handleKeyPress,
        handleBackspace,
        handleClear,
        handleAdjust,
        handleNext,
        handleHideKeyboard,
        getKeyboardFieldType,
        getFieldLabel,
    } = useWorkoutKeyboard();


    // Handle start workout
    const handleStartWorkout = () => {
        // Reset any pending template modal state
        setSaveTemplateModal(false);
        setPendingWorkout(null);
        startWorkout();
    };

    // Handle start from template
    const handleStartFromTemplate = async (template: Template) => {
        try {
            const workout = await startWorkoutFromTemplate(template.id);
            if (workout) {
                useWorkoutStore.setState({ activeWorkout: workout, previousSets: new Map() });
                // Fetch previous sets for all exercises in the template (non-blocking)
                const exerciseIds = workout.main.exercises.map(e => e.exerciseId);
                if (exerciseIds.length > 0) {
                    getPreviousSetsForExercises(exerciseIds).then(prevMap => {
                        useWorkoutStore.setState({ previousSets: prevMap });
                    }).catch(err => {
                        console.warn('[WorkoutScreen] Failed to load previous sets:', err);
                    });
                }
            }
        } catch (error) {
            console.error('Error starting from template:', error);
            Alert.alert('Error', 'Failed to start workout from template');
        }
    };

    // Handle finish workout
    const handleFinishWorkout = async () => {
        const completedSets = activeWorkout?.main.exercises.reduce(
            (acc, ex) => acc + ex.sets.filter(s => s.status === 'completed').length,
            0
        ) ?? 0;

        if (completedSets === 0 && !isEditMode) {
            Alert.alert(
                'No Sets Completed',
                'You haven\'t completed any sets. Are you sure you want to finish?',
                [
                    { text: 'Keep Training', style: 'cancel' },
                    { text: 'Discard', style: 'destructive', onPress: discardWorkout },
                ]
            );
        } else {
            try {
                // BH-007 fix: Snapshot edit-mode state BEFORE finishWorkout() clears it.
                // finishWorkout() resets isEditMode/original* to false/null in the store,
                // so reading them after the await would see the cleared values.
                const wasEditMode = isEditMode;
                const savedDuration = originalDuration;
                const savedCompletedAt = originalCompletedAt;
                const savedStartedAt = originalStartedAt;

                const workout = await finishWorkout();
                if (workout) {
                    if (wasEditMode) {
                        // Edit mode: restore original timestamps + duration,
                        // skip template prompt, navigate back to calendar
                        const editedWorkout = {
                            ...workout,
                            totalDuration: savedDuration ?? workout.totalDuration,
                            completedAt: savedCompletedAt ?? workout.completedAt,
                            startedAt: savedStartedAt ?? workout.startedAt,
                        };
                        console.log('[WorkoutScreen] Updating edited workout...');
                        const completedGoals = await updateWorkout(editedWorkout);
                        console.log('[WorkoutScreen] Workout updated!');
                        if (completedGoals.length > 0) {
                            useGoalCelebrationStore.getState().celebrate(completedGoals);
                        }
                        // Navigate back to the Profile tab (Calendar)
                        navigateToTab('Profile');
                    } else {
                        // Normal mode: save + template prompt
                        console.log('[WorkoutScreen] Saving workout...');
                        const completedGoals = await saveWorkout(workout);
                        console.log('[WorkoutScreen] Workout saved!');
                        if (completedGoals.length > 0) {
                            useGoalCelebrationStore.getState().celebrate(completedGoals);
                        }

                        await markWorkoutCompletedToday();
                        await loadData();

                        const matchingTemplate = await findMatchingTemplate(workout);
                        if (matchingTemplate) {
                            console.log('[WorkoutScreen] Workout matches template:', matchingTemplate.name);
                        } else {
                            Alert.alert(
                                'Workout Saved!',
                                'This workout has different exercises than your templates. Save as a new template?',
                                [
                                    { text: 'No Thanks', style: 'cancel' },
                                    {
                                        text: 'Save Template',
                                        onPress: () => {
                                            setPendingWorkout(workout);
                                            setSaveTemplateModal(true);
                                        }
                                    },
                                ]
                            );
                        }
                    }
                }
            } catch (error) {
                console.error('[WorkoutScreen] Error finishing workout:', error);
                Alert.alert('Error', 'Failed to save workout. Please try again.');
            }
        }
    };

    // Handle discard workout
    const handleDiscardWorkout = () => {
        Alert.alert(
            'Discard Workout',
            'Are you sure you want to discard this workout? All progress will be lost.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Discard', style: 'destructive', onPress: () => {
                        handleHideKeyboard();
                        discardWorkout();
                    }
                },
            ]
        );
    };

    // Intercept Android back button during active workout
    useEffect(() => {
        if (!activeWorkout) return;

        const onBackPress = () => {
            handleDiscardWorkout();
            return true; // prevent default back navigation
        };

        const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => sub.remove();
    }, [activeWorkout !== null]);

    // PP-008 fix: memoize workout stats so they only recompute when activeWorkout changes
    const stats = useMemo(() => {
        if (!activeWorkout) return { exercises: 0, sets: 0, volume: 0 };

        const exercises = activeWorkout.main.exercises.length;
        let sets = 0;
        let volume = 0;

        activeWorkout.main.exercises.forEach(ex => {
            ex.sets.forEach(s => {
                if (s.status === 'completed') {
                    sets++;
                    if (s.weight && s.reps) {
                        volume += s.weight * s.reps;
                    }
                }
            });
        });

        return { exercises, sets, volume };
    }, [activeWorkout]);

    // Render home view (no active workout) — WorkoutHomeView owns its own modals
    if (!activeWorkout) {
        return (
            <WorkoutHomeView
                activeSplit={activeSplit}
                currentTemplate={currentTemplate}
                currentTemplateIndex={currentTemplateIndex}
                templates={templates}
                workoutDatesThisWeek={workoutDatesThisWeek}
                refreshing={refreshing}
                onRefresh={onRefresh}
                onStartWorkout={handleStartWorkout}
                onStartFromTemplate={handleStartFromTemplate}
                onSplitSelected={(split) => {
                    setActiveSplit(split);
                    loadData();
                }}
                onTemplateIndexChanged={handleChangeTemplateIndex}
                onDataRefresh={loadData}
                onSettingsPress={() => {
                    if (navigationRef.isReady()) {
                        (navigationRef as any).navigate('Profile', { screen: 'Settings', initial: false });
                    }
                }}
            />
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* Workout header */}
            <View style={styles.workoutHeader}>
                <View style={styles.workoutHeaderTop}>
                    <TouchableOpacity onPress={handleDiscardWorkout}>
                        <Text style={styles.discardButton}>{isEditMode ? 'Cancel' : 'Discard'}</Text>
                    </TouchableOpacity>
                    <Text style={styles.workoutTitle}>
                        {isEditMode ? `Editing: ${activeWorkout.name}` : activeWorkout.name}
                    </Text>
                    <View style={styles.headerRight}>
                        <TouchableOpacity
                            style={styles.noteIconButton}
                            onPress={() => {
                                setWorkoutNoteInput(activeWorkout.note ?? '');
                                setShowWorkoutNote(!showWorkoutNote);
                            }}
                        >
                            <Text style={[
                                styles.noteIcon,
                                activeWorkout.note && styles.noteIconActive,
                            ]}>📝</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleFinishWorkout}>
                            <Text style={styles.finishButton}>{isEditMode ? 'Save' : 'Finish'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Stats row */}
                <View style={styles.statsRow}>
                    <View style={styles.stat}>
                        <Text style={styles.statValue}>
                            {isEditMode
                                ? formatElapsedTime(originalDuration ?? 0)
                                : formatElapsedTime(elapsedTime)}
                        </Text>
                        <Text style={styles.statLabel}>Duration</Text>
                    </View>
                    <View style={styles.stat}>
                        <Text style={styles.statValue}>{stats.exercises}</Text>
                        <Text style={styles.statLabel}>Exercises</Text>
                    </View>
                    <View style={styles.stat}>
                        <Text style={styles.statValue}>{stats.sets}</Text>
                        <Text style={styles.statLabel}>Sets</Text>
                    </View>
                    <View style={styles.stat}>
                        <Text style={styles.statValue}>
                            {stats.volume > 999
                                ? `${(stats.volume / 1000).toFixed(1)}k`
                                : stats.volume}
                        </Text>
                        <Text style={styles.statLabel}>Volume</Text>
                    </View>
                </View>
            </View>

            {/* Exercises list */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.exercisesList}
            >
                {/* Workout-level note input */}
                {showWorkoutNote && (
                    <View style={styles.workoutNoteContainer}>
                        <TextInput
                            style={styles.workoutNoteInput}
                            value={workoutNoteInput}
                            onChangeText={setWorkoutNoteInput}
                            placeholder="Workout notes..."
                            placeholderTextColor={colors.text.disabled}
                            multiline
                            autoFocus
                            maxLength={500}
                        />
                        <View style={styles.workoutNoteActions}>
                            <TouchableOpacity
                                onPress={() => setShowWorkoutNote(false)}
                                style={styles.workoutNoteActionButton}
                            >
                                <Text style={styles.workoutNoteCancel}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => {
                                    updateWorkoutNote(workoutNoteInput.trim() || null);
                                    setShowWorkoutNote(false);
                                }}
                                style={styles.workoutNoteActionButton}
                            >
                                <Text style={styles.workoutNoteSave}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Workout note display (when not editing) */}
                {!showWorkoutNote && activeWorkout.note && (
                    <TouchableOpacity
                        onPress={() => {
                            setWorkoutNoteInput(activeWorkout.note ?? '');
                            setShowWorkoutNote(true);
                        }}
                    >
                        <Text style={styles.workoutNoteDisplay}>{activeWorkout.note}</Text>
                    </TouchableOpacity>
                )}

                {activeWorkout.main.exercises.length === 0 ? (
                    <View style={styles.emptyExercises}>
                        <Text style={styles.emptyExercisesText}>
                            Tap "Add Exercise" to start building your workout
                        </Text>
                    </View>
                ) : (
                    activeWorkout.main.exercises.map((workoutExercise, index) => {
                        const exercises = activeWorkout.main.exercises;
                        const nextExercise = exercises[index + 1];
                        const prevExercise = index > 0 ? exercises[index - 1] : null;
                        const isInSuperset = Boolean(workoutExercise.supersetGroupId);
                        const isFirstInSuperset = isInSuperset && (!prevExercise || prevExercise.supersetGroupId !== workoutExercise.supersetGroupId);
                        const isLastInSuperset = isInSuperset && (!nextExercise || nextExercise.supersetGroupId !== workoutExercise.supersetGroupId);
                        const canSuperset = index < exercises.length - 1;
                        const exId = workoutExercise.id;
                        const isCollapsed = collapsedExercises.has(exId);

                        const card = (
                            <ExerciseCard
                                key={exId}
                                workoutExercise={workoutExercise}
                                focusState={focusState}
                                isInSuperset={isInSuperset}
                                isLastInSuperset={isLastInSuperset}
                                canSuperset={canSuperset}
                                exerciseId={exId}
                                isCollapsed={isCollapsed}
                                showSwipeHint={showSwipeHint && index === 0}
                                showRpe={showRpe}
                                previousSets={previousSets.get(workoutExercise.exerciseId)}
                                onUpdateSet={updateSet}
                                onCompleteSet={completeSet}
                                onAddSet={addSet}
                                onRemoveSet={removeSet}
                                onRemoveExercise={removeExercise}
                                onToggleSuperset={toggleSuperset}
                                onFocusField={handleFocusField}
                                onUpdateNote={updateExerciseNote}
                                onAddWarmupSets={addWarmupSets}
                                onReplaceExercise={(exId) => setReplaceExerciseId(exId)}
                                onToggleCollapse={toggleCollapse}
                            />
                        );

                        // Visual superset bracketing: wrap first exercise in superset group
                        if (isFirstInSuperset) {
                            // Gather all exercises in this superset group
                            const supersetCards = [card];
                            let j = index + 1;
                            while (j < exercises.length && exercises[j].supersetGroupId === workoutExercise.supersetGroupId) {
                                const ssEx = exercises[j];
                                const ssNext = exercises[j + 1];
                                const ssIsLast = !ssNext || ssNext.supersetGroupId !== ssEx.supersetGroupId;
                                const ssCollapsed = collapsedExercises.has(ssEx.id);
                                supersetCards.push(
                                    <ExerciseCard
                                        key={ssEx.id}
                                        workoutExercise={ssEx}
                                        focusState={focusState}
                                        isInSuperset={true}
                                        isLastInSuperset={ssIsLast}
                                        canSuperset={j < exercises.length - 1}
                                        exerciseId={ssEx.id}
                                        isCollapsed={ssCollapsed}
                                        showRpe={showRpe}
                                        previousSets={previousSets.get(ssEx.exerciseId)}
                                        onUpdateSet={updateSet}
                                        onCompleteSet={completeSet}
                                        onAddSet={addSet}
                                        onRemoveSet={removeSet}
                                        onRemoveExercise={removeExercise}
                                        onToggleSuperset={toggleSuperset}
                                        onFocusField={handleFocusField}
                                        onUpdateNote={updateExerciseNote}
                                        onAddWarmupSets={addWarmupSets}
                                        onReplaceExercise={(exId) => setReplaceExerciseId(exId)}
                                        onToggleCollapse={toggleCollapse}
                                    />
                                );
                                j++;
                            }

                            return (
                                <View key={`superset-${workoutExercise.supersetGroupId}`} style={styles.supersetContainer}>
                                    <View style={styles.supersetLine} />
                                    <View style={styles.supersetBadge}>
                                        <Text style={styles.supersetBadgeText}>SUPERSET</Text>
                                    </View>
                                    <View style={styles.supersetCards}>
                                        {supersetCards}
                                    </View>
                                </View>
                            );
                        }

                        // Skip exercises already rendered as part of a superset group
                        if (isInSuperset && !isFirstInSuperset) {
                            return null;
                        }

                        return (
                            <ErrorBoundary
                                key={exId}
                                fallback="card"
                                label={workoutExercise.exercise.name}
                            >
                                {card}
                            </ErrorBoundary>
                        );
                    })
                )}

                {/* Add exercise button */}
                <TouchableOpacity
                    style={styles.addExerciseButton}
                    onPress={() => setExercisePickerOpen(true)}
                >
                    <Text style={styles.addExerciseText}>+ Add Exercise</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Rest Timer — hidden in edit mode */}
            {!isEditMode && <RestTimer />}

            {/* Custom Workout Keyboard */}
            <WorkoutKeyboard
                visible={focusState !== null}
                currentValue={keyboardValue}
                fieldType={getKeyboardFieldType()}
                fieldLabel={getFieldLabel()}
                onKeyPress={handleKeyPress}
                onBackspace={handleBackspace}
                onClear={handleClear}
                onAdjust={handleAdjust}
                onNext={handleNext}
                onHide={handleHideKeyboard}
            />

            {/* Exercise picker modal — adding new exercise */}
            <ExercisePicker
                visible={isExercisePickerOpen}
                onClose={() => setExercisePickerOpen(false)}
                onSelect={(exercise) => {
                    addExercise(exercise);
                    setExercisePickerOpen(false);
                }}
            />

            {/* Exercise picker modal — replacing an exercise */}
            <ExercisePicker
                visible={replaceExerciseId !== null}
                onClose={() => setReplaceExerciseId(null)}
                onSelect={(exercise) => {
                    if (replaceExerciseId) {
                        replaceExercise(replaceExerciseId, exercise);
                    }
                    setReplaceExerciseId(null);
                }}
            />

            {/* Save as template modal */}
            <SaveTemplateModal
                visible={showSaveTemplateModal}
                pendingWorkout={pendingWorkout}
                activeSplit={activeSplit}
                onClose={() => {
                    setSaveTemplateModal(false);
                    setPendingWorkout(null);
                }}
                onSaved={loadData}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.primary,
    },
    scrollView: {
        flex: 1,
    },

    // Workout header
    workoutHeader: {
        backgroundColor: colors.background.secondary,
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
        paddingBottom: spacing.lg,
    },
    workoutHeaderTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    noteIconButton: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noteIcon: {
        fontSize: typography.size.md,
        opacity: 0.5,
    },
    noteIconActive: {
        opacity: 1,
    },
    discardButton: {
        color: colors.accent.error,
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
    },
    workoutTitle: {
        color: colors.text.primary,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
    },
    finishButton: {
        color: colors.accent.success,
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
    },

    // Stats row
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    stat: {
        alignItems: 'center',
    },
    statValue: {
        color: colors.text.primary,
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
    },
    statLabel: {
        color: colors.text.secondary,
        fontSize: typography.size.xs,
        marginTop: spacing.xs,
    },

    // Workout-level note
    workoutNoteContainer: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.accent.primary,
    },
    workoutNoteInput: {
        color: colors.text.primary,
        fontSize: typography.size.sm,
        minHeight: 48,
        maxHeight: 120,
        textAlignVertical: 'top',
    },
    workoutNoteActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: spacing.sm,
        gap: spacing.md,
    },
    workoutNoteActionButton: {
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
    },
    workoutNoteCancel: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
    },
    workoutNoteSave: {
        color: colors.accent.primary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
    },
    workoutNoteDisplay: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        fontStyle: 'italic',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
    },

    // Exercises list
    exercisesList: {
        padding: spacing.md,
        paddingBottom: 120,
    },
    emptyExercises: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },
    emptyExercisesText: {
        color: colors.text.secondary,
        fontSize: typography.size.md,
        textAlign: 'center',
    },

    // Visual superset container
    supersetContainer: {
        marginBottom: spacing.md,
        position: 'relative',
    },
    supersetLine: {
        position: 'absolute',
        left: 0,
        top: 24,
        bottom: spacing.md,
        width: 3,
        backgroundColor: colors.accent.primary,
        borderRadius: 2,
    },
    supersetBadge: {
        backgroundColor: colors.accent.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
        alignSelf: 'flex-start',
        marginLeft: spacing.sm,
        marginBottom: spacing.xs,
    },
    supersetBadgeText: {
        color: colors.text.primary,
        fontSize: typography.size.xs,
        fontWeight: typography.weight.bold,
        letterSpacing: 1,
    },
    supersetCards: {
        paddingLeft: spacing.sm,
    },

    // Add exercise button
    addExerciseButton: {
        backgroundColor: colors.background.secondary,
        paddingVertical: spacing.lg,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: 'dashed',
    },
    addExerciseText: {
        color: colors.accent.primary,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.medium,
    },
});
