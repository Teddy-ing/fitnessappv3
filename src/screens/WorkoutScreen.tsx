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

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    TextInput,
    Modal,
    RefreshControl,
    Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, borderRadius, typography } from '../theme';
import { useWorkoutStore } from '../stores';
import { ExerciseCard, ExercisePicker, RestTimer, TemplateCard, WorkoutKeyboard, FocusState, KeyboardFieldType } from '../components';
import {
    saveWorkout,
    getWorkouts,
    getTemplates,
    createTemplateFromWorkout,
    startWorkoutFromTemplate,
    deleteTemplate,
    getActiveSplit,
    getTemplatesForSplit,
    getCurrentTemplate,
    getCurrentTemplateIndex,
    advanceToNextTemplate,
    checkAndAdvanceIfNewDay,
    markWorkoutCompletedToday,
    Template
} from '../services';
import { Workout } from '../models/workout';
import { Split } from '../models/split';
import SplitsScreen from './SplitsScreen';
import TemplatesScreen from './TemplatesScreen';

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
        openExercisePicker,
        closeExercisePicker,
    } = useWorkoutStore();

    // Local state for history and templates
    const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Splits state
    const [activeSplit, setActiveSplit] = useState<Split | null>(null);
    const [showSplitsModal, setShowSplitsModal] = useState(false);
    const [showTemplatesModal, setShowTemplatesModal] = useState(false);
    const [showTemplatePicker, setShowTemplatePicker] = useState(false);
    const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null);
    const [currentTemplateIndex, setCurrentTemplateIndexState] = useState(0);

    // Live timer state - triggers re-renders every second
    const [elapsedTime, setElapsedTime] = useState(0);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Save as template modal state
    const [showSaveTemplateModal, setSaveTemplateModal] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [pendingWorkout, setPendingWorkout] = useState<Workout | null>(null);

    // Custom keyboard state
    const [focusState, setFocusState] = useState<FocusState | null>(null);
    const [keyboardValue, setKeyboardValue] = useState('');

    // Hide system keyboard when our custom keyboard is active
    useEffect(() => {
        if (focusState) {
            Keyboard.dismiss();
        }
    }, [focusState]);

    // Live timer effect - updates every second when workout is active
    useEffect(() => {
        if (activeWorkout) {
            // Update immediately
            const updateElapsed = () => {
                const now = new Date();
                const diff = Math.floor((now.getTime() - activeWorkout.startedAt.getTime()) / 1000);
                setElapsedTime(diff);
            };
            updateElapsed();

            // Set interval
            timerIntervalRef.current = setInterval(updateElapsed, 1000);
        } else {
            // Clear interval when no active workout
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
            setElapsedTime(0);
        }

        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
            }
        };
    }, [activeWorkout?.id]); // Re-run when workout changes

    // Load data on mount
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // Check if we should advance template (new day after workout)
            await checkAndAdvanceIfNewDay();

            const [workouts, active, currentIdx] = await Promise.all([
                getWorkouts(5),
                getActiveSplit(),
                getCurrentTemplateIndex(),
            ]);
            setRecentWorkouts(workouts);
            setActiveSplit(active);
            setCurrentTemplateIndexState(currentIdx);

            // Load templates based on active split
            if (active) {
                const splitTemplates = await getTemplatesForSplit(active.id);
                setTemplates(splitTemplates);

                // Get current template from split schedule
                const nextTemplate = await getCurrentTemplate();
                setCurrentTemplate(nextTemplate);
            } else {
                const allTemplates = await getTemplates();
                setTemplates(allTemplates);
                setCurrentTemplate(null);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, []);

    // Handle start workout
    const handleStartWorkout = () => {
        // Reset any pending template modal state
        setSaveTemplateModal(false);
        setPendingWorkout(null);
        setTemplateName('');
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

    // Handle changing current template position in split
    const handleChangeTemplateIndex = async (newIndex: number) => {
        try {
            const { setCurrentTemplateIndex } = await import('../services');
            await setCurrentTemplateIndex(newIndex);
            setCurrentTemplateIndexState(newIndex);

            // Reload current template
            const nextTemplate = await getCurrentTemplate();
            setCurrentTemplate(nextTemplate);
            setShowTemplatePicker(false);
        } catch (error) {
            console.error('Error changing template index:', error);
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

                    // Ask about saving as template
                    Alert.alert(
                        'Workout Saved!',
                        'Would you like to save this as a template for quick access?',
                        [
                            { text: 'No Thanks', style: 'cancel' },
                            {
                                text: 'Save Template',
                                onPress: () => {
                                    setPendingWorkout(workout);
                                    setTemplateName(workout.name);
                                    setSaveTemplateModal(true);
                                }
                            },
                        ]
                    );
                }
            } catch (error) {
                console.error('[WorkoutScreen] Error finishing workout:', error);
                Alert.alert('Error', 'Failed to save workout. Please try again.');
            }
        }
    };

    // Handle save as template
    const handleSaveTemplate = async () => {
        if (!pendingWorkout || !templateName.trim()) return;

        try {
            await createTemplateFromWorkout(pendingWorkout, templateName.trim());
            setSaveTemplateModal(false);
            setPendingWorkout(null);
            setTemplateName('');
            await loadData();
            Alert.alert('Success', 'Template saved!');
        } catch (error) {
            console.error('Error saving template:', error);
            Alert.alert('Error', 'Failed to save template');
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
                        setFocusState(null);
                        discardWorkout();
                    }
                },
            ]
        );
    };

    // ========================================
    // Custom Keyboard Handlers
    // ========================================

    // Handle focus on a specific field
    const handleFocusField = (exerciseId: string, setId: string, field: 'weight' | 'reps') => {
        if (!activeWorkout) return;

        // Find the current value
        const exercise = activeWorkout.main.exercises.find(e => e.id === exerciseId);
        const set = exercise?.sets.find(s => s.id === setId);

        let currentValue = '';
        if (field === 'weight') {
            currentValue = set?.weight?.toString() ?? '';
        } else if (field === 'reps') {
            currentValue = set?.reps?.toString() ?? '';
        }

        setFocusState({ exerciseId, setId, field });
        setKeyboardValue(currentValue);
    };

    // Handle key press on custom keyboard
    const handleKeyPress = (key: string) => {
        if (!focusState) return;

        // Prevent multiple decimals
        if (key === '.' && keyboardValue.includes('.')) return;

        // Limit length
        if (keyboardValue.length >= 6) return;

        const newValue = keyboardValue + key;
        setKeyboardValue(newValue);

        // Update the set
        const numValue = parseFloat(newValue);
        if (!isNaN(numValue)) {
            if (focusState.field === 'weight') {
                updateSet(focusState.exerciseId, focusState.setId, { weight: numValue });
            } else {
                updateSet(focusState.exerciseId, focusState.setId, { reps: Math.floor(numValue) });
            }
        }
    };

    // Handle backspace
    const handleBackspace = () => {
        if (!focusState || keyboardValue.length === 0) return;

        const newValue = keyboardValue.slice(0, -1);
        setKeyboardValue(newValue);

        const numValue = newValue.length > 0 ? parseFloat(newValue) : null;
        if (focusState.field === 'weight') {
            updateSet(focusState.exerciseId, focusState.setId, { weight: numValue && !isNaN(numValue) ? numValue : null });
        } else {
            updateSet(focusState.exerciseId, focusState.setId, { reps: numValue && !isNaN(numValue) ? Math.floor(numValue) : null });
        }
    };

    // Handle clear
    const handleClear = () => {
        if (!focusState) return;

        setKeyboardValue('');
        if (focusState.field === 'weight') {
            updateSet(focusState.exerciseId, focusState.setId, { weight: null });
        } else {
            updateSet(focusState.exerciseId, focusState.setId, { reps: null });
        }
    };

    // Handle +/- adjustment
    const handleAdjust = (delta: number) => {
        if (!focusState || !activeWorkout) return;

        const exercise = activeWorkout.main.exercises.find(e => e.id === focusState.exerciseId);
        const set = exercise?.sets.find(s => s.id === focusState.setId);

        if (focusState.field === 'weight') {
            const currentWeight = set?.weight ?? 0;
            const newWeight = Math.max(0, currentWeight + delta);
            updateSet(focusState.exerciseId, focusState.setId, { weight: newWeight });
            setKeyboardValue(newWeight.toString());
        } else {
            const currentReps = set?.reps ?? 0;
            const newReps = Math.max(0, currentReps + delta);
            updateSet(focusState.exerciseId, focusState.setId, { reps: newReps });
            setKeyboardValue(newReps.toString());
        }
    };

    // Handle Next button - flow: weight → reps → complete set
    const handleNext = () => {
        if (!focusState || !activeWorkout) return;

        const exercise = activeWorkout.main.exercises.find(e => e.id === focusState.exerciseId);
        if (!exercise) return;

        if (focusState.field === 'weight') {
            // Move to reps
            const set = exercise.sets.find(s => s.id === focusState.setId);
            const repsValue = set?.reps?.toString() ?? '';
            setFocusState({ ...focusState, field: 'reps' });
            setKeyboardValue(repsValue);
        } else {
            // Complete the set and hide keyboard
            completeSet(focusState.exerciseId, focusState.setId);
            setFocusState(null);
            setKeyboardValue('');
        }
    };

    // Handle hide keyboard
    const handleHideKeyboard = () => {
        setFocusState(null);
        setKeyboardValue('');
    };

    // Get current keyboard field type
    const getKeyboardFieldType = (): KeyboardFieldType => {
        return focusState?.field === 'weight' ? 'weight' : 'reps';
    };

    // Get label for current field
    const getFieldLabel = (): string => {
        if (!focusState || !activeWorkout) return '';

        const exercise = activeWorkout.main.exercises.find(e => e.id === focusState.exerciseId);
        if (!exercise) return '';

        const setIndex = exercise.sets.findIndex(s => s.id === focusState.setId);
        const setNum = setIndex + 1;

        return `${exercise.exercise.name} - Set ${setNum} ${focusState.field === 'weight' ? 'Weight' : 'Reps'}`;
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

    // Format duration from elapsed seconds
    const formatElapsedTime = (totalSeconds: number): string => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

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

    // Render empty state (no active workout)
    if (!activeWorkout) {
        return (
            <View style={styles.container}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.text.secondary}
                        />
                    }
                >
                    {/* Empty state */}
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>💪</Text>
                        <Text style={styles.emptyTitle}>Ready to workout?</Text>
                        <Text style={styles.emptySubtitle}>
                            Start a new workout or choose from your templates
                        </Text>
                    </View>

                    {/* Quick actions */}
                    <View style={styles.quickActions}>
                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={handleStartWorkout}
                        >
                            <Text style={styles.primaryButtonText}>Start Empty Workout</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Browse buttons row */}
                    <View style={styles.browseButtonsRow}>
                        <TouchableOpacity
                            style={styles.browseButton}
                            onPress={() => setShowTemplatesModal(true)}
                        >
                            <Text style={styles.browseButtonText}>Browse Templates →</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.browseButton}
                            onPress={() => setShowSplitsModal(true)}
                        >
                            <Text style={styles.browseButtonText}>Browse Splits →</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Current Template and Current Split cards */}
                    <View style={styles.currentCardsRow}>
                        {/* Current Template Card */}
                        <View style={styles.currentCard}>
                            <Text style={styles.currentCardLabel}>Current Template</Text>
                            {currentTemplate ? (
                                <>
                                    <Text style={styles.currentCardTitle}>{currentTemplate.name}</Text>
                                    <Text style={styles.currentCardSubtitle}>
                                        {currentTemplate.exerciseCount} exercises
                                    </Text>
                                    <View style={styles.currentCardActions}>
                                        <TouchableOpacity
                                            onPress={() => handleStartFromTemplate(currentTemplate)}
                                            style={styles.cardActionButton}
                                        >
                                            <Text style={styles.currentCardAction}>Start →</Text>
                                        </TouchableOpacity>
                                        {activeSplit && activeSplit.schedule.length > 1 && (
                                            <TouchableOpacity
                                                onPress={() => setShowTemplatePicker(true)}
                                                style={styles.cardActionButton}
                                            >
                                                <Text style={styles.cardChangeAction}>Change</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </>
                            ) : (
                                <Text style={styles.currentCardEmpty}>
                                    {activeSplit ? 'No templates in split' : 'Select a split first'}
                                </Text>
                            )}
                        </View>

                        {/* Current Split Card */}
                        <TouchableOpacity
                            style={styles.currentCard}
                            onPress={() => setShowSplitsModal(true)}
                        >
                            <Text style={styles.currentCardLabel}>Current Split</Text>
                            {activeSplit ? (
                                <>
                                    <Text style={styles.currentCardTitle}>{activeSplit.name}</Text>
                                    <Text style={styles.currentCardSubtitle}>
                                        Day {currentTemplateIndex + 1} of {activeSplit.schedule.length}
                                    </Text>
                                </>
                            ) : (
                                <Text style={styles.currentCardEmpty}>No split selected</Text>
                            )}
                            <Text style={styles.currentCardAction}>Change →</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Recent workouts */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Recent Workouts</Text>
                        {recentWorkouts.length === 0 ? (
                            <View style={styles.placeholder}>
                                <Text style={styles.placeholderText}>No recent workouts yet</Text>
                            </View>
                        ) : (
                            recentWorkouts.map(workout => (
                                <View key={workout.id} style={styles.historyCard}>
                                    <View style={styles.historyHeader}>
                                        <Text style={styles.historyName}>{workout.name}</Text>
                                        <Text style={styles.historyDate}>
                                            {formatWorkoutDate(workout.completedAt || workout.createdAt)}
                                        </Text>
                                    </View>
                                    <Text style={styles.historyStats}>
                                        {workout.main.exercises.length} exercises • {workout.totalSets || 0} sets • {Math.round((workout.totalDuration || 0) / 60)} min
                                    </Text>
                                </View>
                            ))
                        )}
                    </View>
                </ScrollView>

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
                <Modal
                    visible={showTemplatePicker}
                    animationType="fade"
                    transparent
                    onRequestClose={() => setShowTemplatePicker(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Choose Current Template</Text>
                            <Text style={styles.pickerSubtitle}>
                                Select which template to start from
                            </Text>
                            <ScrollView style={styles.pickerList}>
                                {activeSplit?.schedule.map((item, index) => {
                                    if (item.type === 'rest') {
                                        return (
                                            <View key={index} style={styles.pickerItem}>
                                                <Text style={styles.pickerRestText}>Rest Day</Text>
                                            </View>
                                        );
                                    }
                                    const template = templates.find(t => t.id === item.templateId);
                                    return (
                                        <TouchableOpacity
                                            key={index}
                                            style={[
                                                styles.pickerItem,
                                                currentTemplateIndex === index && styles.pickerItemActive
                                            ]}
                                            onPress={() => handleChangeTemplateIndex(index)}
                                        >
                                            <Text style={[
                                                styles.pickerItemText,
                                                currentTemplateIndex === index && styles.pickerItemTextActive
                                            ]}>
                                                {template?.name || 'Unknown Template'}
                                            </Text>
                                            <Text style={styles.pickerItemMeta}>
                                                Day {index + 1}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                            <TouchableOpacity
                                style={styles.modalButtonCancel}
                                onPress={() => setShowTemplatePicker(false)}
                            >
                                <Text style={styles.modalButtonCancelText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* Save as template modal - needs to be in empty state too! */}
                <Modal
                    visible={showSaveTemplateModal}
                    animationType="fade"
                    transparent
                    onRequestClose={() => setSaveTemplateModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Save as Template</Text>
                            <TextInput
                                style={styles.templateInput}
                                value={templateName}
                                onChangeText={setTemplateName}
                                placeholder="Template name"
                                placeholderTextColor={colors.text.secondary}
                                autoFocus
                            />
                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={styles.modalButtonCancel}
                                    onPress={() => {
                                        setSaveTemplateModal(false);
                                        setPendingWorkout(null);
                                        loadData();
                                    }}
                                >
                                    <Text style={styles.modalButtonCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.modalButtonSave}
                                    onPress={handleSaveTemplate}
                                >
                                    <Text style={styles.modalButtonSaveText}>Save</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        );
    }

    // Render active workout
    const stats = getWorkoutStats();

    return (
        <View style={styles.container}>
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
                    activeWorkout.main.exercises.map((workoutExercise) => (
                        <ExerciseCard
                            key={workoutExercise.id}
                            workoutExercise={workoutExercise}
                            focusState={focusState}
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
                            onFocusField={handleFocusField}
                        />
                    ))
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
            <Modal
                visible={showSaveTemplateModal}
                animationType="fade"
                transparent
                onRequestClose={() => setSaveTemplateModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Save as Template</Text>
                        <TextInput
                            style={styles.templateInput}
                            value={templateName}
                            onChangeText={setTemplateName}
                            placeholder="Template name"
                            placeholderTextColor={colors.text.secondary}
                            autoFocus
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalButtonCancel}
                                onPress={() => {
                                    setSaveTemplateModal(false);
                                    setPendingWorkout(null);
                                    loadData();
                                }}
                            >
                                <Text style={styles.modalButtonCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalButtonSave}
                                onPress={handleSaveTemplate}
                            >
                                <Text style={styles.modalButtonSaveText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
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

    // Empty state
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: spacing.md,
    },
    emptyTitle: {
        fontSize: typography.size.xxl,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    emptySubtitle: {
        fontSize: typography.size.md,
        color: colors.text.secondary,
        textAlign: 'center',
    },

    // Quick actions
    quickActions: {
        marginTop: spacing.lg,
    },
    primaryButton: {
        backgroundColor: colors.accent.primary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
    },
    primaryButtonText: {
        color: colors.text.primary,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
    },

    // Sections
    section: {
        marginTop: spacing.xl,
    },
    sectionTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
        marginBottom: spacing.md,
    },
    placeholder: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        alignItems: 'center',
    },
    placeholderText: {
        color: colors.text.secondary,
        fontSize: typography.size.md,
        textAlign: 'center',
    },

    // History cards
    historyCard: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    historyName: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
    },
    historyDate: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
    },
    historyStats: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
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
