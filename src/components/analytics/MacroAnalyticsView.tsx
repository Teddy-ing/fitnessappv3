/**
 * MacroAnalyticsView
 *
 * Workouts tab content: dual-axis controller (metric × time bucket),
 * bar chart with tooltips, chart range selector, and consistency cards.
 */

import React, { useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, spacing, borderRadius, typography } from '../../theme';
import { useMacroAnalytics } from '../../hooks/useMacroAnalytics';
import ConsistencyCards from '../ConsistencyCards';
import FatigueRatioBanner from '../FatigueRatioBanner';
import MetricSelector from './MetricSelector';
import PillRow from './PillRow';
import { createLabelProcessor, BAR_CHART_MARGINS } from '../../utils/chartLabels';

import {
    MetricType,
    TimeBucket,
    ChartRange,
    TIME_BUCKET_LABELS,
    CHART_RANGE_LABELS,
} from '../../models/analytics';

// ============================================================
// Constants
// ============================================================

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - spacing.md * 2 - spacing.md * 2; // screen padding + card padding

const TIME_BUCKETS: TimeBucket[] = ['per_workout', 'per_week', 'per_month', 'per_year'];
const CHART_RANGES: ChartRange[] = ['1M', '3M', '6M', '1Y', 'ALL'];

// ============================================================
// Helpers
// ============================================================

/** Format a raw value for display based on the metric type */
function formatMetricValue(value: number, metric: MetricType): string {
    switch (metric) {
        case 'volume':
            if (value >= 1000) {
                return `${(value / 1000).toFixed(1)}k`;
            }
            return value.toLocaleString();
        case 'duration':
            // Convert seconds to minutes
            const minutes = Math.round(value / 60);
            if (minutes >= 60) {
                const hours = Math.floor(minutes / 60);
                const remaining = minutes % 60;
                return `${hours}h${remaining > 0 ? `${remaining}m` : ''}`;
            }
            return `${minutes}m`;
        default:
            return value.toLocaleString();
    }
}

/** Y-axis label suffix for the metric */
function getYAxisSuffix(metric: MetricType): string {
    switch (metric) {
        case 'volume':
            return ' lbs';
        case 'duration':
            return '';
        default:
            return '';
    }
}

// ============================================================
// Component
// ============================================================

