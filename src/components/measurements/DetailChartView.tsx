/**
 * DetailChartView Component
 *
 * Expanded chart view for a single measurement metric.
 * Shows a full LineChart with time range pills (1M/3M/6M/1Y/All),
 * touch tooltips, summary row, and optional relative strength overlay.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {

    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import { colors, spacing, borderRadius, typography } from '../../theme';
import {
    getMeasurementHistory,
} from '../../services';
import type { MeasurementType } from '../../models';
import { formatISODate } from '../../utils/formatters';

// ============================================================
// Constants
// ============================================================

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - spacing.md * 4 - 40;

type RangeKey = '1M' | '3M' | '6M' | '1Y' | 'ALL';
const RANGE_LABELS: Record<RangeKey, string> = {
    '1M': '1M',
    '3M': '3M',
    '6M': '6M',
    '1Y': '1Y',
    'ALL': 'All',
};
const RANGE_DAYS: Record<RangeKey, number | null> = {
    '1M': 30,
    '3M': 90,
    '6M': 180,
    '1Y': 365,
    'ALL': null,
};

// ============================================================
// Component
// ============================================================

interface DetailChartProps {
    type: MeasurementType;
    unitSystem: string;
    onBack: () => void;
}

export default function DetailChartView({ type, unitSystem, onBack }: DetailChartProps) {
    const [range, setRange] = useState<RangeKey>('3M');
    const [data, setData] = useState<{ date: string; value: number }[]>([]);
    const [loading, setLoading] = useState(true);



    const unit = unitSystem === 'kg' ? type.unitMetric : type.unitImperial;

    const loadData = useCallback(async () => {
        setLoading(true);
        const days = RANGE_DAYS[range];
        let startDate: string | undefined;
        if (days !== null) {
            const d = new Date();
            d.setDate(d.getDate() - days);
            startDate = formatISODate(d);
        }
        const history = await getMeasurementHistory(type.id, startDate);
        setData(history.map((m) => ({ date: m.recordedAt, value: m.value })));
        setLoading(false);
    }, [range, type.id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // PP-024: Memoize chart data transformations
    const chartData = useMemo(() => data.map((d, i) => {
        const dateObj = new Date(d.date + 'T12:00:00');
        const label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return {
            value: d.value,
            label: i % Math.max(1, Math.floor(data.length / 6)) === 0 ? label : '',
            fullLabel: label,
        };
    }), [data]);


    const maxValue = useMemo(() => data.length > 0
        ? Math.max(...data.map((d) => d.value)) * 1.15
        : 100, [data]);

    return (
        <View style={styles.container}>
            {/* Back + title */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Text style={styles.backText}>‹ All Metrics</Text>
                </TouchableOpacity>
                <Text style={styles.title}>{type.name}</Text>
            </View>

            {/* Range pills */}
            <View style={styles.pillRow}>
                {(Object.keys(RANGE_LABELS) as RangeKey[]).map((r) => (
                    <TouchableOpacity
                        key={r}
                        style={[styles.pill, range === r && styles.pillActive]}
                        onPress={() => setRange(r)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.pillText, range === r && styles.pillTextActive]}>
                            {RANGE_LABELS[r]}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>



            {/* Chart */}
            {loading ? (
                <View style={styles.loading}>
                    <ActivityIndicator color={colors.accent.primary} />
                </View>
            ) : data.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={styles.emptyText}>No data for this range</Text>
                </View>
            ) : (
                <View style={styles.chartCard}>
                    <LineChart
                        data={chartData}
                        width={CHART_WIDTH}
                        height={200}
                        xAxisLabelsHeight={36}
                        adjustToWidth
                        initialSpacing={0}
                        color={colors.accent.primary}
                        thickness={2}
                        noOfSections={5}
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
                        dataPointsColor={colors.accent.primary}
                        dataPointsRadius={data.length > 20 ? 0 : 3}
                        startFillColor={colors.accent.primary}
                        endFillColor={colors.background.secondary}
                        startOpacity={0.3}
                        endOpacity={0.05}
                        areaChart
                        formatYLabel={(val: string) => {
                            const num = Number(val);
                            return String(Math.round(num * 10) / 10);
                        }}
                        pointerConfig={{
                            pointerStripColor: colors.accent.primary,
                            pointerStripWidth: 1,
                            pointerColor: colors.accent.primary,
                            radius: 5,
                            pointerLabelWidth: 140,
                            pointerLabelHeight: 30,
                            activatePointersOnLongPress: false,
                            autoAdjustPointerLabelPosition: true,
                            pointerLabelComponent: (items: { value?: number; fullLabel?: string; label?: string }[]) => {
                                const pointLabel = items[0]?.fullLabel || items[0]?.label || '';
                                return (
                                    <View style={styles.tooltip}>
                                        <Text style={styles.tooltipText}>
                                            {pointLabel}: {Math.round((items[0]?.value ?? 0) * 10) / 10} {unit}
                                        </Text>
                                    </View>
                                );
                            },
                        }}
                    />

                    {/* Summary row */}
                    <View style={styles.summaryRow}>
                        <View>
                            <Text style={styles.summaryLabel}>Latest</Text>
                            <Text style={styles.summaryValue}>
                                {data[data.length - 1]?.value ?? '—'} {unit}
                            </Text>
                        </View>
                        {data.length >= 2 && (
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.summaryLabel}>Change</Text>
                                {(() => {
                                    const first = data[0].value;
                                    const last = data[data.length - 1].value;
                                    const diff = last - first;
                                    const sign = diff >= 0 ? '+' : '';
                                    const changeColor = diff >= 0 ? colors.accent.success : colors.accent.error;
                                    return (
                                        <Text style={[styles.summaryValue, { color: changeColor }]}>
                                            {sign}{Math.round(diff * 10) / 10} {unit}
                                        </Text>
                                    );
                                })()}
                            </View>
                        )}
                    </View>
                </View>
            )}
        </View>
    );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        paddingBottom: spacing.md,
    },
    backBtn: {
        marginBottom: spacing.sm,
    },
    backText: {
        color: colors.accent.primary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium as '500',
    },
    title: {
        color: colors.text.primary,
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold as '700',
    },
    pillRow: {
        flexDirection: 'row',
        gap: spacing.xs,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.sm,
    },
    pill: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
        borderRadius: 14,
        backgroundColor: colors.background.secondary,
    },
    pillActive: {
        backgroundColor: colors.accent.primary,
    },
    pillText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.medium as '500',
        color: colors.text.secondary,
        lineHeight: 16,
    },
    pillTextActive: {
        color: colors.text.primary,
        fontWeight: typography.weight.semibold as '600',
    },
    loading: {
        height: 240,
        justifyContent: 'center',
        alignItems: 'center',
    },
    empty: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: spacing.lg,
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.xl,
    },
    emptyText: {
        color: colors.text.disabled,
        fontSize: typography.size.sm,
    },
    chartCard: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.xl,
        padding: spacing.md,
        marginHorizontal: spacing.lg,
    },
    axisText: {
        fontSize: 10,
        color: colors.text.secondary,
    },
    tooltip: {
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        marginBottom: spacing.xs,
    },
    tooltipText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.semibold as '600',
        color: colors.text.primary,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.md,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.background.tertiary,
    },
    summaryLabel: {
        color: colors.text.secondary,
        fontSize: typography.size.xs,
        marginBottom: 2,
    },
    summaryValue: {
        color: colors.text.primary,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold as '700',
    },

});
