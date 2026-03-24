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
    getEstimated1RM,
    getExercises,
} from '../../services';
import { getSettings, updateSettings } from '../../services/preferencesService';
import type { MeasurementType } from '../../models';
import type { Exercise } from '../../models/exercise';
import type { ChartRange } from '../../models/analytics';
import OverlayExercisePicker from './OverlayExercisePicker';

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

    // Relative strength overlay (bodyweight only)
    const isBodyweight = type.id === 'bodyweight';
    const [showOverlay, setShowOverlay] = useState(false);
    const [overlayData, setOverlayData] = useState<{ date: string; value: number }[]>([]);
    const [overlayExerciseId, setOverlayExerciseId] = useState<string | null>(null);
    const [overlayExerciseName, setOverlayExerciseName] = useState('Bench Press');
    const [showExercisePicker, setShowExercisePicker] = useState(false);
    const [allExercises, setAllExercises] = useState<Exercise[]>([]);

    const unit = unitSystem === 'kg' ? type.unitMetric : type.unitImperial;

    useEffect(() => {
        loadData();
    }, [range, type.id]);

    // Load saved exercise preference for overlay (PP-026: single getExercises call)
    useEffect(() => {
        if (isBodyweight) {
            (async () => {
                const [settings, exercises] = await Promise.all([
                    getSettings(),
                    getExercises(false),
                ]);
                setAllExercises(exercises);

                if (settings.relativeStrengthExercise) {
                    setOverlayExerciseId(settings.relativeStrengthExercise);
                    const ex = exercises.find(e => e.id === settings.relativeStrengthExercise);
                    if (ex) setOverlayExerciseName(ex.name);
                } else {
                    // Default to first bench press found
                    const bench = exercises.find(e => e.name.toLowerCase().includes('bench press'));
                    if (bench) {
                        setOverlayExerciseId(bench.id);
                        setOverlayExerciseName(bench.name);
                    } else if (exercises.length > 0) {
                        setOverlayExerciseId(exercises[0].id);
                        setOverlayExerciseName(exercises[0].name);
                    }
                }
            })();
        }
    }, [isBodyweight]);

    // Load overlay 1RM data when toggled on
    useEffect(() => {
        if (showOverlay && overlayExerciseId) {
            loadOverlayData();
        }
    }, [showOverlay, overlayExerciseId, range]);

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

    const loadOverlayData = useCallback(async () => {
        if (!overlayExerciseId) return;
        const chartRange = range as ChartRange;
        const result = await getEstimated1RM(overlayExerciseId, chartRange);
        setOverlayData(result.map(r => ({ date: r.date, value: r.value })));
    }, [overlayExerciseId, range]);

    const handleSelectExercise = async (exercise: Exercise) => {
        setOverlayExerciseId(exercise.id);
        setOverlayExerciseName(exercise.name);
        setShowExercisePicker(false);
        await updateSettings({ relativeStrengthExercise: exercise.id });
    };

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

    // PP-030: Build Map for O(1) overlay date lookups (replaces O(n²) find)
    const overlayChartData = useMemo(() => {
        if (!showOverlay || overlayData.length === 0) return [];

        const overlayMap = new Map<string, number>();
        for (const o of overlayData) {
            overlayMap.set(o.date, o.value);
        }

        const aligned = data.map((d) => {
            const match = overlayMap.get(d.date);
            return { value: match ?? 0 };
        });

        // Fill gaps with nearest non-zero neighbour
        return aligned.map((d, i, arr) => {
            if (d.value === 0) {
                let prevVal = 0, nextVal = 0;
                for (let j = i - 1; j >= 0; j--) { if (arr[j].value > 0) { prevVal = arr[j].value; break; } }
                for (let j = i + 1; j < arr.length; j++) { if (arr[j].value > 0) { nextVal = arr[j].value; break; } }
                return { value: prevVal || nextVal || 0 };
            }
            return d;
        });
    }, [data, overlayData, showOverlay]);

    const hasAnyOverlay = useMemo(() => overlayChartData.some(d => d.value > 0), [overlayChartData]);

    const maxValue = useMemo(() => data.length > 0
        ? Math.max(...data.map((d) => d.value)) * 1.15
        : 100, [data]);

    const overlayColor = '#3b82f6'; // Blue for 1RM line

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

            {/* Overlay toggle for bodyweight */}
            {isBodyweight && (
                <View style={styles.overlayRow}>
                    <TouchableOpacity
                        style={[styles.overlayToggle, showOverlay && styles.overlayToggleActive]}
                        onPress={() => setShowOverlay(prev => !prev)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.overlayDot, { backgroundColor: overlayColor }]} />
                        <Text style={[styles.overlayToggleText, showOverlay && styles.overlayToggleTextActive]}>
                            Overlay 1RM
                        </Text>
                    </TouchableOpacity>
                    {showOverlay && (
                        <TouchableOpacity
                            onPress={() => setShowExercisePicker(true)}
                            style={styles.exercisePickerBtn}
                        >
                            <Text style={styles.exercisePickerText} numberOfLines={1}>
                                {overlayExerciseName} ▾
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

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
                        {...(showOverlay && hasAnyOverlay ? {
                            data2: overlayChartData,
                            color2: overlayColor,
                            dataPointsColor2: overlayColor,
                            dataPointsRadius2: data.length > 20 ? 0 : 2,
                        } : {})}
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
                            pointerLabelHeight: showOverlay ? 50 : 30,
                            activatePointersOnLongPress: false,
                            autoAdjustPointerLabelPosition: true,
                            pointerLabelComponent: (items: { value?: number; fullLabel?: string; label?: string }[]) => {
                                const pointLabel = items[0]?.fullLabel || items[0]?.label || '';
                                return (
                                    <View style={styles.tooltip}>
                                        <Text style={styles.tooltipText}>
                                            {pointLabel}: {Math.round((items[0]?.value ?? 0) * 10) / 10} {unit}
                                        </Text>
                                        {showOverlay && items[1] && items[1].value !== undefined && items[1].value > 0 && (
                                            <Text style={[styles.tooltipText, { color: overlayColor }]}>
                                                1RM: {Math.round(items[1].value)} {unit}
                                            </Text>
                                        )}
                                    </View>
                                );
                            },
                        }}
                    />

                    {/* Legend when overlay active */}
                    {showOverlay && hasAnyOverlay && (
                        <View style={styles.legendRow}>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: colors.accent.primary }]} />
                                <Text style={styles.legendText}>Bodyweight</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: overlayColor }]} />
                                <Text style={styles.legendText}>Est. 1RM ({overlayExerciseName})</Text>
                            </View>
                        </View>
                    )}

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

                    {/* 1RM summary when overlay active */}
                    {showOverlay && overlayData.length >= 2 && (
                        <View style={[styles.summaryRow, { borderTopColor: overlayColor + '40' }]}>
                            <View>
                                <Text style={[styles.summaryLabel, { color: overlayColor }]}>1RM Latest</Text>
                                <Text style={[styles.summaryValue, { color: overlayColor }]}>
                                    {Math.round(overlayData[overlayData.length - 1]?.value ?? 0)} {unit}
                                </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={[styles.summaryLabel, { color: overlayColor }]}>1RM Change</Text>
                                {(() => {
                                    const first = overlayData[0].value;
                                    const last = overlayData[overlayData.length - 1].value;
                                    const diff = last - first;
                                    const sign = diff >= 0 ? '+' : '';
                                    const changeColor = diff >= 0 ? colors.accent.success : colors.accent.error;
                                    return (
                                        <Text style={[styles.summaryValue, { color: changeColor }]}>
                                            {sign}{Math.round(diff)} {unit}
                                        </Text>
                                    );
                                })()}
                            </View>
                        </View>
                    )}
                </View>
            )}

            {/* Exercise picker modal */}
            {showExercisePicker && (
                <OverlayExercisePicker
                    exercises={allExercises}
                    selectedId={overlayExerciseId}
                    onSelect={handleSelectExercise}
                    onClose={() => setShowExercisePicker(false)}
                />
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

    // Overlay toggle
    overlayRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.sm,
    },
    overlayToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
        backgroundColor: colors.background.tertiary,
    },
    overlayToggleActive: {
        backgroundColor: '#3b82f6' + '25',
    },
    overlayDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    overlayToggleText: {
        color: colors.text.secondary,
        fontSize: typography.size.xs,
        fontWeight: typography.weight.medium as '500',
    },
    overlayToggleTextActive: {
        color: '#3b82f6',
    },
    exercisePickerBtn: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.md,
        maxWidth: 160,
    },
    exercisePickerText: {
        color: colors.accent.primary,
        fontSize: typography.size.xs,
        fontWeight: typography.weight.medium as '500',
    },

    // Legend
    legendRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.lg,
        marginTop: spacing.sm,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        color: colors.text.secondary,
        fontSize: 10,
    },
});
