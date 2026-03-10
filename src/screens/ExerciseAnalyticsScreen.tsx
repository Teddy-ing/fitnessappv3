/**
 * Exercise Analytics Screen
 *
 * Per-exercise progression charts: Est. 1RM, Max Weight,
 * Volume per session, Max Reps, and a Best Weight for Reps table.
 *
 * Accessed by tapping an exercise from the Exercises tab in AnalyticsScreen.
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, spacing, borderRadius, typography } from '../theme';
import { useExerciseAnalytics } from '../hooks/useExerciseAnalytics';
import { ChartRange, CHART_RANGE_LABELS, ExerciseTimeSeriesPoint } from '../models/analytics';
import type { ProfileStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ExerciseAnalytics'>;

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - spacing.md * 4 - 40;
const CHART_RANGES: ChartRange[] = ['1M', '3M', '6M', '1Y', 'ALL'];

// ============================================================
// Sub-components
// ============================================================

/** Shared chart range pill row */
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
                <View key={r}>
                    <Text
                        style={[styles.pill, selected === r && styles.pillActive]}
                        onPress={() => onSelect(r)}
                    >
                        {CHART_RANGE_LABELS[r]}
                    </Text>
                </View>
            ))}
        </ScrollView>
    );
}

/** Section header with title */
function SectionHeader({ title }: { title: string }) {
    return <Text style={styles.sectionTitle}>{title}</Text>;
}

/** Line chart for time-series data */
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

    const chartData = data.map((d) => ({
        value: d.value,
        label: d.label,
        dataPointText: undefined,
    }));

    const maxValue = Math.max(...data.map((d) => d.value)) * 1.15;
    const latestValue = data[data.length - 1]?.value ?? 0;

    return (
        <View style={styles.chartCard}>
            <LineChart
                data={chartData}
                width={CHART_WIDTH}
                height={160}
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
                disableScroll={data.length <= 15}
                scrollToEnd={data.length > 15}
                formatYLabel={(val: string) => {
                    const num = Number(val);
                    if (num >= 1000) return `${(num / 1000).toFixed(0)}k`;
                    return String(Math.round(num));
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

/** Bar chart for volume data */
function VolumeBarChart({ data }: { data: ExerciseTimeSeriesPoint[] }) {
    if (data.length === 0) {
        return (
            <View style={[styles.chartCard, styles.emptyChart]}>
                <Text style={styles.emptyText}>No data for this range</Text>
            </View>
        );
    }

    const chartData = data.map((d) => ({
        value: d.value,
        label: d.label,
        frontColor: colors.accent.primary,
        gradientColor: colors.accent.tertiary,
    }));

    const maxValue = Math.max(...data.map((d) => d.value)) * 1.15;

    return (
        <View style={styles.chartCard}>
            <BarChart
                data={chartData}
                width={CHART_WIDTH}
                height={160}
                barWidth={data.length > 20 ? 8 : data.length > 10 ? 14 : 22}
                spacing={data.length > 20 ? 4 : data.length > 10 ? 8 : 12}
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
                disableScroll={data.length <= 15}
                scrollToEnd={data.length > 15}
                formatYLabel={(val: string) => {
                    const num = Number(val);
                    if (num >= 1000) return `${(num / 1000).toFixed(0)}k`;
                    return String(Math.round(num));
                }}
            />
        </View>
    );
}

// ============================================================
// Main Screen
// ============================================================

export default function ExerciseAnalyticsScreen({ route }: Props) {
    const { exerciseId } = route.params;
    const {
        chartRange,
        setChartRange,
        est1rm,
        maxWeight,
        volume,
        maxReps,
        bestForReps,
        loading,
    } = useExerciseAnalytics(exerciseId);

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['bottom']}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.accent.primary} />
                    <Text style={styles.loadingText}>Loading analytics...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Shared range selector */}
                <RangePills selected={chartRange} onSelect={setChartRange} />

                {/* Chart 1: Estimated 1RM */}
                <SectionHeader title="Estimated 1RM" />
                <TimeSeriesLineChart data={est1rm} color={colors.accent.primary} suffix=" lbs" />

                {/* Chart 2: Max Weight */}
                <SectionHeader title="Max Weight" />
                <TimeSeriesLineChart data={maxWeight} color="#3b82f6" suffix=" lbs" />

                {/* Chart 3: Volume per Session */}
                <SectionHeader title="Session Volume" />
                <VolumeBarChart data={volume} />

                {/* Chart 4: Max Reps */}
                <SectionHeader title="Max Reps" />
                <TimeSeriesLineChart data={maxReps} color="#14b8a6" />

                {/* Table: Best Weight for Reps */}
                {bestForReps.length > 0 && (
                    <View>
                        <SectionHeader title="Best Weight for Reps" />
                        <View style={styles.tableCard}>
                            <View style={styles.tableHeader}>
                                <Text style={styles.tableHeaderCell}>Reps</Text>
                                <Text style={styles.tableHeaderCell}>Weight</Text>
                                <Text style={[styles.tableHeaderCell, styles.tableDateCell]}>
                                    Date
                                </Text>
                            </View>
                            {bestForReps.map((row) => (
                                <View key={row.reps} style={styles.tableRow}>
                                    <Text style={styles.tableCell}>{row.reps}</Text>
                                    <Text style={[styles.tableCell, styles.tableCellBold]}>
                                        {row.weight} lbs
                                    </Text>
                                    <Text style={[styles.tableCell, styles.tableDateCell]}>
                                        {new Date(row.date).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                        })}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.primary,
    },
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
        fontSize: typography.size.xs,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
        overflow: 'hidden',
    },
    pillActive: {
        backgroundColor: colors.accent.primary,
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

    // Best weight for reps table
    tableCard: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.xl,
        padding: spacing.md,
    },
    tableHeader: {
        flexDirection: 'row',
        paddingBottom: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.background.tertiary,
        marginBottom: spacing.xs,
    },
    tableHeaderCell: {
        flex: 1,
        fontSize: typography.size.xs,
        fontWeight: typography.weight.semibold,
        color: colors.text.secondary,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: spacing.xs + 2,
    },
    tableCell: {
        flex: 1,
        fontSize: typography.size.sm,
        color: colors.text.primary,
    },
    tableCellBold: {
        fontWeight: typography.weight.semibold,
        color: colors.accent.primary,
    },
    tableDateCell: {
        textAlign: 'right',
    },
});
