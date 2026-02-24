/**
 * WeeklyTracker Component
 * 
 * Displays a M-S row of day circles showing workout completion status.
 * Shows rest indicator for today if current split position is a rest day.
 * 
 * States:
 * - Completed: purple filled circle with check icon
 * - Rest day: dark circle with "Rest" label (today only)
 * - Today: highlighted border circle
 * - Future: dim empty circle
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme';

type SplitScheduleItem = { type: 'template'; templateId: string } | { type: 'rest' };

interface WeeklyTrackerProps {
    /** Dates that had completed workouts this week */
    workoutDates: Date[];
    /** The split schedule (template/rest items) — used to determine rest days */
    splitSchedule: SplitScheduleItem[];
    /** Current position in the split schedule (0-indexed) */
    currentScheduleIndex: number;
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function WeeklyTracker({
    workoutDates,
    splitSchedule,
    currentScheduleIndex,
}: WeeklyTrackerProps) {
    const now = new Date();
    // Convert JS day (0=Sun) to our Mon-based index (0=Mon..6=Sun)
    const jsDayOfWeek = now.getDay();
    const todayIndex = jsDayOfWeek === 0 ? 6 : jsDayOfWeek - 1;

    // Check if today's split position is a rest day
    const isTodayRestDay = splitSchedule.length > 0
        && splitSchedule[currentScheduleIndex]?.type === 'rest';

    // Build a set of weekday indices (Mon=0..Sun=6) that had workouts
    const workoutDayIndices = new Set<number>();
    for (const d of workoutDates) {
        const jsDay = d.getDay();
        const idx = jsDay === 0 ? 6 : jsDay - 1;
        workoutDayIndices.add(idx);
    }

    return (
        <View style={styles.container}>
            {DAY_LABELS.map((label, dayIndex) => {
                const isToday = dayIndex === todayIndex;
                const isPast = dayIndex < todayIndex;
                const hasWorkout = workoutDayIndices.has(dayIndex);

                // Determine the visual state
                let state: 'completed' | 'rest' | 'today' | 'future';
                if (hasWorkout) {
                    state = 'completed';
                } else if (isToday && isTodayRestDay) {
                    state = 'rest';
                } else if (isToday) {
                    state = 'today';
                } else {
                    state = 'future'; // Past without workout or future — show dim
                }

                return (
                    <View key={dayIndex} style={styles.dayColumn}>
                        <Text style={[
                            styles.dayLabel,
                            isToday && styles.dayLabelToday,
                            state === 'completed' && styles.dayLabelCompleted,
                        ]}>
                            {label}
                        </Text>
                        <View style={[
                            styles.dayCircle,
                            state === 'completed' && styles.dayCircleCompleted,
                            state === 'rest' && styles.dayCircleRest,
                            state === 'today' && styles.dayCircleToday,
                            state === 'future' && styles.dayCircleFuture,
                        ]}>
                            {state === 'completed' ? (
                                <MaterialIcons name="check" size={16} color="#fff" />
                            ) : state === 'rest' ? (
                                <Text style={styles.restText}>Rest</Text>
                            ) : null}
                        </View>
                    </View>
                );
            })}
        </View>
    );
}


const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
    },
    dayColumn: {
        alignItems: 'center',
    },
    dayLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.text.secondary,
        marginBottom: spacing.xs,
    },
    dayLabelToday: {
        color: colors.text.primary,
    },
    dayLabelCompleted: {
        color: colors.accent.primary,
    },
    dayCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    dayCircleCompleted: {
        backgroundColor: colors.accent.primary,
        borderColor: colors.accent.primary,
    },
    dayCircleRest: {
        backgroundColor: colors.background.tertiary,
        borderColor: colors.background.tertiary,
    },
    dayCircleToday: {
        borderColor: colors.accent.primary,
        backgroundColor: 'transparent',
    },
    dayCircleFuture: {
        borderColor: colors.background.tertiary,
        backgroundColor: 'transparent',
    },
    restText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.text.secondary,
    },
});
