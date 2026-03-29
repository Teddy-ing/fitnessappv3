/**
 * MuscleDistributionChart Component
 *
 * Pie chart showing muscle group breakdown weighted by
 * the selected metric's contribution percentage.
 *
 * Fetches data from analyticsService.getMuscleDistribution()
 * and re-fetches when the metric or chart range changes.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

import { colors, spacing, borderRadius, typography } from '../theme';
import { getMuscleDistribution } from '../services/analyticsService';
import { MetricType, ChartRange, MuscleDistributionPoint } from '../models/analytics';
import { MUSCLE_LABELS } from '../models/muscleGroups';

interface MuscleDistributionChartProps {
    metric: MetricType;
    range: ChartRange;
}



/** Accent colors for pie slices (rotating palette) */
const SLICE_COLORS = [
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

const CHART_SIZE = Math.min(Dimensions.get('window').width - 80, 220);

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
        return null;
    }

    // Calculate total for percentage display
    const total = data.reduce((sum, d) => sum + d.value, 0);

    // Transform data for PieChart
    const pieData = data.map((point, index) => ({
        value: point.value,
        color: SLICE_COLORS[index % SLICE_COLORS.length],
        text: '',
    }));

    return (
        <View style={styles.container}>
            {/* Pie chart */}
            <View style={styles.chartWrapper}>
                <PieChart
                    data={pieData}
                    radius={CHART_SIZE / 2}
                    innerRadius={CHART_SIZE / 3.2}
                    innerCircleColor={colors.background.secondary}
                    centerLabelComponent={() => (
                        <View style={styles.centerLabel}>
                            <Text style={styles.centerValue}>{data.length}</Text>
                            <Text style={styles.centerSubtext}>muscles</Text>
                        </View>
                    )}
                />
            </View>

            {/* Legend */}
            <View style={styles.legend}>
                {data.map((point, index) => {
                    const label = MUSCLE_LABELS[point.muscleGroup as keyof typeof MUSCLE_LABELS] ?? point.muscleGroup;
                    const pct = total > 0 ? Math.round((point.value / total) * 100) : 0;
                    const sliceColor = SLICE_COLORS[index % SLICE_COLORS.length];

                    return (
                        <View key={point.muscleGroup} style={styles.legendRow}>
                            <View style={[styles.legendDot, { backgroundColor: sliceColor }]} />
                            <Text style={styles.legendLabel} numberOfLines={1}>
                                {label}
                            </Text>
                            <Text style={styles.legendValue}>
                                {pct}%
                            </Text>
                            <Text style={styles.legendRaw}>
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
            return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(Math.round(value));
        default:
            return String(Math.round(value));
    }
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.xl,
        padding: spacing.md,
    },
    chartWrapper: {
        alignItems: 'center',
        paddingVertical: spacing.md,
    },
    centerLabel: {
        alignItems: 'center',
    },
    centerValue: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    centerSubtext: {
        fontSize: typography.size.xs,
        color: colors.text.secondary,
    },
    legend: {
        marginTop: spacing.sm,
        gap: spacing.xs + 2,
    },
    legendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendLabel: {
        flex: 1,
        fontSize: typography.size.xs,
        color: colors.text.primary,
    },
    legendValue: {
        width: 36,
        fontSize: typography.size.xs,
        fontWeight: typography.weight.semibold,
        color: colors.text.secondary,
        textAlign: 'right',
    },
    legendRaw: {
        width: 48,
        fontSize: typography.size.xs,
        color: colors.text.disabled,
        textAlign: 'right',
    },
});
