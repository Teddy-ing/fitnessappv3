/**
 * Workout Screen
 * 
 * The main/primary screen of the app.
 * This is where users log their workouts.
 * 
 * Design inspired by:
 * - Hevy's card-based layout for exercises
 * - Strong's "checkmark flow" for quick set completion
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, borderRadius, typography } from '../theme';
import { useWorkoutStore } from '../stores';
import { ExerciseCard, ExercisePicker } from '../components';

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

    // Handle start workout
    const handleStartWorkout = () => {
        startWorkout();
    };

    // Handle finish workout
    const handleFinishWorkout = () => {
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
            finishWorkout();
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

    // Render empty state (no active workout)
    if (!activeWorkout) {
        return (
            <SafeAreaView style={styles.container} edges={['bottom']}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
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

                        <TouchableOpacity style={styles.secondaryButton}>
                            <Text style={styles.secondaryButtonText}>Choose Template</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Recent workouts preview */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Recent Workouts</Text>
                        <View style={styles.placeholder}>
                            <Text style={styles.placeholderText}>No recent workouts yet</Text>
                        </View>
                    </View>

                    {/* Templates preview */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Your Templates</Text>
                        <View style={styles.placeholder}>
                            <Text style={styles.placeholderText}>No templates yet</Text>
                        </View>
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

            {/* Exercise picker modal */}
            <ExercisePicker
                visible={isExercisePickerOpen}
                onClose={closeExercisePicker}
                onSelect={addExercise}
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
        paddingHorizontal: spacing.md,
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
    secondaryButton: {
        backgroundColor: colors.background.tertiary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        marginTop: spacing.sm,
    },
    secondaryButtonText: {
        color: colors.text.primary,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.medium,
    },

    // Sections
    section: {
        marginTop: spacing.xl,
        paddingHorizontal: spacing.md,
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
        paddingBottom: spacing.xxl,
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
