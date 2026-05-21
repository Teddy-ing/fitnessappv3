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

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Alert,
    BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { File, Paths } from 'expo-file-system';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

import { colors, spacing, borderRadius, typography } from '../theme';
import { useWorkoutStore } from '../stores';
import { ExercisePicker, RestTimer, WorkoutKeyboard, SaveTemplateModal, WorkoutSettingsMenu } from '../components';
import RenderableExerciseItem, { RenderableItem } from '../components/workout/RenderableExerciseItem';
import WorkoutNoteSection from '../components/workout/WorkoutNoteSection';
import WorkoutHeader from '../components/workout/WorkoutHeader';
import { useElapsedTimer, useWorkoutKeyboard, useHomeScreenData } from '../hooks';
import { isKeyboardField } from '../hooks/useWorkoutKeyboard';
import { useWorkoutSettings } from '../hooks/workout/useWorkoutSettings';
import {
    saveWorkout,
    updateWorkout,
    findMatchingTemplate,
    startWorkoutFromTemplate,
    markWorkoutCompletedToday,
    getPreviousSetsForExercises,
    Template,
} from '../services';
import { triggerAutoBackupIfEnabled } from '../services/cloudBackupService';
import { Workout } from '../models/workout';
import { useGoalCelebrationStore } from '../stores/goalCelebrationStore';
import WorkoutHomeView from './WorkoutHomeView';
import { navigateToTab, navigationRef } from '../navigation/navigationRef';
import { useIsFocused } from '@react-navigation/native';

// Swipe hint persistence key
const SWIPE_HINT_FILE = new File(Paths.document, '.swipe_hint_seen');

