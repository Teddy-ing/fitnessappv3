/**
 * MuscleDistributionChart Component
 *
 * Horizontal bar chart showing muscle group breakdown weighted by
 * the selected metric's contribution percentage.
 *
 * Fetches data from analyticsService.getMuscleDistribution()
 * and re-fetches when the metric or chart range changes.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { colors, spacing, borderRadius, typography } from '../theme';
import { getMuscleDistribution } from '../services/analyticsService';
import { MetricType, ChartRange, MuscleDistributionPoint } from '../models/analytics';

interface MuscleDistributionChartProps {
    metric: MetricType;
    range: ChartRange;
}

/** Pretty-print muscle group names */
const MUSCLE_LABELS: Record<string, string> = {
    chest: 'Chest',
    back: 'Back',
    shoulders: 'Shoulders',
    biceps: 'Biceps',
    triceps: 'Triceps',
    forearms: 'Forearms',
    core: 'Core',
    quads: 'Quads',
    hamstrings: 'Hamstrings',
    glutes: 'Glutes',
    calves: 'Calves',
    traps: 'Traps',
    lats: 'Lats',
    neck: 'Neck',
    hip_flexors: 'Hip Flexors',
    adductors: 'Adductors',
    abductors: 'Abductors',
    full_body: 'Full Body',
};

/** Accent colors for up to 12 bars (rotating palette) */
const BAR_COLORS = [
    colors.accent.primary,     // Purple
    '#8b5cf6',                 // Violet
    '#6366f1',                 // Indigo
    '#3b82f6',                 // Blue
    '#06b6d4',                 // Cyan
    '#14b8a6',                 // Teal
    '#22c55e',                 // Green
    '#eab308',                 // Yellow
    '#f97316',                 // Orange
    '#ef4444',                 // Red
    '#ec4899',                 // Pink
    '#a855f7',                 // Purple variant
];

export default function MuscleDistributionChart({
    metric,
    range,
}: MuscleDistributionChartProps) {
    const [data, setData] = useState<MuscleDistributionPoint[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);

        getMuscleDistribution(metric, range).then((result) => {
            if (!cancelled) {
                setData(result);
                setLoading(false);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [metric, range]);

    if (loading || data.length === 0) {
        return null; // Don't render section if no data
    }

    const maxValue = data[0]?.value ?? 1;

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Muscle Distribution</Text>
            <View style={styles.chartContainer}>
                {data.map((point, index) => {
                    const percentage = maxValue > 0 ? (point.value / maxValue) * 100 : 0;
                    const barColor = BAR_COLORS[index % BAR_COLORS.length];
                    const label = MUSCLE_LABELS[point.muscleGroup] ?? point.muscleGroup;

                    return (
                        <View key={point.muscleGroup} style={styles.barRow}>
                            <Text style={styles.barLabel} numberOfLines={1}>
                                {label}
                            </Text>
                            <View style={styles.barTrack}>
                                <View
                                    style={[
                                        styles.barFill,
                                        {
                                            width: `${Math.max(percentage, 2)}%`,
                                            backgroundColor: barColor,
                                        },
                                    ]}
                                />
                            </View>
                            <Text style={styles.barValue}>
                                {formatValue(point.value, metric)}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

function formatValue(value: number, metric: MetricType): string {
    switch (metric) {
        case 'volume':
            return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value);
        default:
            return String(value);
    }
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
    chartContainer: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.xl,
        padding: spacing.md,
        gap: spacing.sm,
    },
    barRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    barLabel: {
        width: 80,
        fontSize: typography.size.xs,
        color: colors.text.secondary,
        textAlign: 'right',
    },
    barTrack: {
        flex: 1,
        height: 16,
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.sm,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        borderRadius: borderRadius.sm,
    },
    barValue: {
        width: 48,
        fontSize: typography.size.xs,
        color: colors.text.secondary,
        textAlign: 'right',
    },
});
