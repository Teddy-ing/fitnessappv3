/**
 * Charts Tab — Exercise Details
 *
 * Vertically stacked charts: Estimated 1RM (line), Max Weight (line),
 * Session Volume (bar). Shared range pills across all charts.
 *
 * Reuses the data hook from the legacy ExerciseAnalyticsScreen.
 */

import React, { useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import { BarChart, LineChart } from 'react-native-gifted-charts';

import { colors, spacing, borderRadius, typography } from '../../theme';
import { useExerciseAnalytics } from '../../hooks/useExerciseAnalytics';
import { ChartRange, CHART_RANGE_LABELS, ExerciseTimeSeriesPoint } from '../../models/analytics';
import { createLabelProcessor, BAR_CHART_MARGINS, LINE_CHART_MARGINS } from '../../utils/chartLabels';
import { useWeightUnit } from '../../hooks/useWeightUnit';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - spacing.md * 4 - 40;
const CHART_RANGES: ChartRange[] = ['1M', '3M', '6M', '1Y', 'ALL'];

const Y_AXIS_WIDTH = 35;
const LIB_INITIAL_SPACING = 20;
const MIN_PER_POINT = 12;

function computeChartSpacing(dataLength: number) {
    if (dataLength <= 1) {
        return { barWidth: 22, barSpacing: 18, needsScroll: false };
    }
    const dataArea = CHART_WIDTH - Y_AXIS_WIDTH - LIB_INITIAL_SPACING;
    const ideal = dataArea / (dataLength - 1);
    const perPoint = Math.max(MIN_PER_POINT, ideal);
    const needsScroll = ideal < MIN_PER_POINT;
    const bw = Math.max(4, Math.round(perPoint * 0.65));
    const bs = Math.max(1, perPoint - bw);
    return { barWidth: bw, barSpacing: bs, needsScroll };
}

// ============================================================
// Sub-components
// ============================================================

function RangePills({
    selected,
    onSelect,
}: {
    selected: ChartRange;
    onSelect: (r: ChartRange) => void;
}) {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillRow}
        >
            {CHART_RANGES.map((r) => (
                <TouchableOpacity
                    key={r}
                    style={[styles.pill, selected === r && styles.pillActive]}
                    onPress={() => onSelect(r)}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.pillText, selected === r && styles.pillTextActive]}>
                        {CHART_RANGE_LABELS[r]}
                    </Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
}

function SectionHeader({ title }: { title: string }) {
    return <Text style={styles.sectionTitle}>{title}</Text>;
}

function TimeSeriesLineChart({
    data,
    color,
    suffix,
}: {
    data: ExerciseTimeSeriesPoint[];
    color: string;
    suffix?: string;
}) {
    if (data.length === 0) {
        return (
            <View style={styles.emptyChart}>
                <Text style={styles.emptyText}>No data for this range</Text>
            </View>
        );
    }

    const { chartData, maxValue, latestValue, needsScroll } = useMemo(() => {
        const processLabel = createLabelProcessor(LINE_CHART_MARGINS, styles.axisText);
        const cd = data.map((d) => {
            const { displayLabel, labelComponent } = processLabel(d.label);
            return {
                value: d.value,
                label: displayLabel,
                labelComponent,
                fullLabel: d.label,
                dataPointText: undefined,
            };
        });
        return {
            chartData: cd,
            maxValue: Math.max(...data.map((d) => d.value)) * 1.15,
            latestValue: data[data.length - 1]?.value ?? 0,
            needsScroll: computeChartSpacing(data.length).needsScroll,
        };
    }, [data]);

    return (
        <View style={styles.chartCard}>
            <LineChart
                data={chartData}
                width={CHART_WIDTH}
                height={160}
                xAxisLabelsHeight={36}
                adjustToWidth
                initialSpacing={0}
                color={color}
                thickness={2}
                noOfSections={4}
                maxValue={maxValue}
                yAxisTextStyle={styles.axisText}
                xAxisLabelTextStyle={[
                    styles.axisText,
                    { width: data.length > 12 ? 20 : 40 },
                ]}
                yAxisColor={colors.background.tertiary}
                xAxisColor={colors.background.tertiary}
                hideRules={false}
                rulesColor={colors.background.tertiary}
                rulesType="dashed"
                isAnimated
                animationDuration={500}
                curved
                dataPointsColor={color}
                dataPointsRadius={data.length > 20 ? 0 : 3}
                startFillColor={color}
                endFillColor={colors.background.secondary}
                startOpacity={0.3}
                endOpacity={0.05}
                areaChart
                disableScroll={!needsScroll}
                scrollToEnd={needsScroll}
                formatYLabel={(val: string) => {
                    const num = Number(val);
                    if (num >= 1000) return `${(num / 1000).toFixed(0)}k`;
                    return String(Math.round(num));
                }}
                pointerConfig={{
                    pointerStripColor: color,
                    pointerStripWidth: 1,
                    pointerColor: color,
                    radius: 5,
                    pointerLabelWidth: 120,
                    pointerLabelHeight: 30,
                    activatePointersOnLongPress: false,
                    autoAdjustPointerLabelPosition: true,
                    pointerLabelComponent: (items: any[]) => {
                        const pointLabel = items[0]?.fullLabel || items[0]?.label || '';
                        return (
                            <View style={styles.tooltip}>
                                <Text style={styles.tooltipText}>
                                    {pointLabel}: {Math.round((items[0]?.value ?? 0) * 10) / 10}
                                    {suffix ?? ''}
                                </Text>
                            </View>
                        );
                    },
                }}
            />
            <View style={styles.latestRow}>
                <Text style={styles.latestLabel}>Latest</Text>
                <Text style={[styles.latestValue, { color }]}>
                    {latestValue >= 1000
                        ? `${(latestValue / 1000).toFixed(1)}k`
                        : Math.round(latestValue * 10) / 10}
                    {suffix ?? ''}
                </Text>
            </View>
        </View>
    );
}

function VolumeBarChart({ data, weightUnit }: { data: ExerciseTimeSeriesPoint[]; weightUnit: string }) {
    if (data.length === 0) {
        return (
            <View style={[styles.chartCard, styles.emptyChart]}>
                <Text style={styles.emptyText}>No data for this range</Text>
            </View>
        );
    }

    const { chartData, maxValue, barWidth, barSpacing, needsScroll } = useMemo(() => {
        const processLabel = createLabelProcessor(BAR_CHART_MARGINS, styles.axisText);
        const cd = data.map((d) => {
            const { displayLabel, labelComponent } = processLabel(d.label);
            return {
                value: d.value,
                label: displayLabel,
                labelComponent,
                fullLabel: d.label,
                frontColor: colors.accent.primary,
                gradientColor: colors.accent.tertiary,
            };
        });
        const spacing = computeChartSpacing(data.length);
        return {
            chartData: cd,
            maxValue: Math.max(...data.map((d) => d.value)) * 1.15,
            barWidth: spacing.barWidth,
            barSpacing: spacing.barSpacing,
            needsScroll: spacing.needsScroll,
        };
    }, [data]);

    return (
        <View style={styles.chartCard}>
            <BarChart
                data={chartData}
                width={CHART_WIDTH}
                height={160}
                xAxisLabelsHeight={36}
                barWidth={barWidth}
                spacing={barSpacing}
                noOfSections={4}
                maxValue={maxValue}
                yAxisTextStyle={styles.axisText}
                xAxisLabelTextStyle={[
                    styles.axisText,
                    { width: data.length > 12 ? 20 : 40 },
                ]}
                yAxisColor={colors.background.tertiary}
                xAxisColor={colors.background.tertiary}
                hideRules={false}
                rulesColor={colors.background.tertiary}
                rulesType="dashed"
                isAnimated
                animationDuration={500}
                frontColor={colors.accent.primary}
                showGradient
                gradientColor={colors.accent.tertiary}
                roundedTop
                roundedBottom={false}
                barBorderTopLeftRadius={4}
                barBorderTopRightRadius={4}
                disableScroll={!needsScroll}
                scrollToEnd={needsScroll}
                formatYLabel={(val: string) => {
                    const num = Number(val);
                    if (num >= 1000) return `${(num / 1000).toFixed(0)}k`;
                    return String(Math.round(num));
                }}
                renderTooltip={(item: any, index: number) => {
                    const isRightSide = index >= data.length * 0.7;
                    return (
                        <View style={[
                            styles.tooltip,
                            isRightSide && { marginLeft: -100 },
                        ]}>
                            <Text style={styles.tooltipText}>
                                {item.fullLabel || item.label}: {item.value >= 1000
                                    ? `${(item.value / 1000).toFixed(1)}k`
                                    : Math.round(item.value)} {weightUnit}
                            </Text>
                        </View>
                    );
                }}
            />
        </View>
    );
}

// ============================================================
// Main Tab Component
// ============================================================

interface ChartsTabProps {
    exerciseId: string;
}

export default function ChartsTab({ exerciseId }: ChartsTabProps) {
    const {
        chartRange,
        setChartRange,
        est1rm,
        maxWeight,
        volume,
        loading,
    } = useExerciseAnalytics(exerciseId);
    const weightUnit = useWeightUnit();

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accent.primary} />
                <Text style={styles.loadingText}>Loading analytics...</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
            <RangePills selected={chartRange} onSelect={setChartRange} />

            <SectionHeader title="Estimated 1RM" />
            <TimeSeriesLineChart data={est1rm} color={colors.accent.primary} suffix={` ${weightUnit}`} />

            <SectionHeader title="Max Weight" />
            <TimeSeriesLineChart data={maxWeight} color="#3b82f6" suffix={` ${weightUnit}`} />

            <SectionHeader title="Session Volume" />
            <VolumeBarChart data={volume} weightUnit={weightUnit} />
        </ScrollView>
    );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.md,
        paddingBottom: spacing.xxl,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    loadingText: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
    },

    // Range pills
    pillRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
        marginBottom: spacing.sm,
    },
    pill: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        backgroundColor: colors.background.secondary,
    },
    pillActive: {
        backgroundColor: colors.accent.primary,
    },
    pillText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
    },
    pillTextActive: {
        color: colors.text.primary,
        fontWeight: typography.weight.semibold,
    },

    // Section headers
    sectionTitle: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.text.secondary,
        letterSpacing: 0.5,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
        marginLeft: spacing.xs,
    },

    // Chart card
    chartCard: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.xl,
        padding: spacing.md,
    },
    emptyChart: {
        height: 120,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.xl,
    },
    emptyText: {
        fontSize: typography.size.sm,
        color: colors.text.disabled,
    },

    // Axis text
    axisText: {
        fontSize: 10,
        color: colors.text.secondary,
    },

    // Latest value row
    latestRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.sm,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.background.tertiary,
    },
    latestLabel: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
    },
    latestValue: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
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
