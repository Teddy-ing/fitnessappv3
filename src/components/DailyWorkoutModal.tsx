/**
 * DailyWorkoutModal
 *
 * Bottom-sheet-style modal that opens when a heatmap day cell is tapped.
 * Shows date header, summary badges, and workout cards with exercises/sets.
 * Displays PR badges on record-setting sets and notes when present.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Dimensions,
    Pressable,
    Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../theme';
import { getWorkoutsForDate, getPRSetIdsForDate, type PRSetIds } from '../services';
import { useWorkoutStore } from '../stores';
import { navigateToTab } from '../navigation/navigationRef';
import { formatDuration, formatVolume } from '../utils/formatters';
import type { Workout, WorkoutExercise, WorkoutSet } from '../models/workout';

// ============================================================
// Types
// ============================================================

interface DailyWorkoutModalProps {
    date: string | null; // ISO date string (YYYY-MM-DD), null = hidden
    onClose: () => void;
}




// ============================================================
// Helpers
// ============================================================

/** Format "2026-03-17" → "Tuesday, March 17" */
function formatDateHeader(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    });
}

/** Summarize a set concisely: "225 × 8" or "BW × 12" or "30s" */
function formatSet(set: WorkoutSet): string {
    if (set.duration && !set.weight && !set.reps) {
        return `${set.duration}s`;
    }
    const weight = set.weight != null ? `${set.weight}` : 'BW';
    const reps = set.reps ?? '?';
    return `${weight} × ${reps}`;
}

// ============================================================
// Sub-components
// ============================================================

function SummaryBadge({
    icon,
    label,
    value,
}: {
    icon: keyof typeof MaterialIcons.glyphMap;
    label: string;
    value: string;
}) {
    return (
        <View style={styles.summaryBadge}>
            <MaterialIcons name={icon} size={16} color={colors.accent.primary} />
            <View style={styles.summaryBadgeContent}>
                <Text style={styles.summaryBadgeValue}>{value}</Text>
                <Text style={styles.summaryBadgeLabel}>{label}</Text>
            </View>
        </View>
    );
}

function SetRow({ set, isPR }: { set: WorkoutSet; isPR: boolean }) {
    return (
        <View style={styles.setRow}>
            <Text style={styles.setText}>{formatSet(set)}</Text>
            {isPR && <Text style={styles.prBadge}>🏆</Text>}
            {set.note ? (
                <Text style={styles.setNote} numberOfLines={1}>
                    {set.note}
                </Text>
            ) : null}
        </View>
    );
}

function ExerciseCard({
    exercise,
    prSetIds,
}: {
    exercise: WorkoutExercise;
    prSetIds: PRSetIds;
}) {
    // Show all sets (not just completed) for historical view
    const sets = exercise.sets;
    const completedCount = sets.filter((s) => s.status === 'completed').length;

    return (
        <View style={styles.exerciseCard}>
            <View style={styles.exerciseRowHeader}>
                <Text style={styles.exerciseName} numberOfLines={1}>
                    {exercise.exercise.name}
                </Text>
                <Text style={styles.exerciseSetsCount}>
                    {completedCount}/{sets.length} set{sets.length !== 1 ? 's' : ''}
                </Text>
            </View>

            {/* Individual sets */}
            {sets.map((set) => (
                <SetRow
                    key={set.id}
                    set={set}
                    isPR={prSetIds.has(set.id)}
                />
            ))}

            {/* Exercise note */}
            {exercise.note ? (
                <View style={styles.noteContainer}>
                    <Text style={styles.noteIcon}>📝</Text>
                    <Text style={styles.noteText} numberOfLines={3}>
                        {exercise.note}
                    </Text>
                </View>
            ) : null}
        </View>
    );
}

