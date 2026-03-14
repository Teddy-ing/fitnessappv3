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

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, borderRadius, typography } from '../theme';
import { useWorkoutStore } from '../stores';
import { ExerciseCard, ExercisePicker, RestTimer, WorkoutKeyboard, SaveTemplateModal, ErrorBoundary } from '../components';
import { useElapsedTimer, formatElapsedTime, useWorkoutKeyboard, useHomeScreenData } from '../hooks';
import {
    saveWorkout,
    findMatchingTemplate,
    startWorkoutFromTemplate,
    markWorkoutCompletedToday,
    Template,
} from '../services';
import { Workout } from '../models/workout';
import WorkoutHomeView from './WorkoutHomeView';

export default function WorkoutScreen() {
    const {
        activeWorkout,
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
    } = useWorkoutStore();

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
                useWorkoutStore.setState({ activeWorkout: workout });
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

        if (completedSets === 0) {
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
                const workout = await finishWorkout();
                if (workout) {
                    console.log('[WorkoutScreen] Saving workout...');
                    await saveWorkout(workout);
                    console.log('[WorkoutScreen] Workout saved!');

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

    // Calculate workout stats
    const getWorkoutStats = () => {
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
    };

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
            />
        );
    }

    // Render active workout
    const stats = getWorkoutStats();

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* Workout header */}
            <View style={styles.workoutHeader}>
                <View style={styles.workoutHeaderTop}>
                    <TouchableOpacity onPress={handleDiscardWorkout}>
                        <Text style={styles.discardButton}>Discard</Text>
                    </TouchableOpacity>
                    <Text style={styles.workoutTitle}>{activeWorkout.name}</Text>
                    <TouchableOpacity onPress={handleFinishWorkout}>
                        <Text style={styles.finishButton}>Finish</Text>
                    </TouchableOpacity>
                </View>

                {/* Stats row */}
                <View style={styles.statsRow}>
                    <View style={styles.stat}>
                        <Text style={styles.statValue}>{formatElapsedTime(elapsedTime)}</Text>
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
                        const isInSuperset = Boolean(workoutExercise.supersetGroupId);
                        const isLastInSuperset = isInSuperset && (!nextExercise || nextExercise.supersetGroupId !== workoutExercise.supersetGroupId);
                        const canSuperset = index < exercises.length - 1;

                        return (
                            <ErrorBoundary
                                key={workoutExercise.id}
                                fallback="card"
                                label={workoutExercise.exercise.name}
                            >
                                <ExerciseCard
                                    workoutExercise={workoutExercise}
                                    focusState={focusState}
                                    isInSuperset={isInSuperset}
                                    isLastInSuperset={isLastInSuperset}
                                    canSuperset={canSuperset}
                                    onUpdateSet={(setId, updates) =>
                                        updateSet(workoutExercise.id, setId, updates)
                                    }
                                    onCompleteSet={(setId) =>
                                        completeSet(workoutExercise.id, setId)
                                    }
                                    onAddSet={() => addSet(workoutExercise.id)}
                                    onRemoveSet={(setId) =>
                                        removeSet(workoutExercise.id, setId)
                                    }
                                    onRemoveExercise={() => removeExercise(workoutExercise.id)}
                                    onToggleSuperset={() => toggleSuperset(workoutExercise.id)}
                                    onFocusField={handleFocusField}
                                />
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

            {/* Rest Timer */}
            <RestTimer />

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

            {/* Exercise picker modal */}
            <ExercisePicker
                visible={isExercisePickerOpen}
                onClose={() => setExercisePickerOpen(false)}
                onSelect={(exercise) => {
                    addExercise(exercise);
                    setExercisePickerOpen(false);
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

    // Exercises list
    exercisesList: {
        padding: spacing.md,
        paddingBottom: 120, // Extra padding for rest timer
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
