/**
 * CompletedGoalCard Component
 *
 * Displays a completed (trophy case) goal with:
 * - Trophy emoji + title
 * - Optional custom label
 * - Achievement date + start date range
 * - 100% gold-accent progress bar
 *
 * Used in the Trophy Case tab of GoalsScreen.
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
import type { GoalDisplayInfo } from './GoalCard';

// ============================================================
// Helpers
// ============================================================

const GOLD_GRADIENT = ['#f59e0b', '#eab308'] as const;
const GOLD_COLOR = '#f59e0b';

function formatDate(isoStr: string): string {
    return new Date(isoStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function formatTitle(goal: Goal, info: GoalDisplayInfo): string {
    if (goal.goalType === 'consistency') {
        return `${goal.targetValue} Workouts`;
    }
    const suffix = info.metricLabel ? ` ${info.metricLabel}` : '';
    return `${info.name}${suffix}: ${goal.targetValue} ${info.unit}`;
}

// ============================================================
// Component
// ============================================================

interface CompletedGoalCardProps {
    goal: Goal;
    displayInfo: GoalDisplayInfo;
    onPress?: () => void;
    onLongPress?: () => void;
}

export default function CompletedGoalCard({
    goal,
    displayInfo,
    onPress,
    onLongPress,
}: CompletedGoalCardProps) {
    return (
        <TouchableOpacity
            style={styles.card}
            onPress={onPress}
            onLongPress={onLongPress}
            activeOpacity={0.7}
            delayLongPress={400}
        >
            {/* Header */}
            <Text style={styles.title} numberOfLines={1}>
                🏆 {formatTitle(goal, displayInfo)}
            </Text>

            {/* Custom label */}
            {goal.label && (
                <Text style={styles.label} numberOfLines={1}>
                    "{goal.label}"
                </Text>
            )}

            {/* Date range */}
            <Text style={styles.dateRange}>
                {goal.completedAt
                    ? `Achieved: ${formatDate(goal.completedAt)}`
                    : ''}
                {goal.completedAt && goal.createdAt
                    ? `  ·  Started: ${formatDate(goal.createdAt)}`
                    : ''}
            </Text>

            {/* 100% gold progress bar */}
            <View style={styles.barContainer}>
                <View style={styles.barTrack}>
                    <LinearGradient
                        colors={GOLD_GRADIENT}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.barFill, { width: '100%' }]}
                    />
                </View>
            </View>

            {/* Numbers */}
            <View style={styles.numbers}>
                <Text style={styles.progressText}>
                    {goal.currentBest ?? goal.targetValue} / {goal.targetValue} {displayInfo.unit}
                </Text>
                <Text style={[styles.percentText, { color: GOLD_COLOR }]}>100%</Text>
            </View>
        </TouchableOpacity>
    );
}

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
    title: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    label: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        fontStyle: 'italic',
        marginBottom: spacing.xs,
    },
    dateRange: {
        fontSize: typography.size.xs,
        color: colors.text.secondary,
        marginBottom: spacing.sm,
    },
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
    },
});
