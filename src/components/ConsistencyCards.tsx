/**
 * ConsistencyCards Component
 *
 * Displays four summary stat cards in a 2×2 grid:
 * Total Workouts, Active Days, Current Streak, Avg/Week.
 *
 * Fetches data from analyticsService.getConsistencyStats()
 * and re-fetches when the chart range changes.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { colors, spacing, borderRadius, typography } from '../theme';
import { getConsistencyStats } from '../services/analyticsService';
import { ChartRange, ConsistencyStats } from '../models/analytics';

interface ConsistencyCardsProps {
    range: ChartRange;
}

export default function ConsistencyCards({ range }: ConsistencyCardsProps) {
    const [stats, setStats] = useState<ConsistencyStats>({
        totalWorkouts: 0,
        activeDays: 0,
        currentStreak: 0,
        avgPerWeek: 0,
    });

    useEffect(() => {
        let cancelled = false;

        getConsistencyStats(range).then((result) => {
            if (!cancelled) setStats(result);
        });

        return () => {
            cancelled = true;
        };
    }, [range]);

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Consistency</Text>
            <View style={styles.grid}>
                <StatCard
                    icon="🏋️"
                    value={String(stats.totalWorkouts)}
                    label="Workouts"
                />
                <StatCard
                    icon="📅"
                    value={String(stats.activeDays)}
                    label="Active Days"
                />
                <StatCard
                    icon="🔥"
                    value={stats.currentStreak > 0 ? String(stats.currentStreak) : '—'}
                    label="Week Streak"
                />
                <StatCard
                    icon="📊"
                    value={stats.avgPerWeek > 0 ? `${stats.avgPerWeek}` : '—'}
                    label="Avg / Week"
                />
            </View>
        </View>
    );
}

function StatCard({
    icon,
    value,
    label,
}: {
    icon: string;
    value: string;
    label: string;
}) {
    return (
        <View style={styles.card}>
            <Text style={styles.cardIcon}>{icon}</Text>
            <Text style={styles.cardValue}>{value}</Text>
            <Text style={styles.cardLabel}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: spacing.lg,
    },
    sectionTitle: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.text.secondary,
        letterSpacing: 0.5,
        marginBottom: spacing.sm,
        marginLeft: spacing.xs,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    card: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: 'center',
        gap: spacing.xs,
    },
    cardIcon: {
        fontSize: 20,
    },
    cardValue: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        color: colors.accent.primary,
    },
    cardLabel: {
        fontSize: typography.size.xs,
        color: colors.text.secondary,
    },
});
