/**
 * Pinned Exercise Widget (Rectangle)
 *
 * Shows a line chart for a specific exercise's estimated 1RM or volume
 * over time. Configured per-instance with an exerciseId and metric.
 * Tap → navigate to exercise analytics.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { ExerciseTimeSeriesPoint } from '../../models/analytics';

interface PinnedExerciseWidgetProps {
    exerciseName: string;
    metric: string; // '1rm' | 'volume'
    data: ExerciseTimeSeriesPoint[];
    unit?: string;
}

export default function PinnedExerciseWidget({
    exerciseName,
    metric,
    data,
    unit = 'lbs',
}: PinnedExerciseWidgetProps) {
    const chartData = useMemo(() => {
        return data.map((p) => ({ value: p.value }));
    }, [data]);

    const { currentValue, delta, isPositive } = useMemo(() => {
        if (data.length === 0) {
            return { currentValue: null, delta: null, isPositive: false };
        }
        const current = data[data.length - 1].value;
        const first = data[0].value;
        const d = current - first;
        return {
            currentValue: current,
            delta: d,
            isPositive: d >= 0,
        };
    }, [data]);

    const metricLabel = metric === 'volume' ? 'Volume' : 'Est. 1RM';

    if (data.length === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.exerciseName} numberOfLines={1}>
                            {exerciseName || 'Pinned Exercise'}
                        </Text>
                        <Text style={styles.metricLabel}>{metricLabel}</Text>
                    </View>
                </View>
                <View style={styles.emptyContainer}>
                    <MaterialIcons name="show-chart" size={28} color={colors.text.disabled} />
                    <Text style={styles.emptyText}>No data yet</Text>
                </View>
            </View>
        );
    }

    // Compute chart bounds
    const values = data.map((p) => p.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const padding = Math.max((maxVal - minVal) * 0.2, 1);

    // Color based on trend direction
    const lineColor = isPositive ? '#22c55e' : '#ef4444';

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={styles.exerciseName} numberOfLines={1}>
                        {exerciseName}
                    </Text>
                    <Text style={styles.metricLabel}>{metricLabel}</Text>
                </View>
                <View style={styles.headerRight}>
                    {currentValue !== null && (
                        <Text style={styles.currentValue}>
                            {Math.round(currentValue)}{' '}
                            <Text style={styles.unit}>{metric === 'volume' ? '' : unit}</Text>
                        </Text>
                    )}
                    {delta !== null && (
                        <View style={[styles.deltaBadge, isPositive ? styles.deltaBadgeUp : styles.deltaBadgeDown]}>
                            <Text style={[styles.deltaText, isPositive ? styles.deltaTextUp : styles.deltaTextDown]}>
                                {isPositive ? '+' : ''}{Math.round(delta)}
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            <View style={styles.chartContainer}>
                <LineChart
                    data={chartData}
                    width={260}
                    height={50}
                    hideDataPoints
                    hideYAxisText
                    hideAxesAndRules
                    color={lineColor}
                    thickness={2}
                    curved
                    areaChart
                    startFillColor={lineColor}
                    startOpacity={0.15}
                    endFillColor={lineColor}
                    endOpacity={0.02}
                    yAxisOffset={minVal - padding}
                    maxValue={maxVal - minVal + padding * 2}
                    isAnimated={false}
                    initialSpacing={0}
                    endSpacing={0}
                    adjustToWidth
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.xs,
    },
    headerLeft: {
        flex: 1,
        marginRight: spacing.sm,
    },
    headerRight: {
        alignItems: 'flex-end',
    },
    exerciseName: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
    },
    metricLabel: {
        fontSize: 10,
        color: colors.text.secondary,
        marginTop: 1,
    },
    currentValue: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    unit: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.regular,
        color: colors.text.secondary,
    },
    deltaBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 1,
        borderRadius: 8,
        marginTop: 2,
    },
    deltaBadgeUp: {
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
    },
    deltaBadgeDown: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
    },
    deltaText: {
        fontSize: 10,
        fontWeight: typography.weight.semibold,
    },
    deltaTextUp: {
        color: '#22c55e',
    },
    deltaTextDown: {
        color: '#ef4444',
    },
    chartContainer: {
        marginHorizontal: -spacing.xs,
        overflow: 'hidden',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: spacing.md,
    },
    emptyText: {
        fontSize: typography.size.sm,
        color: colors.text.disabled,
        marginTop: spacing.xs,
    },
});
