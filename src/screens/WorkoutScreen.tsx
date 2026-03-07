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

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Modal,
    RefreshControl,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing, borderRadius, typography } from '../theme';
import { useWorkoutStore } from '../stores';
import { ExerciseCard, ExercisePicker, RestTimer, TemplateCard, WorkoutKeyboard, TemplatePickerModal, SaveTemplateModal } from '../components';
import { useElapsedTimer, formatElapsedTime, useWorkoutKeyboard, useHomeScreenData } from '../hooks';
import {
    saveWorkout,
    findMatchingTemplate,
    startWorkoutFromTemplate,
    deleteTemplate,
    markWorkoutCompletedToday,
    Template,
} from '../services';
import { Workout } from '../models/workout';
import { Split } from '../models/split';
import SplitsScreen from './SplitsScreen';
import TemplatesScreen from './TemplatesScreen';
import WorkoutHomeView from './WorkoutHomeView';

export default function WorkoutScreen() {
    const {
        activeWorkout,
        isExercisePickerOpen,
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
        openExercisePicker,
        closeExercisePicker,
    } = useWorkoutStore();

    // Home screen data - extracted to useHomeScreenData hook
    const {
        recentWorkouts,
        templates,
        activeSplit,
        currentTemplate,
        currentTemplateIndex,
        workoutDatesThisWeek,
        isLoading,
        refreshing,
        loadData,
        onRefresh,
        handleChangeTemplateIndex,
        setActiveSplit,
    } = useHomeScreenData();

    // UI toggle states (remain in component)
    const [showSplitsModal, setShowSplitsModal] = useState(false);
    const [showTemplatesModal, setShowTemplatesModal] = useState(false);
    const [showTemplatePicker, setShowTemplatePicker] = useState(false);

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
                // Manually set the workout in the store
                // The store's startWorkout creates a new one, so we need to set it directly
                useWorkoutStore.setState({ activeWorkout: workout });
            }
        } catch (error) {
            console.error('Error starting from template:', error);
            Alert.alert('Error', 'Failed to start workout from template');
        }
    };



    // Handle delete template
    const handleDeleteTemplate = async (template: Template) => {
        Alert.alert(
            'Delete Template',
            `Are you sure you want to delete "${template.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteTemplate(template.id);
                        await loadData();
                    }
                },
            ]
        );
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
                // Finish and save the workout
                const workout = await finishWorkout();
                if (workout) {
                    console.log('[WorkoutScreen] Saving workout...');
                    await saveWorkout(workout);
                    console.log('[WorkoutScreen] Workout saved!');

                    // Mark workout completed for date-based advance
                    await markWorkoutCompletedToday();

                    // Reload data first to ensure history is updated
                    await loadData();

                    // Check if workout matches an existing template
                    const matchingTemplate = await findMatchingTemplate(workout);
                    if (matchingTemplate) {
                        // Exercises match existing template - no prompt needed
                        console.log('[WorkoutScreen] Workout matches template:', matchingTemplate.name);
                    } else {
                        // Exercises differ - offer to save as template
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

    // formatElapsedTime is now imported from '../hooks'

    // Format workout date for history
    const formatWorkoutDate = (date: Date): string => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;

        return date.toLocaleDateString();
    };

    // Render empty state (no active workout) — delegated to WorkoutHomeView
    if (!activeWorkout) {
        const homeModals = (
            <>
                {/* Splits modal */}
                <SplitsScreen
                    visible={showSplitsModal}
                    onClose={() => setShowSplitsModal(false)}
                    onSplitSelected={(split) => {
                        setActiveSplit(split);
                        loadData();
                    }}
                />

                {/* Templates modal */}
                <TemplatesScreen
                    visible={showTemplatesModal}
                    onClose={() => setShowTemplatesModal(false)}
                    onSelectTemplate={(template) => handleStartFromTemplate(template)}
                />

                {/* Template picker modal - for switching current position in split */}
                <TemplatePickerModal
                    visible={showTemplatePicker}
                    activeSplit={activeSplit}
                    templates={templates}
                    currentTemplateIndex={currentTemplateIndex}
                    onChangeIndex={async (index) => {
                        await handleChangeTemplateIndex(index);
                        setShowTemplatePicker(false);
                    }}
                    onClose={() => setShowTemplatePicker(false)}
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
            </>
        );

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
                onShowSplitsModal={() => setShowSplitsModal(true)}
                onShowTemplatesModal={() => setShowTemplatesModal(true)}
                onShowTemplatePicker={() => setShowTemplatePicker(true)}
                modals={homeModals}
            />
        );
    }

    // Render active workout
    const stats = getWorkoutStats();

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
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
                            <ExerciseCard
                                key={workoutExercise.id}
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
                        );
                    })
                )}

                {/* Add exercise button */}
                <TouchableOpacity
                    style={styles.addExerciseButton}
                    onPress={openExercisePicker}
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
                onClose={closeExercisePicker}
                onSelect={addExercise}
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
    scrollContent: {
        padding: spacing.md,
        paddingBottom: spacing.xxl,
    },

    // (Home screen styles are now in WorkoutHomeView.tsx)

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

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    modalContent: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        width: '100%',
        maxWidth: 400,
    },
    modalTitle: {
        color: colors.text.primary,
        fontSize: typography.size.xl,
        fontWeight: typography.weight.semibold,
        marginBottom: spacing.md,
        textAlign: 'center',
    },
    templateInput: {
        backgroundColor: colors.background.tertiary,
        color: colors.text.primary,
        fontSize: typography.size.lg,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.lg,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    modalButtonCancel: {
        flex: 1,
        paddingVertical: spacing.md,
        marginRight: spacing.sm,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        backgroundColor: colors.background.tertiary,
    },
    modalButtonCancelText: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
    },
    modalButtonSave: {
        flex: 1,
        paddingVertical: spacing.md,
        marginLeft: spacing.sm,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        backgroundColor: colors.accent.primary,
    },
    modalButtonSaveText: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
    },

    // Split header styles
    splitHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.sm,
    },
    splitInfo: {
        flex: 1,
    },
    splitSubtitle: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        marginTop: spacing.xs,
    },
    browseSplitsButton: {
        backgroundColor: colors.background.tertiary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
    },
    browseSplitsText: {
        color: colors.accent.primary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
    },

    // New layout styles
    browseButtonsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.lg,
        marginBottom: spacing.lg,
    },
    browseButton: {
        flex: 1,
        backgroundColor: colors.background.secondary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    browseButtonText: {
        color: colors.accent.primary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
    },
    currentCardsRow: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    currentCard: {
        flex: 1,
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        minHeight: 120,
    },
    currentCardLabel: {
        color: colors.text.secondary,
        fontSize: typography.size.xs,
        textTransform: 'uppercase',
        marginBottom: spacing.sm,
    },
    currentCardTitle: {
        color: colors.text.primary,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        marginBottom: spacing.xs,
    },
    currentCardSubtitle: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
    },
    currentCardAction: {
        color: colors.accent.primary,
        fontSize: typography.size.sm,
    },
    currentCardEmpty: {
        color: colors.text.disabled,
        fontSize: typography.size.sm,
        flex: 1,
    },
    currentCardActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 'auto',
        paddingTop: spacing.sm,
    },
    cardActionButton: {
        paddingVertical: spacing.xs,
    },
    cardChangeAction: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
    },

    // Template picker modal styles
    pickerSubtitle: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        marginBottom: spacing.md,
        textAlign: 'center',
    },
    pickerList: {
        maxHeight: 300,
        marginBottom: spacing.md,
    },
    pickerItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    pickerItemActive: {
        borderWidth: 2,
        borderColor: colors.accent.primary,
    },
    pickerItemText: {
        color: colors.text.primary,
        fontSize: typography.size.md,
    },
    pickerItemTextActive: {
        color: colors.accent.primary,
        fontWeight: typography.weight.semibold,
    },
    pickerItemMeta: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
    },
    pickerRestText: {
        color: colors.text.disabled,
        fontSize: typography.size.sm,
        fontStyle: 'italic',
    },
});
