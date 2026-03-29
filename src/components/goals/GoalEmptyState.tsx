/**
 * GoalEmptyState
 *
 * Empty state view for the Goals Active tab.
 * Displays motivational message, quick-add chips, and custom goal button.
 *
 * Extracted from GoalsScreen (TD-016).
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, spacing, borderRadius, typography } from '../../theme';
import type { PrefillParams } from '../../hooks/useGoalCreation';
import { getWeightUnitSync } from '../../hooks/useWeightUnit';

// ============================================================
// Quick-add chip definitions
// ============================================================

const QUICK_ADD_CHIPS: { label: string; emoji: string; prefill: PrefillParams }[] = [
    {
        label: `Bench 135 ${getWeightUnitSync()}`,
        emoji: '🏋️',
        prefill: { category: 'exercise', exerciseMetric: 'exercise_1rm', targetValue: '135' },
    },
    {
        label: 'Squat 1.5× BW',
        emoji: '🦵',
        prefill: { category: 'exercise', exerciseMetric: 'exercise_1rm' },
    },
    {
        label: 'Deadlift 2× BW',
        emoji: '💪',
        prefill: { category: 'exercise', exerciseMetric: 'exercise_1rm' },
    },
    {
        label: '30 Day Streak',
        emoji: '🔥',
        prefill: { category: 'consistency', targetValue: '30' },
    },
];

// ============================================================
// Props
// ============================================================

interface GoalEmptyStateProps {
    onQuickAdd: (prefill: PrefillParams) => void;
    onCreateCustom: () => void;
}

// ============================================================
// Component
// ============================================================

export default function GoalEmptyState({ onQuickAdd, onCreateCustom }: GoalEmptyStateProps) {
    return (
        <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🎯</Text>
            <Text style={styles.emptyTitle}>What are we aiming for?</Text>
            <Text style={styles.emptySubtitle}>
                Set a target and watch your progress
            </Text>

            {/* Quick-add chips */}
            <View style={styles.chipGrid}>
                {QUICK_ADD_CHIPS.map((chip) => (
                    <TouchableOpacity
                        key={chip.label}
                        style={styles.quickAddChip}
                        activeOpacity={0.7}
                        onPress={() => onQuickAdd(chip.prefill)}
                    >
                        <Text style={styles.chipEmoji}>{chip.emoji}</Text>
                        <Text style={styles.chipLabel}>{chip.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity
                style={styles.createCustomButton}
                activeOpacity={0.7}
                onPress={onCreateCustom}
            >
                <MaterialIcons name="add" size={18} color={colors.accent.primary} />
                <Text style={styles.createCustomText}>Create Custom Goal</Text>
            </TouchableOpacity>
        </View>
    );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    emptyEmoji: {
        fontSize: 48,
        marginBottom: spacing.md,
    },
    emptyTitle: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    emptySubtitle: {
        fontSize: typography.size.md,
        color: colors.text.secondary,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    chipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    quickAddChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.xl,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderWidth: 1,
        borderColor: colors.glass.border,
    },
    chipEmoji: {
        fontSize: 16,
        marginRight: spacing.xs,
    },
    chipLabel: {
        fontSize: typography.size.sm,
        color: colors.text.primary,
        fontWeight: typography.weight.medium,
    },
    createCustomButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    createCustomText: {
        fontSize: typography.size.md,
        color: colors.accent.primary,
        fontWeight: typography.weight.semibold,
        marginLeft: spacing.xs,
    },
});
