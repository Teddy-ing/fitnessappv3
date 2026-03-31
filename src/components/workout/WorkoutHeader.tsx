/**
 * WorkoutHeader Component
 *
 * Title bar with Discard/Finish buttons, settings menu trigger,
 * and live stats row (Duration, Exercises, Sets, Volume).
 *
 * Extracted from WorkoutScreen to reduce component size (TD-030).
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { formatElapsedTime } from '../../hooks';
import { formatCompactVolume } from '../../utils/formatters';

interface WorkoutStats {
    exercises: number;
    sets: number;
    volume: number;
}

interface WorkoutHeaderProps {
    title: string;
    isEditMode: boolean;
    elapsedTime: number;
    originalDuration: number | null;
    stats: WorkoutStats;
    onDiscard: () => void;
    onFinish: () => void;
    onSettingsPress: () => void;
}

export default function WorkoutHeader({
    title,
    isEditMode,
    elapsedTime,
    originalDuration,
    stats,
    onDiscard,
    onFinish,
    onSettingsPress,
}: WorkoutHeaderProps) {
    return (
        <View style={styles.header}>
            <View style={styles.headerTop}>
                <TouchableOpacity onPress={onDiscard}>
                    <Text style={styles.discardButton}>
                        {isEditMode ? 'Cancel' : 'Discard'}
                    </Text>
                </TouchableOpacity>
                <Text style={styles.title}>
                    {isEditMode ? `Editing: ${title}` : title}
                </Text>
                <View style={styles.headerRight}>
                    <TouchableOpacity
                        style={styles.settingsButton}
                        onPress={onSettingsPress}
                    >
                        <Text style={styles.settingsIcon}>⋮</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onFinish}>
                        <Text style={styles.finishButton}>
                            {isEditMode ? 'Save' : 'Finish'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
                <View style={styles.stat}>
                    <Text style={styles.statValue}>
                        {isEditMode
                            ? formatElapsedTime(originalDuration ?? 0)
                            : formatElapsedTime(elapsedTime)}
                    </Text>
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
                        {formatCompactVolume(stats.volume)}
                    </Text>
                    <Text style={styles.statLabel}>Volume</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        backgroundColor: colors.background.secondary,
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
        paddingBottom: spacing.lg,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    settingsButton: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingsIcon: {
        fontSize: typography.size.xl,
        color: colors.text.primary,
        fontWeight: typography.weight.bold,
    },
    discardButton: {
        color: colors.accent.error,
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
    },
    title: {
        color: colors.text.primary,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
    },
    finishButton: {
        color: colors.accent.success,
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
    },
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
});