function WorkoutCard({
    workout,
    prSetIds,
    onEdit,
}: {
    workout: Workout;
    prSetIds: PRSetIds;
    onEdit: (workout: Workout) => void;
}) {
    const exercises = workout.main.exercises;

    return (
        <View style={styles.workoutCard}>
            <View style={styles.workoutCardHeader}>
                <Text style={styles.workoutName} numberOfLines={1}>
                    {workout.name}
                </Text>
                <Text style={styles.workoutDuration}>
                    {formatDuration(workout.totalDuration)}
                </Text>
            </View>

            {/* Workout note */}
            {workout.note ? (
                <View style={styles.workoutNoteContainer}>
                    <Text style={styles.noteIcon}>📝</Text>
                    <Text style={styles.noteText} numberOfLines={3}>
                        {workout.note}
                    </Text>
                </View>
            ) : null}

            {exercises.length > 0 ? (
                exercises.map((ex) => (
                    <ExerciseCard
                        key={ex.id}
                        exercise={ex}
                        prSetIds={prSetIds}
                    />
                ))
            ) : (
                <Text style={styles.emptyText}>No exercises recorded</Text>
            )}

            {/* Edit Workout button */}
            <TouchableOpacity
                style={styles.editButton}
                onPress={() => onEdit(workout)}
                activeOpacity={0.7}
            >
                <MaterialIcons name="edit" size={16} color={colors.accent.primary} />
                <Text style={styles.editButtonText}>Edit Workout</Text>
            </TouchableOpacity>
        </View>
    );
}

