/**
 * Calendar Screen
 *
 * Heatmap calendar view showing workout history with purple intensity
 * gradient. Supports infinite scrolling of month blocks and configurable
 * start day / heatmap metric.
 *
 * Entry point: Profile → Workout Calendar button
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '../theme';
import {
    getWorkoutsForMonth,
    getWorkoutStreak,
    getRestDaysThisWeek,
    type CalendarDayData,
} from '../services';
import { getSettings } from '../services/preferencesService';

// ============================================================
// Types
// ============================================================

interface MonthData {
    year: number;
    month: number; // 1-indexed
    key: string;
    days: CalendarDayData[];
}

// ============================================================
// Constants
// ============================================================

const DAY_LABELS_SUNDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_LABELS_MONDAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const INITIAL_MONTHS_TO_LOAD = 6; // Load current month + 5 past
const MONTHS_TO_LOAD_ON_SCROLL = 3;

// ============================================================
// Helpers
// ============================================================

/** Get a month key like "2026-03" */
function monthKey(year: number, month: number): string {
    return `${year}-${String(month).padStart(2, '0')}`;
}

/** Get the previous month (year, month) tuple */
function prevMonth(year: number, month: number): [number, number] {
    return month === 1 ? [year - 1, 12] : [year, month - 1];
}

/** Get the next month (year, month) tuple */
function nextMonth(year: number, month: number): [number, number] {
    return month === 12 ? [year + 1, 1] : [year, month + 1];
}

/** Get the number of days in a month */
function daysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
}

/**
 * Get the day-of-week index (0-6) for the first day of the month,
 * adjusted for the user's configured start day.
 */
function getFirstDayOffset(year: number, month: number, startDay: string): number {
    // JS: 0=Sunday, 1=Monday, ..., 6=Saturday
    const firstDayJS = new Date(year, month - 1, 1).getDay();

    if (startDay === 'monday') {
        // Shift so Monday=0, Sunday=6
        return firstDayJS === 0 ? 6 : firstDayJS - 1;
    }
    // Sunday start: already 0-indexed correctly
    return firstDayJS;
}

/**
 * Map a metric value to an opacity (0.15 – 1.0) using min-max normalization.
 */
function getHeatmapOpacity(value: number, min: number, max: number): number {
    if (max === min) return 0.6; // Single value
    const normalized = (value - min) / (max - min);
    return 0.15 + normalized * 0.85; // Range: 0.15 to 1.0
}

/**
 * Extract the heatmap value from a CalendarDayData based on the selected metric.
 */
function getMetricValue(day: CalendarDayData, metric: string): number {
    switch (metric) {
        case 'sets': return day.totalSets;
        case 'duration': return day.totalDuration;
        case 'volume':
        default: return day.totalVolume;
    }
}

// ============================================================
// Component: DayCell
// ============================================================

interface DayCellProps {
    dayNumber: number | null; // null for empty padding cells
    heatmapOpacity: number;
    isToday: boolean;
    hasWorkout: boolean;
    onPress?: () => void;
}

const DayCell = React.memo(function DayCell({
    dayNumber,
    heatmapOpacity,
    isToday,
    hasWorkout,
    onPress,
}: DayCellProps) {
    if (dayNumber === null) {
        return <View style={styles.dayCell} />;
    }

    return (
        <TouchableOpacity
            style={[
                styles.dayCell,
                hasWorkout && {
                    backgroundColor: `rgba(168, 85, 247, ${heatmapOpacity})`,
                },
                isToday && styles.todayCell,
            ]}
            onPress={onPress}
            disabled={!hasWorkout}
            activeOpacity={0.7}
        >
            <Text
                style={[
                    styles.dayText,
                    isToday && styles.todayText,
                    hasWorkout && styles.workoutDayText,
                ]}
            >
                {dayNumber}
            </Text>
        </TouchableOpacity>
    );
});

// ============================================================
// Component: MonthBlock
// ============================================================

interface MonthBlockProps {
    monthData: MonthData;
    startDay: string;
    heatmapMetric: string;
    globalMin: number;
    globalMax: number;
    todayStr: string;
    onDayPress: (date: string) => void;
}

