/**
 * TemplateCard Component
 * 
 * Displays a workout template with exercise preview.
 * Tap to start a workout from this template.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Template } from '../services/templateService';
import { colors, spacing, borderRadius, typography } from '../theme';

interface TemplateCardProps {
    template: Template;
    onPress: () => void;
    onDelete?: () => void;
}

export default function TemplateCard({ template, onPress, onDelete }: TemplateCardProps) {
    // Get muscle groups from exercises
    const muscleGroups = new Set<string>();
    template.exercises.forEach(ex => {
        ex.exercise.muscleGroups.forEach(mg => {
            if (mg.isPrimary) {
                muscleGroups.add(mg.muscle.replace('_', ' '));
            }
        });
    });
    const muscleList = Array.from(muscleGroups).slice(0, 3).join(', ');

    // Format last used
    const formatLastUsed = (): string => {
        if (!template.lastUsedAt) return 'Never used';

        const now = new Date();
        const diff = now.getTime() - template.lastUsedAt.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'Used today';
        if (days === 1) return 'Used yesterday';
        if (days < 7) return `${days} days ago`;
        if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
        return `${Math.floor(days / 30)} months ago`;
    };

    // Get exercise names preview
    const exercisePreview = template.exercises
        .slice(0, 4)
        .map(ex => ex.exercise.name)
        .join(' • ');

    return (
        <TouchableOpacity style={styles.card} onPress={onPress}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={styles.name}>{template.name}</Text>
                    <Text style={styles.meta}>
                        {template.exerciseCount} exercises • {formatLastUsed()}
                    </Text>
                </View>
                {onDelete && (
                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                    >
                        <Text style={styles.deleteIcon}>×</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Muscle tags */}
            {muscleList && (
                <View style={styles.muscleRow}>
                    <Text style={styles.muscleText}>{muscleList}</Text>
                </View>
            )}

            {/* Exercise preview */}
            <Text style={styles.exercisePreview} numberOfLines={1}>
                {exercisePreview}
            </Text>

            {/* Use count badge */}
            {template.useCount > 0 && (
                <View style={styles.useBadge}>
                    <Text style={styles.useBadgeText}>
                        Used {template.useCount}x
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    headerLeft: {
        flex: 1,
    },
    name: {
        color: colors.text.primary,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        marginBottom: spacing.xs,
    },
    meta: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
    },
    deleteButton: {
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteIcon: {
        color: colors.text.secondary,
        fontSize: typography.size.xl,
    },

    muscleRow: {
        marginTop: spacing.sm,
    },
    muscleText: {
        color: colors.accent.primary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
    },

    exercisePreview: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        marginTop: spacing.sm,
    },

    useBadge: {
        position: 'absolute',
        top: spacing.md,
        right: spacing.md,
        backgroundColor: colors.background.tertiary,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: borderRadius.sm,
    },
    useBadgeText: {
        color: colors.text.secondary,
        fontSize: typography.size.xs,
    },
});
