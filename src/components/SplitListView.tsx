/**
 * SplitListView Component
 *
 * Renders the browsable list of splits, separated into "Your Splits" and "Pre-made Splits"
 * sections. Includes a "No Split" option, empty state, and long-press hint.
 *
 * Extracted from SplitsScreen to isolate the list rendering from form logic.
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    RefreshControl,
} from 'react-native';
import { Split } from '../models/split';
import { colors, spacing, borderRadius, typography } from '../theme';

interface SplitListViewProps {
    splits: Split[];
    activeSplit: Split | null;
    isLoading: boolean;
    onSelectSplit: (split: Split | null) => void;
    onEditSplit: (split: Split) => void;
    onToggleFavorite: (splitId: string) => void;
    onRefresh: () => void;
}

export default function SplitListView({
    splits,
    activeSplit,
    isLoading,
    onSelectSplit,
    onEditSplit,
    onToggleFavorite,
    onRefresh,
}: SplitListViewProps) {

    const renderSplitCard = (split: Split) => {
        const isActive = activeSplit?.id === split.id;

        return (
            <TouchableOpacity
                key={split.id}
                style={[styles.splitCard, isActive && styles.splitCardActive]}
                onPress={() => onSelectSplit(split)}
                onLongPress={() => onEditSplit(split)}
            >
                <View style={styles.splitHeader}>
                    <Text style={styles.splitName}>{split.name}</Text>
                    <TouchableOpacity
                        style={styles.starButton}
                        onPress={() => onToggleFavorite(split.id)}
                    >
                        <Text style={[styles.starButtonText, split.isFavorite && styles.starButtonActive]}>
                            {split.isFavorite ? '★' : '☆'}
                        </Text>
                    </TouchableOpacity>
                    {isActive && <Text style={styles.activeLabel}>Active</Text>}
                    {split.isBuiltIn && <Text style={styles.builtInLabel}>Pre-made</Text>}
                </View>
                {split.description && (
                    <Text style={styles.splitDescription}>{split.description}</Text>
                )}
                <Text style={styles.splitTemplates}>
                    {(() => {
                        const workouts = split.schedule.filter(item => item.type === 'template').length;
                        const restDays = split.schedule.filter(item => item.type === 'rest').length;
                        let text = `${workouts} workout${workouts !== 1 ? 's' : ''}`;
                        if (restDays > 0) {
                            text += ` · ${restDays} rest day${restDays !== 1 ? 's' : ''}`;
                        }
                        return text;
                    })()}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
                <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
            }
        >
            {/* Clear selection option */}
            <TouchableOpacity
                style={[styles.splitCard, !activeSplit && styles.splitCardActive]}
                onPress={() => onSelectSplit(null)}
            >
                <Text style={styles.splitName}>No Split (Show All Templates)</Text>
                <Text style={styles.splitDescription}>
                    Display all templates without grouping
                </Text>
            </TouchableOpacity>

            {/* User splits */}
            {splits.filter(s => !s.isBuiltIn).length > 0 && (
                <>
                    <Text style={styles.sectionTitle}>Your Splits</Text>
                    {splits.filter(s => !s.isBuiltIn)
                        .sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0))
                        .map(renderSplitCard)}
                </>
            )}

            {/* Built-in splits */}
            {splits.filter(s => s.isBuiltIn).length > 0 && (
                <>
                    <Text style={styles.sectionTitle}>Pre-made Splits</Text>
                    {splits.filter(s => s.isBuiltIn)
                        .sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0))
                        .map(renderSplitCard)}
                </>
            )}

            {splits.length === 0 && !isLoading && (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>📋</Text>
                    <Text style={styles.emptyTitle}>No Splits Yet</Text>
                    <Text style={styles.emptySubtitle}>
                        Create templates first, then group them into splits
                    </Text>
                </View>
            )}

            <Text style={styles.hint}>
                Long-press a split to edit it
            </Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.md,
        paddingBottom: spacing.xxl,
    },
    sectionTitle: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    splitCard: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    splitCardActive: {
        borderColor: colors.accent.primary,
    },
    splitHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    splitName: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
        flex: 1,
    },
    activeLabel: {
        color: colors.accent.primary,
        fontSize: typography.size.xs,
        fontWeight: typography.weight.medium,
        backgroundColor: colors.accent.primary + '20',
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
        marginLeft: spacing.sm,
    },
    starButton: {
        padding: spacing.xs,
        marginLeft: spacing.xs,
    },
    starButtonText: {
        color: colors.text.secondary,
        fontSize: 18,
    },
    starButtonActive: {
        color: colors.accent.warning,
    },
    builtInLabel: {
        color: colors.text.disabled,
        fontSize: typography.size.xs,
        marginLeft: spacing.sm,
    },
    splitDescription: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        marginBottom: spacing.xs,
    },
    splitTemplates: {
        color: colors.text.disabled,
        fontSize: typography.size.sm,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: spacing.md,
    },
    emptyTitle: {
        color: colors.text.primary,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        marginBottom: spacing.sm,
    },
    emptySubtitle: {
        color: colors.text.secondary,
        fontSize: typography.size.md,
        textAlign: 'center',
    },
    hint: {
        color: colors.text.disabled,
        fontSize: typography.size.sm,
        textAlign: 'center',
        marginTop: spacing.lg,
        marginBottom: spacing.lg,
    },
});