const MonthBlock = React.memo(function MonthBlock({
    monthData,
    startDay,
    heatmapMetric,
    globalMin,
    globalMax,
    todayStr,
    onDayPress,
}: MonthBlockProps) {
    const { year, month, days } = monthData;
    const totalDays = daysInMonth(year, month);
    const firstDayOffset = getFirstDayOffset(year, month, startDay);
    const dayLabels = startDay === 'monday' ? DAY_LABELS_MONDAY : DAY_LABELS_SUNDAY;

    // Build a lookup map: day number → CalendarDayData
    const dayMap = useMemo(() => {
        const map = new Map<number, CalendarDayData>();
        for (const d of days) {
            const dayNum = parseInt(d.date.split('-')[2], 10);
            map.set(dayNum, d);
        }
        return map;
    }, [days]);

    // Build grid cells: offset blanks + actual days
    const cells: Array<{ dayNumber: number | null; date: string | null }> = [];

    // Leading empty cells
    for (let i = 0; i < firstDayOffset; i++) {
        cells.push({ dayNumber: null, date: null });
    }

    // Actual days
    for (let d = 1; d <= totalDays; d++) {
        const monthStr = String(month).padStart(2, '0');
        const dayStr = String(d).padStart(2, '0');
        cells.push({
            dayNumber: d,
            date: `${year}-${monthStr}-${dayStr}`,
        });
    }

    return (
        <View style={styles.monthBlock}>
            <Text style={styles.monthHeader}>
                {MONTH_NAMES[month - 1]} {year}
            </Text>

            {/* Day-of-week headers */}
            <View style={styles.dayHeaderRow}>
                {dayLabels.map((label) => (
                    <View key={label} style={styles.dayHeaderCell}>
                        <Text style={styles.dayHeaderText}>{label}</Text>
                    </View>
                ))}
            </View>

            {/* Day grid — 7-column rows */}
            <View style={styles.dayGrid}>
                {cells.map((cell, i) => {
                    const dayData = cell.dayNumber ? dayMap.get(cell.dayNumber) : undefined;
                    const hasWorkout = !!dayData;
                    const metricValue = dayData ? getMetricValue(dayData, heatmapMetric) : 0;
                    const opacity = hasWorkout
                        ? getHeatmapOpacity(metricValue, globalMin, globalMax)
                        : 0;
                    const isToday = cell.date === todayStr;

                    return (
                        <DayCell
                            key={i}
                            dayNumber={cell.dayNumber}
                            heatmapOpacity={opacity}
                            isToday={isToday}
                            hasWorkout={hasWorkout}
                            onPress={
                                hasWorkout && cell.date
                                    ? () => onDayPress(cell.date!)
                                    : undefined
                            }
                        />
                    );
                })}
            </View>
        </View>
    );
});

// ============================================================
// Component: CalendarHeader
// ============================================================

interface CalendarHeaderProps {
    streak: number;
    restDays: number;
}

function CalendarHeader({ streak, restDays }: CalendarHeaderProps) {
    return (
        <View style={styles.headerContainer}>
            <View style={styles.headerBadges}>
                {streak > 0 && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                            🔥 {streak} Week Streak
                        </Text>
                    </View>
                )}
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                        🛌 {restDays} Rest Day{restDays !== 1 ? 's' : ''}
                    </Text>
                </View>
            </View>
        </View>
    );
}

// ============================================================
// Main Screen
// ============================================================