// ============================================================
// Main Component
// ============================================================

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function DailyWorkoutModal({ date, onClose }: DailyWorkoutModalProps) {
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [prSetIds, setPrSetIds] = useState<PRSetIds>(new Set());
    const [loading, setLoading] = useState(false);

    const handleEditWorkout = useCallback((workout: Workout) => {
        const { activeWorkout, loadWorkoutForEditing } = useWorkoutStore.getState();

        const doEdit = () => {
            loadWorkoutForEditing(workout);
            onClose();
            // Small delay to let modal close animation start
            setTimeout(() => navigateToTab('Workout'), 150);
        };

        if (activeWorkout) {
            Alert.alert(
                'Active Workout',
                'You have a workout in progress. Loading this workout will replace it. Continue?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Replace', style: 'destructive', onPress: doEdit },
                ],
            );
        } else {
            doEdit();
        }
    }, [onClose]);

    useEffect(() => {
        if (!date) return;

        let cancelled = false;

        (async () => {
            setLoading(true);
            const [data, prs] = await Promise.all([
                getWorkoutsForDate(date),
                getPRSetIdsForDate(date),
            ]);
            if (!cancelled) {
                setWorkouts(data);
                setPrSetIds(prs);
                setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [date]);

    if (!date) return null;

    // Compute day-level totals
    const totalVolume = workouts.reduce((sum, w) => sum + (w.totalVolume ?? 0), 0);
    const totalSets = workouts.reduce((sum, w) => sum + (w.totalSets ?? 0), 0);
    const totalDuration = workouts.reduce((sum, w) => sum + (w.totalDuration ?? 0), 0);

    return (
        <Modal
            visible={!!date}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            {/* Tap backdrop to close */}
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable
                    style={styles.sheet}
                    onPress={(e) => e.stopPropagation()}
                >
                    {/* Handle bar */}
                    <View style={styles.handleBar} />

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <Text style={styles.dateHeader}>
                                {formatDateHeader(date)}
                            </Text>
                            <Text style={styles.workoutCountText}>
                                {workouts.length} workout{workouts.length !== 1 ? 's' : ''}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <MaterialIcons
                                name="close"
                                size={22}
                                color={colors.text.secondary}
                            />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator
                                size="large"
                                color={colors.accent.primary}
                            />
                        </View>
                    ) : (
                        <ScrollView
                            contentContainerStyle={styles.contentContainer}
                            showsVerticalScrollIndicator={true}
                            bounces={false}
                            nestedScrollEnabled={true}
                            style={{ flexShrink: 1 }}
                        >
                            {/* Summary badges */}
                            <View style={styles.summaryRow}>
                                <SummaryBadge
                                    icon="fitness-center"
                                    label="Volume"
                                    value={formatVolume(totalVolume)}
                                />
                                <SummaryBadge
                                    icon="format-list-numbered"
                                    label="Sets"
                                    value={String(totalSets)}
                                />
                                <SummaryBadge
                                    icon="schedule"
                                    label="Duration"
                                    value={formatDuration(totalDuration)}
                                />
                            </View>

                            {/* Workout cards */}
                            {workouts.length > 0 ? (
                                workouts.map((w) => (
                                    <WorkoutCard
                                        key={w.id}
                                        workout={w}
                                        prSetIds={prSetIds}
                                        onEdit={handleEditWorkout}
                                    />
                                ))
                            ) : (
                                <Text style={styles.emptyText}>
                                    No workouts found for this day
                                </Text>
                            )}
                        </ScrollView>
                    )}
                </Pressable>
            </Pressable>
        </Modal>
    );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: colors.background.primary,
        borderTopLeftRadius: borderRadius['3xl'],
        borderTopRightRadius: borderRadius['3xl'],
        maxHeight: SCREEN_HEIGHT * 0.9,
        minHeight: 200,
        paddingBottom: spacing.xl,
    },
    handleBar: {
        width: 40,
        height: 4,
        backgroundColor: colors.text.disabled,
        borderRadius: borderRadius.full,
        alignSelf: 'center',
        marginTop: spacing.sm,
        marginBottom: spacing.xs,
    },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerLeft: {
        flex: 1,
    },
    dateHeader: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    workoutCountText: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        marginTop: 2,
    },
    closeButton: {
        padding: spacing.xs,
        borderRadius: borderRadius.full,
        backgroundColor: colors.background.tertiary,
    },

    // Content
    contentContainer: {
        padding: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.xxl,
    },
    loadingContainer: {
        padding: spacing.xxl,
        alignItems: 'center',
    },

    // Summary badges
    summaryRow: {
        flexDirection: 'row',
        marginBottom: spacing.lg,
        gap: spacing.sm,
    },
    summaryBadge: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.sm,
        gap: spacing.xs,
    },
    summaryBadgeContent: {
        flex: 1,
    },
    summaryBadgeValue: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
    },
    summaryBadgeLabel: {
        fontSize: typography.size.xs,
        color: colors.text.secondary,
    },

    // Workout card
    workoutCard: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    workoutCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
        paddingBottom: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    workoutName: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
        color: colors.accent.primary,
        flex: 1,
    },
    workoutDuration: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        marginLeft: spacing.sm,
    },

    // Workout note
    workoutNoteContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'rgba(168, 85, 247, 0.08)',
        borderRadius: borderRadius.md,
        padding: spacing.sm,
        marginBottom: spacing.sm,
        gap: spacing.xs,
    },

    // Exercise card
    exerciseCard: {
        paddingVertical: spacing.xs + 2,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
    },
    exerciseRowHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    exerciseName: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
        flex: 1,
    },
    exerciseSetsCount: {
        fontSize: typography.size.xs,
        color: colors.text.secondary,
        marginLeft: spacing.sm,
    },

    // Individual set row
    setRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 2,
        paddingLeft: spacing.sm,
        gap: spacing.xs,
    },
    setText: {
        fontSize: typography.size.xs,
        color: colors.text.secondary,
        fontVariant: ['tabular-nums'],
    },
    prBadge: {
        fontSize: 10,
    },
    setNote: {
        fontSize: typography.size.xs,
        color: colors.text.disabled,
        flex: 1,
        marginLeft: spacing.xs,
        fontStyle: 'italic',
    },

    // Note containers
    noteContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'rgba(168, 85, 247, 0.08)',
        borderRadius: borderRadius.sm,
        padding: spacing.xs,
        marginTop: spacing.xs,
        gap: spacing.xs,
    },
    noteIcon: {
        fontSize: 12,
    },
    noteText: {
        fontSize: typography.size.xs,
        color: colors.text.secondary,
        flex: 1,
        fontStyle: 'italic',
    },

    // Empty state
    emptyText: {
        fontSize: typography.size.sm,
        color: colors.text.disabled,
        textAlign: 'center',
        paddingVertical: spacing.lg,
    },

    // Edit button
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        marginTop: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.accent.primary,
        backgroundColor: 'rgba(168, 85, 247, 0.08)',
    },
    editButtonText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.accent.primary,
    },
});
