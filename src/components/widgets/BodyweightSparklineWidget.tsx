/**
 * Bodyweight Sparkline Widget (Rectangle)
 *
 * Full-width card showing a 30-day bodyweight trend line,
 * the current value, and a ± delta badge.
 * Tap → navigate to Measurements screen.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { colors, spacing, typography } from '../../theme';

export interface SparklinePoint {
    date: string;
    value: number;
}

interface BodyweightSparklineWidgetProps {
    data: SparklinePoint[];
    unit?: string;
}

export default function BodyweightSparklineWidget({
    data,
    unit = 'lbs',
}: BodyweightSparklineWidgetProps) {
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

    if (data.length === 0) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>BODYWEIGHT</Text>
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No data yet</Text>
                    <Text style={styles.emptySubtext}>Log a bodyweight measurement to see your trend</Text>
                </View>
            </View>
        );
    }

    // Compute chart bounds for tighter Y-axis
    const values = data.map((p) => p.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const padding = Math.max((maxVal - minVal) * 0.2, 1);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>BODYWEIGHT</Text>
                {delta !== null && (
                    <View style={[styles.deltaBadge, isPositive ? styles.deltaBadgeUp : styles.deltaBadgeDown]}>
                        <Text style={[styles.deltaText, isPositive ? styles.deltaTextUp : styles.deltaTextDown]}>
                            {isPositive ? '+' : ''}{delta.toFixed(1)} {unit}
                        </Text>
                    </View>
                )}
            </View>

            {currentValue !== null && (
                <Text style={styles.currentValue}>
                    {currentValue.toFixed(1)}{' '}
                    <Text style={styles.unit}>{unit}</Text>
                </Text>
            )}

            <View style={styles.chartContainer}>
                <LineChart
                    data={chartData}
                    width={260}
                    height={60}
                    hideDataPoints
                    hideYAxisText
                    hideAxesAndRules
                    color={colors.accent.primary}
                    thickness={2}
                    curved
                    areaChart
                    startFillColor={colors.accent.primary}
                    startOpacity={0.2}
                    endFillColor={colors.accent.primary}
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
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.xs,
    },
    title: {
        fontSize: 10,
        fontWeight: typography.weight.bold,
        color: colors.text.secondary,
        letterSpacing: 0.5,
    },
    currentValue: {
        fontSize: typography.size.xxl,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    unit: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.regular,
        color: colors.text.secondary,
    },
    deltaBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: 10,
    },
    deltaBadgeUp: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
    },
    deltaBadgeDown: {
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
    },
    deltaText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.semibold,
    },
    deltaTextUp: {
        color: '#ef4444',
    },
    deltaTextDown: {
        color: '#22c55e',
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
        color: colors.text.secondary,
        fontWeight: typography.weight.medium,
    },
    emptySubtext: {
        fontSize: typography.size.xs,
        color: colors.text.disabled,
        marginTop: spacing.xs,
        textAlign: 'center',
    },
});
