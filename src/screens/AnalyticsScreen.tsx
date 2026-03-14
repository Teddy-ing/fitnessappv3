/**
 * Analytics Screen
 *
 * Hub for workout analytics with two tabs:
 * - Workouts: Macro-level analytics with dual-axis controller and bar chart
 * - Exercises: Per-exercise analytics (placeholder for now)
 *
 * Accessed from ProfileScreen → stack navigation push.
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
    TextInput,
    FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart } from 'react-native-gifted-charts';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, borderRadius, typography } from '../theme';
import { useMacroAnalytics } from '../hooks/useMacroAnalytics';
import ConsistencyCards from '../components/ConsistencyCards';
import MuscleDistributionChart from '../components/MuscleDistributionChart';
import FatigueRatioBanner from '../components/FatigueRatioBanner';

import {
    MetricType,
    TimeBucket,
    ChartRange,
    PerformedExercise,
    METRIC_LABELS,
    TIME_BUCKET_LABELS,
    CHART_RANGE_LABELS,
} from '../models/analytics';
import { getPerformedExercises } from '../services/analyticsService';
import type { ProfileStackParamList } from '../navigation/AppNavigator';

type AnalyticsTab = 'workouts' | 'breakdown' | 'exercises';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - spacing.md * 2 - spacing.md * 2; // screen padding + card padding

const METRICS: MetricType[] = ['volume', 'sets', 'reps', 'duration'];
const TIME_BUCKETS: TimeBucket[] = ['per_workout', 'per_week', 'per_month', 'per_year'];
const CHART_RANGES: ChartRange[] = ['1M', '3M', '6M', '1Y', 'ALL'];

// ============================================================
// Sub-components
// ============================================================

/** Top-level tab switcher: Workouts | Breakdown | Exercises */
function TabControl({
    activeTab,
    onTabChange,
}: {
    activeTab: AnalyticsTab;
    onTabChange: (tab: AnalyticsTab) => void;
}) {
    const tabs: { key: AnalyticsTab; label: string }[] = [
        { key: 'workouts', label: 'Workouts' },
        { key: 'breakdown', label: 'Breakdown' },
        { key: 'exercises', label: 'Exercises' },
    ];

    return (
        <View style={styles.tabControl}>
            {tabs.map((t) => (
                <TouchableOpacity
                    key={t.key}
                    style={[styles.tab, activeTab === t.key && styles.tabActive]}
                    onPress={() => onTabChange(t.key)}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>
                        {t.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

/** Segmented control for metric selection (Volume | Sets | Reps | Duration) */
function MetricSelector({
    selected,
    onSelect,
}: {
    selected: MetricType;
    onSelect: (m: MetricType) => void;
}) {
    return (
        <View style={styles.segmentedControl}>
            {METRICS.map((m) => (
                <TouchableOpacity
                    key={m}
                    style={[styles.segment, selected === m && styles.segmentActive]}
                    onPress={() => onSelect(m)}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.segmentText, selected === m && styles.segmentTextActive]}>
                        {METRIC_LABELS[m]}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

/** Scrollable pill row for time bucket or chart range */
function PillRow<T extends string>({
    items,
    labels,
    selected,
    onSelect,
}: {
    items: T[];
    labels: Record<T, string>;
    selected: T;
    onSelect: (item: T) => void;
}) {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillRow}
        >
            {items.map((item) => (
                <TouchableOpacity
                    key={item}
                    style={[styles.pill, selected === item && styles.pillActive]}
                    onPress={() => onSelect(item)}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.pillText, selected === item && styles.pillTextActive]}>
                        {labels[item]}
                    </Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
}

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
// Macro Analytics View
// ============================================================

function MacroAnalyticsView() {
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

    // Transform data into gifted-charts format
    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let lastMonth = '';

    const chartData = data.map((point) => {
        let displayLabel = point.label;
        let labelComp;
        if (timeBucket === 'per_workout') {
            const parts = point.label.split('/');
            if (parts.length === 2) {
                const currentMonth = parts[0];
                const currentDay = parts[1];
                if (currentMonth !== lastMonth) {
                    lastMonth = currentMonth;
                    const monthIndex = parseInt(currentMonth, 10) - 1;
                    const monthName = MONTH_NAMES[monthIndex] || currentMonth;
                    labelComp = () => (
                        <View style={{ alignItems: 'center', width: 34, marginLeft: -11, marginTop: 12 }}>
                            <Text style={[styles.axisText, { color: colors.text.primary }]}>{currentDay}</Text>
                            <Text style={[styles.axisText, { fontWeight: 'bold', color: colors.text.secondary, marginTop: 2 }]}>{monthName}</Text>
                        </View>
                    );
                } else {
                    labelComp = () => (
                        <View style={{ alignItems: 'center', width: 20, marginLeft: -4, marginTop: 12 }}>
                            <Text style={styles.axisText}>{currentDay}</Text>
                        </View>
                    );
                }
                displayLabel = currentDay;
            }
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

    // Calculate max value for proper Y-axis scaling
    const maxValue = chartData.length > 0
        ? Math.max(...chartData.map((d) => d.value)) * 1.15
        : 100;

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
// Exercises List View — 3-Layer Navigation Architecture
// ============================================================

/** Filter pill definition */
type ExerciseFilter = 'recent' | 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core';

const EXERCISE_FILTERS: { key: ExerciseFilter; label: string }[] = [
    { key: 'recent', label: 'Recent' },
    { key: 'chest', label: 'Chest' },
    { key: 'back', label: 'Back' },
    { key: 'legs', label: 'Legs' },
    { key: 'shoulders', label: 'Shoulders' },
    { key: 'arms', label: 'Arms' },
    { key: 'core', label: 'Core' },
];

/** Map composite filter pills to actual MuscleGroup values stored in DB */
function getMuscleGroupsForFilter(filter: ExerciseFilter): string[] | undefined {
    switch (filter) {
        case 'recent':
            return undefined;
        case 'chest':
            return ['chest'];
        case 'back':
            return ['back', 'lats', 'traps'];
        case 'legs':
            return ['quads', 'hamstrings', 'glutes', 'calves'];
        case 'shoulders':
            return ['shoulders'];
        case 'arms':
            return ['biceps', 'triceps', 'forearms'];
        case 'core':
            return ['core'];
    }
}

function ExerciseListView() {
    const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
    const [exercises, setExercises] = useState<PerformedExercise[]>([]);
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState<ExerciseFilter>('recent');
    const [loading, setLoading] = useState(true);

    // Re-fetch when the filter pill changes
    useEffect(() => {
        let cancelled = false;
        setLoading(true);

        const muscleGroups = getMuscleGroupsForFilter(activeFilter);
        getPerformedExercises('ALL', muscleGroups).then((result) => {
            if (!cancelled) {
                setExercises(result);
                setLoading(false);
            }
        });

        return () => { cancelled = true; };
    }, [activeFilter]);

    // Client-side search within the fetched list
    const filtered = search
        ? exercises.filter((e) =>
            e.exerciseName.toLowerCase().includes(search.toLowerCase()),
        )
        : exercises;

    const renderExerciseRow = ({ item: ex }: { item: PerformedExercise }) => (
        <TouchableOpacity
            style={styles.exerciseRow}
            activeOpacity={0.6}
            onPress={() =>
                navigation.navigate('ExerciseAnalytics', {
                    exerciseId: ex.exerciseId,
                    exerciseName: ex.exerciseName,
                })
            }
        >
            <View style={styles.exerciseIcon}>
                <MaterialIcons
                    name="fitness-center"
                    size={18}
                    color={colors.accent.primary}
                />
            </View>
            <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{ex.exerciseName}</Text>
                <Text style={styles.exerciseMeta}>
                    {ex.totalSessions} session{ex.totalSessions !== 1 ? 's' : ''}
                    {' · Last: '}
                    {new Date(ex.lastPerformed).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                    })}
                </Text>
            </View>
            <MaterialIcons
                name="chevron-right"
                size={20}
                color={colors.text.disabled}
            />
        </TouchableOpacity>
    );

    const emptyMessage = search
        ? 'No matching exercises'
        : activeFilter === 'recent'
            ? 'No exercises performed yet'
            : `No ${EXERCISE_FILTERS.find((f) => f.key === activeFilter)?.label ?? ''} exercises found`;

    return (
        <View>
            {/* Layer 1: Search Bar */}
            <View style={styles.searchContainer}>
                <MaterialIcons
                    name="search"
                    size={20}
                    color={colors.text.disabled}
                    style={styles.searchIcon}
                />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search exercises..."
                    placeholderTextColor={colors.text.disabled}
                    value={search}
                    onChangeText={setSearch}
                />
            </View>

            {/* Layer 2: Filter Pills */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterPillRow}
            >
                {EXERCISE_FILTERS.map((f) => (
                    <TouchableOpacity
                        key={f.key}
                        style={[
                            styles.filterPill,
                            activeFilter === f.key && styles.filterPillActive,
                        ]}
                        onPress={() => setActiveFilter(f.key)}
                        activeOpacity={0.7}
                    >
                        <Text
                            style={[
                                styles.filterPillText,
                                activeFilter === f.key && styles.filterPillTextActive,
                            ]}
                        >
                            {f.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Layer 3: Dynamic List */}
            {loading ? (
                <View style={styles.exerciseLoading}>
                    <ActivityIndicator size="large" color={colors.accent.primary} />
                </View>
            ) : filtered.length === 0 ? (
                <View style={styles.placeholderContainer}>
                    <MaterialIcons name="fitness-center" size={48} color={colors.text.disabled} />
                    <Text style={styles.placeholderText}>{emptyMessage}</Text>
                </View>
            ) : (
                filtered.map((ex) => (
                    <React.Fragment key={ex.exerciseId}>
                        {renderExerciseRow({ item: ex })}
                    </React.Fragment>
                ))
            )}
        </View>
    );
}

// ============================================================
// Breakdown View (Muscle Distribution)
// ============================================================

function BreakdownView() {
    const [metric, setMetric] = useState<MetricType>('volume');
    const [chartRange, setChartRange] = useState<ChartRange>('3M');

    return (
        <View>
            {/* Metric selector */}
            <MetricSelector selected={metric} onSelect={setMetric} />

            {/* Range pills */}
            <PillRow
                items={CHART_RANGES}
                labels={CHART_RANGE_LABELS}
                selected={chartRange}
                onSelect={setChartRange}
            />

            {/* Pie chart */}
            <MuscleDistributionChart metric={metric} range={chartRange} />
        </View>
    );
}

// ============================================================
// Main Screen
// ============================================================

export default function AnalyticsScreen() {
    const [activeTab, setActiveTab] = useState<AnalyticsTab>('workouts');

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <TabControl activeTab={activeTab} onTabChange={setActiveTab} />

                {activeTab === 'workouts' && <MacroAnalyticsView />}
                {activeTab === 'breakdown' && <BreakdownView />}
                {activeTab === 'exercises' && <ExerciseListView />}
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
        paddingBottom: spacing.md,
    },

    // Tab control
    tabControl: {
        flexDirection: 'row',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.xs,
        marginBottom: spacing.lg,
    },
    tab: {
        flex: 1,
        paddingVertical: spacing.sm + 2,
        alignItems: 'center',
        borderRadius: borderRadius.md,
    },
    tabActive: {
        backgroundColor: colors.accent.primary,
    },
    tabText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.text.secondary,
    },
    tabTextActive: {
        color: colors.text.primary,
    },

    // Segmented control (metric selector)
    segmentedControl: {
        flexDirection: 'row',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.md,
        padding: spacing.xs / 2,
        marginBottom: spacing.md,
    },
    segment: {
        flex: 1,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        borderRadius: borderRadius.sm + 2,
    },
    segmentActive: {
        backgroundColor: colors.background.tertiary,
    },
    segmentText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
    },
    segmentTextActive: {
        color: colors.text.primary,
        fontWeight: typography.weight.semibold,
    },

    // Pill row
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

    // Exercises list (empty) container
    placeholderContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxl * 2,
        gap: spacing.md,
    },

    // Search bar with icon
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.md,
        marginBottom: spacing.sm,
    },
    searchIcon: {
        marginRight: spacing.sm,
    },
    searchInput: {
        flex: 1,
        paddingVertical: spacing.sm + 2,
        fontSize: typography.size.sm,
        color: colors.text.primary,
    },

    // Filter pills
    filterPillRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
        marginBottom: spacing.sm,
    },
    filterPill: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        backgroundColor: colors.background.secondary,
    },
    filterPillActive: {
        backgroundColor: colors.accent.primary,
    },
    filterPillText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
    },
    filterPillTextActive: {
        color: colors.text.primary,
        fontWeight: typography.weight.semibold,
    },

    // Exercise list
    exerciseLoading: {
        paddingVertical: spacing.xxl * 2,
        alignItems: 'center',
    },
    exerciseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    exerciseIcon: {
        width: 36,
        height: 36,
        borderRadius: borderRadius.md,
        backgroundColor: colors.background.tertiary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    exerciseInfo: {
        flex: 1,
        gap: spacing.xs / 2,
    },
    exerciseName: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
    },
    exerciseMeta: {
        fontSize: typography.size.xs,
        color: colors.text.secondary,
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
