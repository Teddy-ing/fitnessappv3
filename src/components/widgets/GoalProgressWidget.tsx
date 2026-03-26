/**
 * Goal Progress Widget (Square)
 *
 * Shows a circular progress ring for the user's top active goal.
 * Displays goal label, progress percentage, and current vs target values.
 * Tap → navigate to Goals screen.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Svg, Circle } from 'react-native-svg';
import { colors, spacing, typography } from '../../theme';
import { Goal } from '../../models/goal';

interface GoalProgressWidgetProps {
    goal: Goal | null;
}

const RING_SIZE = 68;
const STROKE_WIDTH = 6;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function GoalProgressWidget({ goal }: GoalProgressWidgetProps) {
    if (!goal) {
        return (
            <View style={styles.container}>
                <View style={styles.emptyIcon}>
                    <MaterialIcons name="flag" size={24} color={colors.text.disabled} />
                </View>
                <Text style={styles.emptyText}>No active goal</Text>
                <Text style={styles.emptySubtext}>Tap to set one</Text>
            </View>
        );
    }

    // Calculate progress (0 to 1)
    const current = goal.currentBest ?? goal.startingValue ?? 0;
    const starting = goal.startingValue ?? 0;
    const target = goal.targetValue;
    const totalRange = Math.abs(target - starting);
    const progress = totalRange > 0
        ? Math.min(Math.max(Math.abs(current - starting) / totalRange, 0), 1)
        : 0;
    const progressPercent = Math.round(progress * 100);

    const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

    // Determine accent color based on progress
    const progressColor = progressPercent >= 100
        ? '#22c55e'
        : progressPercent >= 50
            ? colors.accent.primary
            : '#f59e0b';

    // Build display label
    const displayLabel = goal.label || formatGoalType(goal.goalType);

    return (
        <View style={styles.container}>
            <View style={styles.ringContainer}>
                <Svg width={RING_SIZE} height={RING_SIZE}>
                    {/* Background ring */}
                    <Circle
                        cx={RING_SIZE / 2}
                        cy={RING_SIZE / 2}
                        r={RADIUS}
                        stroke={colors.background.tertiary}
                        strokeWidth={STROKE_WIDTH}
                        fill="none"
                    />
                    {/* Progress ring */}
                    <Circle
                        cx={RING_SIZE / 2}
                        cy={RING_SIZE / 2}
                        r={RADIUS}
                        stroke={progressColor}
                        strokeWidth={STROKE_WIDTH}
                        fill="none"
                        strokeDasharray={CIRCUMFERENCE}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        rotation="-90"
                        origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
                    />
                </Svg>
                <Text style={[styles.percentText, { color: progressColor }]}>
                    {progressPercent}%
                </Text>
            </View>
            <Text style={styles.label} numberOfLines={1} ellipsizeMode="tail">
                {displayLabel}
            </Text>
        </View>
    );
}

function formatGoalType(type: string): string {
    switch (type) {
        case 'exercise_1rm': return '1RM Goal';
        case 'exercise_volume': return 'Volume Goal';
        case 'exercise_reps': return 'Reps Goal';
        case 'measurement': return 'Measurement';
        case 'consistency': return 'Consistency';
        default: return 'Goal';
    }
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    ringContainer: {
        width: RING_SIZE,
        height: RING_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xs,
    },
    percentText: {
        position: 'absolute',
        fontSize: typography.size.md,
        fontWeight: typography.weight.bold,
    },
    label: {
        fontSize: typography.size.xs,
        color: colors.text.secondary,
        textAlign: 'center',
        maxWidth: '100%',
    },
    emptyIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.background.tertiary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    emptyText: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        fontWeight: typography.weight.medium,
    },
    emptySubtext: {
        fontSize: typography.size.xs,
        color: colors.text.disabled,
        marginTop: 2,
    },
});