export default function CalendarScreen() {
    // State
    const [months, setMonths] = useState<MonthData[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [streak, setStreak] = useState(0);
    const [restDays, setRestDays] = useState(0);
    const [startDay, setStartDay] = useState('sunday');
    const [heatmapMetric, setHeatmapMetric] = useState('volume');
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    const flatListRef = useRef<FlatList>(null);

    // Today's date string for highlighting
    const todayStr = useMemo(() => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }, []);

    // Global min/max for heatmap normalization
    const { globalMin, globalMax } = useMemo(() => {
        let min = Infinity;
        let max = -Infinity;

        for (const m of months) {
            for (const d of m.days) {
                const val = getMetricValue(d, heatmapMetric);
                if (val < min) min = val;
                if (val > max) max = val;
            }
        }

        if (min === Infinity) { min = 0; max = 0; }
        return { globalMin: min, globalMax: max };
    }, [months, heatmapMetric]);

    // ------------------------------------------------
    // Data loading
    // ------------------------------------------------

    const loadMonthData = useCallback(async (year: number, month: number): Promise<MonthData> => {
        const days = await getWorkoutsForMonth(year, month);
        return { year, month, key: monthKey(year, month), days };
    }, []);

    // Initial load: current month + several past months
    useEffect(() => {
        async function loadInitial() {
            setLoading(true);

            // Load settings
            const settings = await getSettings();
            setStartDay(settings.calendarStartDay);
            setHeatmapMetric(settings.calendarHeatmapMetric);

            // Load streak and rest days
            const [streakVal, restVal] = await Promise.all([
                getWorkoutStreak(),
                getRestDaysThisWeek(),
            ]);
            setStreak(streakVal);
            setRestDays(restVal);

            // Load months
            const now = new Date();
            let y = now.getFullYear();
            let m = now.getMonth() + 1; // 1-indexed

            const monthPromises: Promise<MonthData>[] = [];
            for (let i = 0; i < INITIAL_MONTHS_TO_LOAD; i++) {
                monthPromises.push(loadMonthData(y, m));
                [y, m] = prevMonth(y, m);
            }

            const loadedMonths = await Promise.all(monthPromises);
            // Reverse so oldest is first (scroll down = newer)
            setMonths(loadedMonths.reverse());
            setLoading(false);
        }

        loadInitial();
    }, [loadMonthData]);

    // Load more months when scrolling up (past)
    const loadOlderMonths = useCallback(async () => {
        if (loadingMore || months.length === 0) return;
        setLoadingMore(true);

        const oldest = months[0];
        let [y, m] = prevMonth(oldest.year, oldest.month);

        const newMonths: MonthData[] = [];
        for (let i = 0; i < MONTHS_TO_LOAD_ON_SCROLL; i++) {
            const monthData = await loadMonthData(y, m);
            newMonths.push(monthData);
            [y, m] = prevMonth(y, m);
        }

        // Prepend older months (reversed so oldest is first)
        setMonths(prev => [...newMonths.reverse(), ...prev]);
        setLoadingMore(false);
    }, [loadingMore, months, loadMonthData]);

    // Load more months when scrolling down (future)
    const loadNewerMonths = useCallback(async () => {
        if (loadingMore || months.length === 0) return;

        const newest = months[months.length - 1];
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        // Don't load beyond current month
        if (newest.year === currentYear && newest.month === currentMonth) return;

        setLoadingMore(true);

        let [y, m] = nextMonth(newest.year, newest.month);
        const newMonths: MonthData[] = [];
        for (let i = 0; i < MONTHS_TO_LOAD_ON_SCROLL; i++) {
            if (y > currentYear || (y === currentYear && m > currentMonth)) break;
            const monthData = await loadMonthData(y, m);
            newMonths.push(monthData);
            [y, m] = nextMonth(y, m);
        }

        setMonths(prev => [...prev, ...newMonths]);
        setLoadingMore(false);
    }, [loadingMore, months, loadMonthData]);

    // ------------------------------------------------
    // Scroll handler for loading older months at the top
    // ------------------------------------------------

    const handleScroll = useCallback((event: { nativeEvent: { contentOffset: { y: number } } }) => {
        const { y } = event.nativeEvent.contentOffset;
        // When user scrolls near the top (within 200px), load older months
        if (y < 200 && !loadingMore && months.length > 0) {
            loadOlderMonths();
        }
    }, [loadOlderMonths, loadingMore, months.length]);

    // ------------------------------------------------
    // Day press handler (placeholder for Phase B modal)
    // ------------------------------------------------

    const handleDayPress = useCallback((date: string) => {
        setSelectedDate(date);
        // Phase B will open the DailyWorkoutModal here
        console.log('[Calendar] Day pressed:', date);
    }, []);

    // ------------------------------------------------
    // Render
    // ------------------------------------------------

    const renderMonthBlock = useCallback(({ item }: { item: MonthData }) => (
        <MonthBlock
            monthData={item}
            startDay={startDay}
            heatmapMetric={heatmapMetric}
            globalMin={globalMin}
            globalMax={globalMax}
            todayStr={todayStr}
            onDayPress={handleDayPress}
        />
    ), [startDay, heatmapMetric, globalMin, globalMax, todayStr, handleDayPress]);

    if (loading) {
        return (
            <SafeAreaView edges={['bottom']} style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.accent.primary} />
                    <Text style={styles.loadingText}>Loading calendar...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView edges={['bottom']} style={styles.container}>
            <CalendarHeader streak={streak} restDays={restDays} />

            <FlatList
                ref={flatListRef}
                data={months}
                renderItem={renderMonthBlock}
                keyExtractor={(item) => item.key}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                // Detect scroll near top to load older months
                onScroll={handleScroll}
                scrollEventThrottle={100}
                // Load newer months when reaching the bottom
                onEndReached={loadNewerMonths}
                onEndReachedThreshold={0.5}
                ListHeaderComponent={
                    loadingMore ? (
                        <View style={styles.loadingMore}>
                            <ActivityIndicator size="small" color={colors.accent.primary} />
                        </View>
                    ) : null
                }
            />
        </SafeAreaView>
    );
}

// ============================================================
// Styles
// ============================================================

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_PADDING = spacing.md * 2; // paddingHorizontal on listContent
const CELL_WIDTH = Math.floor((SCREEN_WIDTH - GRID_PADDING) / 7);
const CELL_GAP = 3;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.primary,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        marginTop: spacing.md,
    },
    loadingMore: {
        padding: spacing.md,
        alignItems: 'center',
    },
    listContent: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.xl,
    },

    // Header
    headerContainer: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerBadges: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    badge: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
    },
    badgeText: {
        color: colors.text.primary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
    },

    // Month block
    monthBlock: {
        marginTop: spacing.lg,
    },
    monthHeader: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },

    // Day headers
    dayHeaderRow: {
        flexDirection: 'row',
        marginBottom: spacing.xs,
    },
    dayHeaderCell: {
        flex: 1,
        alignItems: 'center',
    },
    dayHeaderText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
    },

    // Day grid
    dayGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: CELL_WIDTH,
        height: CELL_WIDTH,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: borderRadius.sm,
        marginBottom: CELL_GAP,
    },
    todayCell: {
        borderWidth: 2,
        borderColor: colors.accent.primary,
    },
    dayText: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        fontWeight: typography.weight.regular,
    },
    todayText: {
        color: colors.accent.primary,
        fontWeight: typography.weight.bold,
    },
    workoutDayText: {
        color: colors.text.primary,
        fontWeight: typography.weight.medium,
    },
});
