/**
 * GoalCard Component
 *
 * Displays an active goal with:
 * - Title row: name + target value + deadline badge
 * - Optional custom label (dimmed/italic)
 * - Purple gradient progress bar
 * - Numbers: current_best / target_value + percentage
 * - Deadline warning badges (green → amber → red → overdue)
 *
 * Used in the Active tab of GoalsScreen.
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing, borderRadius, typography } from '../../theme';
import type { Goal } from '../../models';
import { getProgressPercent, formatTitle } from './goalUtils';

// ============================================================
// Types
// ============================================================

export interface GoalDisplayInfo {
    /** Resolved name (e.g., "Barbell Squat", "Bodyweight") */
    name: string;
    /** Metric suffix for exercise goals (e.g., "1RM", "Volume", "Reps") */
    metricLabel: string;
    /** Unit string (e.g., "lbs", "kg", "in") */
    unit: string;
}

interface GoalCardProps {
    goal: Goal;
    displayInfo: GoalDisplayInfo;
    onPress?: () => void;
    onLongPress?: () => void;
}

// ============================================================
// Helpers
// ============================================================

function getDeadlineBadge(goal: Goal): { text: string; color: string } | null {
    if (!goal.deadline) return null;

    const now = new Date();
    const deadline = new Date(goal.deadline);
    const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
        return { text: '⏰ Overdue', color: colors.accent.error };
    }

    // Linear projection warning
    const daysElapsed = Math.ceil(
        (now.getTime() - new Date(goal.createdAt).getTime()) / (1000 * 60 * 60 * 24),
    );
    const currentBest = goal.currentBest ?? goal.startingValue ?? 0;
    const startingValue = goal.startingValue ?? 0;
    const dailyRate = daysElapsed > 0 ? (currentBest - startingValue) / daysElapsed : 0;
    const projected = currentBest + dailyRate * daysLeft;
    const isOffTrack = projected < goal.targetValue;

    if (daysLeft <= 7) {
        return {
            text: `${daysLeft}d left`,
            color: isOffTrack ? colors.accent.error : colors.accent.warning,
        };
    }
    const weeksLeft = Math.ceil(daysLeft / 7);
    return {
        text: `${weeksLeft}w left`,
        color: isOffTrack ? colors.accent.warning : colors.text.secondary,
    };
}

// ============================================================
// Component
// ============================================================

export default React.memo(function GoalCard({ goal, displayInfo, onPress, onLongPress }: GoalCardProps) {
    const percent = getProgressPercent(goal);
    const badge = getDeadlineBadge(goal);

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={onPress}
            onLongPress={onLongPress}
            activeOpacity={0.7}
            delayLongPress={400}
        >
            {/* Header row */}
            <View style={styles.header}>
                <Text style={styles.title} numberOfLines={1}>
                    {formatTitle(goal, displayInfo)}
                </Text>
                {badge && (
                    <View style={[styles.badge, { backgroundColor: badge.color + '20' }]}>
                        <Text style={[styles.badgeText, { color: badge.color }]}>
                            {badge.text}
                        </Text>
                    </View>
                )}
            </View>

            {/* Custom label */}
            {goal.label && (
                <Text style={styles.label} numberOfLines={1}>
                    "{goal.label}"
                </Text>
            )}

            {/* Progress bar */}
            <View style={styles.barContainer}>
                <View style={styles.barTrack}>
                    <LinearGradient
                        colors={colors.gradient.primary}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.barFill, { width: `${Math.max(percent, 2)}%` }]}
                    />
                </View>
            </View>

            {/* Numbers row */}
            <View style={styles.numbers}>
                <Text style={styles.progressText}>
                    {goal.currentBest ?? 0} / {goal.targetValue} {displayInfo.unit}
                </Text>
                <Text style={styles.percentText}>{percent}%</Text>
            </View>
        </TouchableOpacity>
    );
});

// Re-export helpers for testing
export { getDeadlineBadge };

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.xs,
    },
    title: {
        flex: 1,
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
    },
    label: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        fontStyle: 'italic',
        marginBottom: spacing.sm,
    },

    // Deadline badge
    badge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
        marginLeft: spacing.sm,
    },
    badgeText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.semibold,
    },

    // Progress bar
    barContainer: {
        marginBottom: spacing.xs,
    },
    barTrack: {
        height: 8,
        backgroundColor: colors.background.tertiary,
        borderRadius: 4,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        borderRadius: 4,
    },

    // Numbers
    numbers: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    progressText: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
    },
    percentText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.accent.primary,
    },
});
