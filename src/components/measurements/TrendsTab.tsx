/**
 * TrendsTab Component
 *
 * Displays measurement trends in two modes:
 * 1. Sparkline list — miniature SVG line charts for each visible metric
 * 2. Detail view — full LineChart for a selected metric with time range pills
 *
 * Uses react-native-svg for sparklines (lightweight, no axes)
 * and react-native-gifted-charts for the full detail chart.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import Svg, { Polyline, Defs, LinearGradient as SvgGradient, Stop, Rect } from 'react-native-svg';
import { LineChart } from 'react-native-gifted-charts';

import { colors, spacing, borderRadius, typography } from '../../theme';
import {
    getSparklineData,
    getMeasurementHistory,
    getVisibleMeasurementTypes,
} from '../../services';
import { getSettings } from '../../services/preferencesService';
import type { MeasurementType } from '../../models';

// ============================================================
// Constants
// ============================================================

const SCREEN_WIDTH = Dimensions.get('window').width;
const SPARKLINE_WIDTH = 100;
const SPARKLINE_HEIGHT = 32;
const CHART_WIDTH = SCREEN_WIDTH - spacing.md * 4 - 40;

type RangeKey = '1M' | '3M' | '6M' | '1Y' | 'ALL';
const RANGE_LABELS: Record<RangeKey, string> = {
    '1M': '1 Month',
    '3M': '3 Months',
    '6M': '6 Months',
    '1Y': '1 Year',
    'ALL': 'All Time',
};
const RANGE_DAYS: Record<RangeKey, number | null> = {
    '1M': 30,
    '3M': 90,
    '6M': 180,
    '1Y': 365,
    'ALL': null,
};

// ============================================================
// SparklineSVG — pure SVG sparkline
// ============================================================

interface SparklineProps {
    data: number[];
    width?: number;
    height?: number;
    color?: string;
}

function SparklineSVG({ data, width = SPARKLINE_WIDTH, height = SPARKLINE_HEIGHT, color = colors.accent.primary }: SparklineProps) {
    if (data.length < 2) {
        return (
            <View style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: colors.text.disabled, fontSize: 10 }}>—</Text>
            </View>
        );
    }

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const padding = 4;

    const points = data
        .map((v, i) => {
            const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
            const y = height - padding - ((v - min) / range) * (height - padding * 2);
            return `${x},${y}`;
        })
        .join(' ');

    return (
        <Svg width={width} height={height}>
            <Defs>
                <SvgGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={color} stopOpacity={0.3} />
                    <Stop offset="100%" stopColor={color} stopOpacity={0} />
                </SvgGradient>
            </Defs>
            <Polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
}

// ============================================================
// SparklineRow
// ============================================================

interface SparklineRowData {
    type: MeasurementType;
    dataPoints: number[];
    latestValue: number | null;
    unit: string;
}

interface SparklineRowProps {
    row: SparklineRowData;
    onPress: () => void;
}

function SparklineRow({ row, onPress }: SparklineRowProps) {
    const trendColor = row.dataPoints.length >= 2
        ? row.dataPoints[row.dataPoints.length - 1] >= row.dataPoints[0]
            ? colors.accent.success
            : colors.accent.error
        : colors.accent.primary;

    return (
        <TouchableOpacity style={sparkStyles.row} onPress={onPress} activeOpacity={0.7}>
            <Text style={sparkStyles.name}>{row.type.name}</Text>
            <View style={sparkStyles.chart}>
                <SparklineSVG data={row.dataPoints} color={trendColor} />
            </View>
            <View style={sparkStyles.valueCol}>
                <Text style={sparkStyles.value}>
                    {row.latestValue !== null ? row.latestValue : '—'}
                </Text>
                <Text style={sparkStyles.unit}>{row.unit}</Text>
            </View>
        </TouchableOpacity>
    );
}

const sparkStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.separator,
    },
    name: {
        flex: 1,
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium as '500',
    },
    chart: {
        width: SPARKLINE_WIDTH,
        height: SPARKLINE_HEIGHT,
        marginHorizontal: spacing.sm,
    },
    valueCol: {
        alignItems: 'flex-end',
        minWidth: 55,
    },
    value: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold as '600',
    },
    unit: {
        color: colors.text.secondary,
        fontSize: typography.size.xs,
        marginTop: 1,
    },
});

// ============================================================
// DetailChartView — expanded chart for a single metric
// ============================================================

interface DetailChartProps {
    type: MeasurementType;
    unitSystem: string;
    onBack: () => void;
}

function DetailChartView({ type, unitSystem, onBack }: DetailChartProps) {
    const [range, setRange] = useState<RangeKey>('3M');
    const [data, setData] = useState<{ date: string; value: number }[]>([]);
    const [loading, setLoading] = useState(true);

    const unit = unitSystem === 'kg' ? type.unitMetric : type.unitImperial;

    useEffect(() => {
        loadData();
    }, [range, type.id]);

    const loadData = useCallback(async () => {
        setLoading(true);
        const days = RANGE_DAYS[range];
        let startDate: string | undefined;
        if (days !== null) {
            const d = new Date();
            d.setDate(d.getDate() - days);
            startDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
        const history = await getMeasurementHistory(type.id, startDate);
        setData(history.map((m) => ({ date: m.recordedAt, value: m.value })));
        setLoading(false);
    }, [range, type.id]);

    const chartData = data.map((d, i) => {
        const dateObj = new Date(d.date + 'T12:00:00');
        const label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return {
            value: d.value,
            label: i % Math.max(1, Math.floor(data.length / 6)) === 0 ? label : '',
            fullLabel: label,
        };
    });

    const maxValue = data.length > 0
        ? Math.max(...data.map((d) => d.value)) * 1.15
        : 100;

    return (
        <View style={detailStyles.container}>
            {/* Back + title */}
            <View style={detailStyles.header}>
                <TouchableOpacity onPress={onBack} style={detailStyles.backBtn}>
                    <Text style={detailStyles.backText}>‹ All Metrics</Text>
                </TouchableOpacity>
                <Text style={detailStyles.title}>{type.name}</Text>
            </View>

            {/* Range pills */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={detailStyles.pillRow}
            >
                {(Object.keys(RANGE_LABELS) as RangeKey[]).map((r) => (
                    <TouchableOpacity
                        key={r}
                        style={[detailStyles.pill, range === r && detailStyles.pillActive]}
                        onPress={() => setRange(r)}
                        activeOpacity={0.7}
                    >
                        <Text style={[detailStyles.pillText, range === r && detailStyles.pillTextActive]}>
                            {RANGE_LABELS[r]}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Chart */}
            {loading ? (
                <View style={detailStyles.loading}>
                    <ActivityIndicator color={colors.accent.primary} />
                </View>
            ) : data.length === 0 ? (
                <View style={detailStyles.empty}>
                    <Text style={detailStyles.emptyText}>No data for this range</Text>
                </View>
            ) : (
                <View style={detailStyles.chartCard}>
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
                        yAxisTextStyle={detailStyles.axisText}
                        xAxisLabelTextStyle={[
                            detailStyles.axisText,
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
                                    <View style={detailStyles.tooltip}>
                                        <Text style={detailStyles.tooltipText}>
                                            {pointLabel}: {Math.round((items[0]?.value ?? 0) * 10) / 10} {unit}
                                        </Text>
                                    </View>
                                );
                            },
                        }}
                    />

                    {/* Summary row */}
                    <View style={detailStyles.summaryRow}>
                        <View>
                            <Text style={detailStyles.summaryLabel}>Latest</Text>
                            <Text style={detailStyles.summaryValue}>
                                {data[data.length - 1]?.value ?? '—'} {unit}
                            </Text>
                        </View>
                        {data.length >= 2 && (
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={detailStyles.summaryLabel}>Change</Text>
                                {(() => {
                                    const first = data[0].value;
                                    const last = data[data.length - 1].value;
                                    const diff = last - first;
                                    const sign = diff >= 0 ? '+' : '';
                                    const changeColor = diff >= 0 ? colors.accent.success : colors.accent.error;
                                    return (
                                        <Text style={[detailStyles.summaryValue, { color: changeColor }]}>
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

const detailStyles = StyleSheet.create({
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
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
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
        fontWeight: typography.weight.medium as '500',
        color: colors.text.secondary,
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

// ============================================================
// Main TrendsTab
// ============================================================

export default function TrendsTab() {
    const [sparklineRows, setSparklineRows] = useState<SparklineRowData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedType, setSelectedType] = useState<MeasurementType | null>(null);
    const [unitSystem, setUnitSystem] = useState('lbs');

    useEffect(() => {
        loadSparklines();
    }, []);

    const loadSparklines = useCallback(async () => {
        setLoading(true);
        const settings = await getSettings();
        setUnitSystem(settings.weightUnit);

        const types = await getVisibleMeasurementTypes(settings.visibleMeasurements);

        const rows: SparklineRowData[] = await Promise.all(
            types.map(async (type) => {
                const sparkData = await getSparklineData(type.id, 90);
                const unit = settings.weightUnit === 'kg' ? type.unitMetric : type.unitImperial;
                return {
                    type,
                    dataPoints: sparkData.map((d) => d.value),
                    latestValue: sparkData.length > 0 ? sparkData[sparkData.length - 1].value : null,
                    unit,
                };
            }),
        );

        setSparklineRows(rows);
        setLoading(false);
    }, []);

    // Detail view for a selected metric
    if (selectedType) {
        return (
            <DetailChartView
                type={selectedType}
                unitSystem={unitSystem}
                onBack={() => setSelectedType(null)}
            />
        );
    }

    // Loading state
    if (loading) {
        return (
            <View style={tabStyles.loading}>
                <ActivityIndicator color={colors.accent.primary} />
                <Text style={tabStyles.loadingText}>Loading trends...</Text>
            </View>
        );
    }

    // Empty state
    if (sparklineRows.length === 0) {
        return (
            <View style={tabStyles.empty}>
                <Text style={tabStyles.emptyIcon}>📈</Text>
                <Text style={tabStyles.emptyTitle}>No Data Yet</Text>
                <Text style={tabStyles.emptySubtitle}>
                    Log some measurements in the Track tab to see trends here.
                </Text>
            </View>
        );
    }

    // Sparkline list
    return (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: spacing.xl }}>
            <Text style={tabStyles.sectionTitle}>Last 90 Days</Text>
            {sparklineRows.map((row) => (
                <SparklineRow
                    key={row.type.id}
                    row={row}
                    onPress={() => setSelectedType(row.type)}
                />
            ))}
        </ScrollView>
    );
}

const tabStyles = StyleSheet.create({
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: spacing.sm,
    },
    loadingText: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
    },
    empty: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: spacing.md,
    },
    emptyTitle: {
        color: colors.text.primary,
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold as '700',
        marginBottom: spacing.sm,
    },
    emptySubtitle: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        textAlign: 'center',
        lineHeight: 20,
    },
    sectionTitle: {
        color: colors.text.secondary,
        fontSize: typography.size.xs,
        fontWeight: typography.weight.semibold as '600',
        letterSpacing: 0.5,
        marginHorizontal: spacing.lg,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
        textTransform: 'uppercase',
    },
});