export default function MacroAnalyticsView() {
    const {
        metric,
        timeBucket,
        chartRange,
        data,
        loading,
        error,
        setMetric,
        setTimeBucket,
        setChartRange,
    } = useMacroAnalytics();

    // PP-007 fix: memoize chart data transformation to avoid recreating on every render
    const { chartData, maxValue } = useMemo(() => {
        const processLabel = createLabelProcessor(BAR_CHART_MARGINS, styles.axisText);

        const transformed = data.map((point) => {
            let displayLabel = point.label;
            let labelComp;
            if (timeBucket === 'per_workout') {
                const result = processLabel(point.label);
                displayLabel = result.displayLabel;
                labelComp = result.labelComponent;
            }

            return {
                value: metric === 'duration' ? Math.round(point.value / 60) : point.value,
                label: displayLabel,
                labelComponent: labelComp,
                fullLabel: point.label,
                frontColor: colors.accent.primary,
                gradientColor: colors.accent.tertiary,
                topLabelComponent: undefined,
            };
        });

        const max = transformed.length > 0
            ? Math.max(...transformed.map((d) => d.value)) * 1.15
            : 100;

        return { chartData: transformed, maxValue: max };
    }, [data, metric, timeBucket]);

    return (
        <View>
            {/* Fatigue ratio banner */}
            <FatigueRatioBanner />

            {/* Axis 1: Metric selector */}
            <MetricSelector selected={metric} onSelect={setMetric} />

            {/* Axis 2: Time bucket pills */}
            <PillRow
                items={TIME_BUCKETS}
                labels={TIME_BUCKET_LABELS}
                selected={timeBucket}
                onSelect={setTimeBucket}
            />

            {/* Chart area */}
            <View style={styles.chartCard}>
                {loading ? (
                    <View style={styles.chartPlaceholder}>
                        <ActivityIndicator size="large" color={colors.accent.primary} />
                        <Text style={styles.placeholderText}>Loading data...</Text>
                    </View>
                ) : error ? (
                    <View style={styles.chartPlaceholder}>
                        <MaterialIcons name="error-outline" size={32} color={colors.accent.error} />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : chartData.length === 0 ? (
                    <View style={styles.chartPlaceholder}>
                        <MaterialIcons name="bar-chart" size={48} color={colors.text.disabled} />
                        <Text style={styles.placeholderText}>No workout data yet</Text>
                        <Text style={styles.placeholderSubtext}>
                            Complete some workouts to see your trends
                        </Text>
                    </View>
                ) : (
                    <View>
                        <BarChart
                            data={chartData}
                            width={CHART_WIDTH - 40}
                            height={200}
                            {...(timeBucket === 'per_workout' ? { xAxisLabelsHeight: 36 } : {})}
                            barWidth={chartData.length > 20 ? 8 : chartData.length > 10 ? 14 : 22}
                            spacing={chartData.length > 20 ? 4 : chartData.length > 10 ? 8 : 12}
                            noOfSections={4}
                            maxValue={maxValue}
                            yAxisTextStyle={styles.axisText}
                            xAxisLabelTextStyle={[
                                styles.axisText,
                                { width: chartData.length > 12 ? 20 : 40 },
                            ]}
                            yAxisColor={colors.background.tertiary}
                            xAxisColor={colors.background.tertiary}
                            hideRules={false}
                            rulesColor={colors.background.tertiary}
                            rulesType="dashed"
                            isAnimated
                            animationDuration={600}
                            frontColor={colors.accent.primary}
                            showGradient
                            gradientColor={colors.accent.tertiary}
                            roundedTop
                            roundedBottom={false}
                            barBorderTopLeftRadius={4}
                            barBorderTopRightRadius={4}
                            disableScroll={chartData.length <= 15}
                            scrollToEnd={chartData.length > 15}
                            formatYLabel={(val: string) => {
                                const num = Number(val);
                                if (metric === 'volume') {
                                    return num >= 1000 ? `${(num / 1000).toFixed(0)}k` : String(num);
                                }
                                return String(Math.round(num));
                            }}
                            renderTooltip={(item: any, index: number) => {
                                const isRightSide = index >= chartData.length * 0.7;
                                return (
                                    <View style={[
                                        styles.tooltip,
                                        isRightSide && { marginLeft: -100 },
                                    ]}>
                                        <Text style={styles.tooltipText}>
                                            {item.fullLabel || item.label}: {formatMetricValue(item.value, metric)}
                                            {getYAxisSuffix(metric)}
                                        </Text>
                                    </View>
                                );
                            }}
                        />

                        {/* Summary stat */}
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Total</Text>
                            <Text style={styles.summaryValue}>
                                {formatMetricValue(
                                    data.reduce((sum, d) => sum + d.value, 0),
                                    metric,
                                )}
                                {getYAxisSuffix(metric)}
                            </Text>
                        </View>
                    </View>
                )}
            </View>

            {/* Axis 3: Chart range pills */}
            <PillRow
                items={CHART_RANGES}
                labels={CHART_RANGE_LABELS}
                selected={chartRange}
                onSelect={setChartRange}
            />

            {/* Consistency stats */}
            <ConsistencyCards range={chartRange} />
        </View>
    );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
    // Chart card
    chartCard: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.xl,
        padding: spacing.md,
        marginBottom: spacing.sm,
        minHeight: 260,
    },

    // Chart placeholder / empty / error states
    chartPlaceholder: {
        height: 220,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    placeholderText: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        marginTop: spacing.xs,
    },
    placeholderSubtext: {
        fontSize: typography.size.xs,
        color: colors.text.disabled,
        textAlign: 'center',
    },
    errorText: {
        fontSize: typography.size.sm,
        color: colors.accent.error,
    },

    // Axis text
    axisText: {
        fontSize: 10,
        color: colors.text.secondary,
    },

    // Summary row
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.md,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.background.tertiary,
    },
    summaryLabel: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
    },
    summaryValue: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.accent.primary,
    },

    // Tooltips
    tooltip: {
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        marginBottom: spacing.xs,
    },
    tooltipText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
    },
});