export default function WorkoutScreen() {
    // PP-001 fix: Fine-grained selector — only re-render when activeWorkout changes.
    // Actions are stable references; access via getState() to avoid subscribing to them.
    const activeWorkout = useWorkoutStore(s => s.activeWorkout);
    const isEditMode = useWorkoutStore(s => s.isEditMode);
    const previousSets = useWorkoutStore(s => s.previousSets);
    const exerciseSuggestions = useWorkoutStore(s => s.exerciseSuggestions);
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

    // Workout settings — extracted to useWorkoutSettings hook
    const {
        showPrevious,
        showRpe,
        showRir,
        showPlateCalc,
        defaultWarmupSets,
        defaultSetsPerExercise,
        defaultWeightIncrement,
        autoStartRestTimer,
        defaultRestTime,
        smartSuggestions,
        showProgressionNudges,
        weightUnit,
        keepAwakeDuringWorkout,
        settingsMenuVisible,
        setSettingsMenuVisible,
        handleToggleSetting,
        handleChangeWarmupSets,
        handleChangeDefaultSets,
        handleChangeWeightIncrement,
        handleChangeRestTime,
        refreshSettings,
    } = useWorkoutSettings();

    // BH-051: Re-read settings when the Workout tab receives focus.
    // keepAwakeDuringWorkout (and other settings) were stale if changed
    // in SettingsScreen while the tab stayed mounted.
    const isFocused = useIsFocused();
    useEffect(() => {
        if (isFocused) refreshSettings();
    }, [isFocused, refreshSettings]);

    // Keep screen awake during active workout (gated by setting)
    useEffect(() => {
        if (activeWorkout && keepAwakeDuringWorkout) {
            activateKeepAwakeAsync('workout').catch(() => {});
        } else {
            deactivateKeepAwake('workout');
        }
        return () => { deactivateKeepAwake('workout'); };
    }, [!!activeWorkout, keepAwakeDuringWorkout]);

    // Workout-level note state
    const [showWorkoutNote, setShowWorkoutNote] = useState(false);
    const [workoutNoteInput, setWorkoutNoteInput] = useState('');

    // Swipe-hint onboarding: show on first workout ever
    const [showSwipeHint, setShowSwipeHint] = useState(false);

    useEffect(() => {
        // Swipe hint check
        if (SWIPE_HINT_FILE.exists) {
            setShowSwipeHint(false);
        } else {
            setShowSwipeHint(true);
            SWIPE_HINT_FILE.write('1');
        }
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
        handleRpeRirSelected,
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

    // BH-059: Guard against double-tap on finish (guardrail #14).
    // Set synchronously before first await, cleared in finally.
    const isSavingRef = useRef(false);

    // Handle finish workout
    const handleFinishWorkout = async () => {
        if (isSavingRef.current) return;

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
            isSavingRef.current = true;
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

                        // Fire-and-forget cloud backup (Option A: immediate)
                        triggerAutoBackupIfEnabled();

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
            } finally {
                isSavingRef.current = false;
            }
        }
    };

    // Handle discard workout
    const handleDiscardWorkout = useCallback(() => {
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
    }, [handleHideKeyboard, discardWorkout]);

    // Intercept Android back button during active workout
    useEffect(() => {
        if (!activeWorkout) return;

        const onBackPress = () => {
            handleDiscardWorkout();
            return true; // prevent default back navigation
        };

        const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => sub.remove();
    }, [activeWorkout !== null, handleDiscardWorkout]);

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

    // PP-044 fix: Pre-process exercises into FlatList-compatible items.
    // Superset groups are collapsed into single entries so FlatList can virtualize.
    const renderableItems = useMemo((): RenderableItem[] => {
        if (!activeWorkout) return [];
        const exercises = activeWorkout.main.exercises;
        const items: RenderableItem[] = [];
        let i = 0;

        while (i < exercises.length) {
            const ex = exercises[i];
            if (ex.supersetGroupId) {
                // Collect all exercises in this superset group into one item
                const groupExercises = [ex];
                let j = i + 1;
                while (j < exercises.length && exercises[j].supersetGroupId === ex.supersetGroupId) {
                    groupExercises.push(exercises[j]);
                    j++;
                }
                items.push({
                    type: 'superset',
                    exercises: groupExercises,
                    startIndex: i,
                    groupId: ex.supersetGroupId,
                    id: `superset-${ex.supersetGroupId}`,
                });
                i = j;
            } else {
                items.push({
                    type: 'standalone',
                    exercise: ex,
                    index: i,
                    id: ex.id,
                });
                i++;
            }
        }

        return items;
    }, [activeWorkout]);

    const exerciseKeyExtractor = (item: RenderableItem) => item.id;

    // Stable renderItem — avoids creating a new closure on every render,
    // which would defeat React.memo on RenderableExerciseItem.
    const renderExerciseItem = useCallback(({ item }: { item: RenderableItem }) => (
        <RenderableExerciseItem
            item={item}
            totalExercises={activeWorkout!.main.exercises.length}
            focusState={focusState}
            collapsedExercises={collapsedExercises}
            showPrevious={showPrevious}
            showRpe={showRpe}
            showRir={showRir}
            showSwipeHint={showSwipeHint}
            defaultWarmupSets={defaultWarmupSets}
            previousSets={previousSets}
            exerciseSuggestions={exerciseSuggestions}
            onUpdateSet={updateSet}
            onCompleteSet={completeSet}
            onAddSet={addSet}
            onRemoveSet={removeSet}
            onRemoveExercise={removeExercise}
            onToggleSuperset={toggleSuperset}
            onFocusField={handleFocusField}
            onUpdateNote={updateExerciseNote}
            onAddWarmupSets={addWarmupSets}
            onReplaceExercise={setReplaceExerciseId}
            onToggleCollapse={toggleCollapse}
            onRpeRirSelected={handleRpeRirSelected}
            showProgressionNudges={showProgressionNudges}
        />
    ), [
        // Props that change between renders (all others are stable refs from getState/useState):
        activeWorkout, focusState, collapsedExercises,
        showPrevious, showRpe, showRir, showSwipeHint,
        defaultWarmupSets, previousSets, exerciseSuggestions, showProgressionNudges,
        // Stable refs — listed for completeness but won't cause re-creation:
        handleFocusField, updateSet, completeSet, addSet, removeSet,
        removeExercise, toggleSuperset, updateExerciseNote, addWarmupSets,
        setReplaceExerciseId, toggleCollapse, handleRpeRirSelected,
    ]);

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
            <WorkoutHeader
                title={activeWorkout.name}
                isEditMode={isEditMode}
                elapsedTime={elapsedTime}
                originalDuration={originalDuration}
                stats={stats}
                onDiscard={handleDiscardWorkout}
                onFinish={handleFinishWorkout}
                onSettingsPress={() => setSettingsMenuVisible(true)}
            />

            {/* Exercises list — PP-044: FlatList for virtualization */}
            <FlatList
                data={renderableItems}
                renderItem={renderExerciseItem}
                keyExtractor={exerciseKeyExtractor}
                style={styles.scrollView}
                contentContainerStyle={styles.exercisesList}
                ListHeaderComponent={
                    <WorkoutNoteSection
                        isEditing={showWorkoutNote}
                        inputValue={workoutNoteInput}
                        savedNote={activeWorkout.note}
                        onChangeText={setWorkoutNoteInput}
                        onSave={() => {
                            updateWorkoutNote(workoutNoteInput.trim() || null);
                            setShowWorkoutNote(false);
                        }}
                        onCancel={() => setShowWorkoutNote(false)}
                        onStartEditing={() => {
                            setWorkoutNoteInput(activeWorkout.note ?? '');
                            setShowWorkoutNote(true);
                        }}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyExercises}>
                        <Text style={styles.emptyExercisesText}>
                            Tap "Add Exercise" to start building your workout
                        </Text>
                    </View>
                }
                ListFooterComponent={
                    <TouchableOpacity
                        style={styles.addExerciseButton}
                        onPress={() => setExercisePickerOpen(true)}
                    >
                        <Text style={styles.addExerciseText}>+ Add Exercise</Text>
                    </TouchableOpacity>
                }
                keyboardShouldPersistTaps="handled"
            />

            {/* Rest Timer — hidden in edit mode */}
            {!isEditMode && (
                <RestTimer
                    autoStartRestTimer={autoStartRestTimer}
                    defaultRestTime={defaultRestTime}
                />
            )}

            {/* Settings Menu */}
            <WorkoutSettingsMenu
                visible={settingsMenuVisible}
                onClose={() => setSettingsMenuVisible(false)}
                onAddNote={() => {
                    setWorkoutNoteInput(activeWorkout.note ?? '');
                    setShowWorkoutNote(true);
                }}
                showPrevious={showPrevious}
                showRpe={showRpe}
                showRir={showRir}
                showPlateCalc={showPlateCalc}
                defaultWarmupSets={defaultWarmupSets}
                defaultSetsPerExercise={defaultSetsPerExercise}
                defaultWeightIncrement={defaultWeightIncrement}
                autoStartRestTimer={autoStartRestTimer}
                defaultRestTime={defaultRestTime}
                smartSuggestions={smartSuggestions}
                showProgressionNudges={showProgressionNudges}
                weightUnit={weightUnit}
                onToggleSetting={handleToggleSetting}
                onChangeWarmupSets={handleChangeWarmupSets}
                onChangeDefaultSets={handleChangeDefaultSets}
                onChangeWeightIncrement={handleChangeWeightIncrement}
                onChangeRestTime={handleChangeRestTime}
            />

            {/* Custom Workout Keyboard */}
            <WorkoutKeyboard
                visible={focusState !== null && isKeyboardField(focusState.field)}
                currentValue={keyboardValue}
                fieldType={getKeyboardFieldType()}
                fieldLabel={getFieldLabel()}
                onKeyPress={handleKeyPress}
                onBackspace={handleBackspace}
                onClear={handleClear}
                onAdjust={handleAdjust}
                onNext={handleNext}
                onHide={handleHideKeyboard}
                showPlateCalc={showPlateCalc}
                weightIncrement={defaultWeightIncrement}
            />

            {/* Exercise picker modal — adding new exercise */}
            <ExercisePicker
                visible={isExercisePickerOpen}
                onClose={() => setExercisePickerOpen(false)}
                onSelect={(exercise) => {
                    addExercise(exercise);
                    // BH-062: Apply the user's warmup set preference to the newly added exercise.
                    // The factory defaults to 0 warmups; we add them here where we have access to settings.
                    if (defaultWarmupSets > 0 && exercise.category === 'strength') {
                        addWarmupSets(
                            // Get the just-added exercise's ID from the store
                            useWorkoutStore.getState().activeWorkout!.main.exercises[
                                useWorkoutStore.getState().activeWorkout!.main.exercises.length - 1
                            ].id,
                            defaultWarmupSets,
                        );
                    }
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
