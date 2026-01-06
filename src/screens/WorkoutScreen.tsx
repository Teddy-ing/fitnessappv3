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
    TextInput,
    Modal,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, borderRadius, typography } from '../theme';
import { useWorkoutStore } from '../stores';
import { ExerciseCard, ExercisePicker, RestTimer, TemplateCard } from '../components';
import {
    saveWorkout,
    getWorkouts,
    getTemplates,
    createTemplateFromWorkout,
    startWorkoutFromTemplate,
    deleteTemplate,
    Template
} from '../services';
import { Workout } from '../models/workout';

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

    // Save as template modal state
    const [showSaveTemplateModal, setSaveTemplateModal] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [pendingWorkout, setPendingWorkout] = useState<Workout | null>(null);

    // Load data on mount
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [workouts, tmplts] = await Promise.all([
                getWorkouts(5),
                getTemplates(),
            ]);
            setRecentWorkouts(workouts);
            setTemplates(tmplts);
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
            // Ask if they want to save as template
            const workout = await finishWorkout();
            if (workout) {
                await saveWorkout(workout);

                // Ask about saving as template
                Alert.alert(
                    'Workout Saved!',
                    'Would you like to save this as a template for quick access?',
                    [
                        { text: 'No Thanks', style: 'cancel', onPress: loadData },
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
                { text: 'Discard', style: 'destructive', onPress: discardWorkout },
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

    // Format duration
    const formatDuration = (startedAt: Date): string => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;

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
            <SafeAreaView style={styles.container} edges={['bottom']}>
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

                    {/* Templates */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Your Templates</Text>
                        {templates.length === 0 ? (
                            <View style={styles.placeholder}>
                                <Text style={styles.placeholderText}>
                                    No templates yet. Finish a workout to save it as a template!
                                </Text>
                            </View>
                        ) : (
                            templates.map(template => (
                                <TemplateCard
                                    key={template.id}
                                    template={template}
                                    onPress={() => handleStartFromTemplate(template)}
                                    onDelete={() => handleDeleteTemplate(template)}
                                />
                            ))
                        )}
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
            </SafeAreaView>
        );
    }

    // Render active workout
    const stats = getWorkoutStats();

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
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
                        <Text style={styles.statValue}>{formatDuration(activeWorkout.startedAt)}</Text>
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
        borderBottomWidth: 1,
        borderBottomColor: colors.separator,
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
});
