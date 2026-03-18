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
    getPersonalRecordDates,
    getNoteDates,
    backfillPersonalRecords,
    getFatigueDates,
    type CalendarDayData,
} from '../services';
import { getSettings, updateSettings } from '../services/preferencesService';
import DailyWorkoutModal from '../components/DailyWorkoutModal';
import JournalView from '../components/JournalView';

// ============================================================
// Types
// ============================================================

interface MonthData {
    year: number;
    month: number; // 1-indexed
    key: string;
    days: CalendarDayData[];
    prDates: Set<string>;
    noteDates: Set<string>;
    fatigueDates: Set<string>;
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
    dayNumber: number | null;
    heatmapOpacity: number;
    isToday: boolean;
    hasWorkout: boolean;
    hasPR: boolean;
    hasNote: boolean;
    hasFatigue: boolean;
    showPRFilter: boolean;
    showNoteFilter: boolean;
    showFatigueFilter: boolean;
    onPress?: () => void;
}

const DayCell = React.memo(function DayCell({
    dayNumber,
    heatmapOpacity,
    isToday,
    hasWorkout,
    hasPR,
    hasNote,
    hasFatigue,
    showPRFilter,
    showNoteFilter,
    showFatigueFilter,
    onPress,
}: DayCellProps) {
    if (dayNumber === null) {
        return <View style={styles.dayCell} />;
    }

    // Dim cells that don't match an active filter
    const filterActive = showPRFilter || showNoteFilter || showFatigueFilter;
    const matchesFilter =
        (!showPRFilter || hasPR) && (!showNoteFilter || hasNote) && (!showFatigueFilter || hasFatigue);
    const dimmed = filterActive && hasWorkout && !matchesFilter;

    return (
        <TouchableOpacity
            style={[
                styles.dayCell,
                hasWorkout && {
                    backgroundColor: `rgba(168, 85, 247, ${dimmed ? heatmapOpacity * 0.25 : heatmapOpacity})`,
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
                    dimmed && styles.dimmedDayText,
                ]}
            >
                {dayNumber}
            </Text>

            {/* PR star indicator */}
            {hasPR && showPRFilter && (
                <Text style={styles.prIndicator}>⭐</Text>
            )}

            {/* Note dot indicator */}
            {hasNote && showNoteFilter && (
                <View style={styles.noteDot} />
            )}

            {/* Fatigue dot indicator */}
            {hasFatigue && showFatigueFilter && (
                <View style={styles.fatigueDot} />
            )}
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
    showPRFilter: boolean;
    showNoteFilter: boolean;
    showFatigueFilter: boolean;
    onDayPress: (date: string) => void;
}

const MonthBlock = React.memo(function MonthBlock({
    monthData,
    startDay,
    heatmapMetric,
    globalMin,
    globalMax,
    todayStr,
    showPRFilter,
    showNoteFilter,
    showFatigueFilter,
    onDayPress,
}: MonthBlockProps) {
    const { year, month, days, prDates, noteDates, fatigueDates } = monthData;
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

                    const hasPR = cell.date ? prDates.has(cell.date) : false;
                    const hasNote = cell.date ? noteDates.has(cell.date) : false;
                    const hasFatigue = cell.date ? fatigueDates.has(cell.date) : false;

                    return (
                        <DayCell
                            key={i}
                            dayNumber={cell.dayNumber}
                            heatmapOpacity={opacity}
                            isToday={isToday}
                            hasWorkout={hasWorkout}
                            hasPR={hasPR}
                            hasNote={hasNote}
                            hasFatigue={hasFatigue}
                            showPRFilter={showPRFilter}
                            showNoteFilter={showNoteFilter}
                            showFatigueFilter={showFatigueFilter}
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

const METRIC_OPTIONS = [
    { key: 'volume', label: 'Volume' },
    { key: 'sets', label: 'Sets' },
    { key: 'duration', label: 'Duration' },
] as const;

const START_DAY_OPTIONS = [
    { key: 'sunday', label: 'Sun' },
    { key: 'monday', label: 'Mon' },
] as const;

interface CalendarHeaderProps {
    streak: number;
    restDays: number;
    heatmapMetric: string;
    startDay: string;
    showPRFilter: boolean;
    showNoteFilter: boolean;
    showFatigueFilter: boolean;
    showJournalView: boolean;
    onMetricChange: (metric: string) => void;
    onStartDayChange: (day: string) => void;
    onPRFilterToggle: () => void;
    onNoteFilterToggle: () => void;
    onFatigueFilterToggle: () => void;
    onJournalViewToggle: () => void;
}

function CalendarHeader({
    streak,
    restDays,
    heatmapMetric,
    startDay,
    showPRFilter,
    showNoteFilter,
    showFatigueFilter,
    showJournalView,
    onMetricChange,
    onStartDayChange,
    onPRFilterToggle,
    onNoteFilterToggle,
    onFatigueFilterToggle,
    onJournalViewToggle,
}: CalendarHeaderProps) {
    return (
        <View style={styles.headerContainer}>
            {/* Streak and rest day badges */}
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

            {/* Metric toggle pills + start day toggle */}
            <View style={styles.controlsRow}>
                {/* Metric pills */}
                <View style={styles.pillRow}>
                    {METRIC_OPTIONS.map((opt) => (
                        <TouchableOpacity
                            key={opt.key}
                            style={[
                                styles.pill,
                                heatmapMetric === opt.key && styles.pillActive,
                            ]}
                            onPress={() => onMetricChange(opt.key)}
                            activeOpacity={0.7}
                        >
                            <Text
                                style={[
                                    styles.pillText,
                                    heatmapMetric === opt.key && styles.pillTextActive,
                                ]}
                            >
                                {opt.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Start day toggle */}
                <View style={styles.startDayToggle}>
                    {START_DAY_OPTIONS.map((opt) => (
                        <TouchableOpacity
                            key={opt.key}
                            style={[
                                styles.startDayPill,
                                startDay === opt.key && styles.startDayPillActive,
                            ]}
                            onPress={() => onStartDayChange(opt.key)}
                            activeOpacity={0.7}
                        >
                            <Text
                                style={[
                                    styles.startDayText,
                                    startDay === opt.key && styles.startDayTextActive,
                                ]}
                            >
                                {opt.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Filter toggles row */}
            <View style={styles.filterRow}>
                <TouchableOpacity
                    style={[
                        styles.filterPill,
                        showPRFilter && styles.filterPillActive,
                    ]}
                    onPress={onPRFilterToggle}
                    activeOpacity={0.7}
                >
                    <Text
                        style={[
                            styles.filterPillText,
                            showPRFilter && styles.filterPillTextActive,
                        ]}
                    >
                        🏆 PRs
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.filterPill,
                        showNoteFilter && styles.filterPillActive,
                    ]}
                    onPress={onNoteFilterToggle}
                    activeOpacity={0.7}
                >
                    <Text
                        style={[
                            styles.filterPillText,
                            showNoteFilter && styles.filterPillTextActive,
                        ]}
                    >
                        📝 Notes
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.filterPill,
                        showFatigueFilter && styles.filterPillActive,
                    ]}
                    onPress={onFatigueFilterToggle}
                    activeOpacity={0.7}
                >
                    <Text
                        style={[
                            styles.filterPillText,
                            showFatigueFilter && styles.filterPillTextActive,
                        ]}
                    >
                        ⚡ Fatigue
                    </Text>
                </TouchableOpacity>

                {/* Journal toggle — only visible when Notes is active */}
                {showNoteFilter && (
                    <TouchableOpacity
                        style={[
                            styles.filterPill,
                            showJournalView && styles.journalPillActive,
                        ]}
                        onPress={onJournalViewToggle}
                        activeOpacity={0.7}
                    >
                        <Text
                            style={[
                                styles.filterPillText,
                                showJournalView && styles.journalPillTextActive,
                            ]}
                        >
                            📖 Journal
                        </Text>
                    </TouchableOpacity>
                )}
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
    const [showPRFilter, setShowPRFilter] = useState(false);
    const [showNoteFilter, setShowNoteFilter] = useState(false);
    const [showFatigueFilter, setShowFatigueFilter] = useState(false);
    const [showJournalView, setShowJournalView] = useState(false);

    const flatListRef = useRef<FlatList>(null);
    const isLoadingOlderRef = useRef(false);

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
        const [days, prDates, noteDates, fatigueDates] = await Promise.all([
            getWorkoutsForMonth(year, month),
            getPersonalRecordDates(year, month),
            getNoteDates(year, month),
            getFatigueDates(year, month),
        ]);
        return { year, month, key: monthKey(year, month), days, prDates, noteDates, fatigueDates };
    }, []);

    // Initial load: current month + several past months
    useEffect(() => {
        async function loadInitial() {
            setLoading(true);

            // Trigger PR backfill (idempotent, runs once)
            backfillPersonalRecords();

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

            // Scroll to the current month (last item) after render
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: false });
            }, 100);
        }

        loadInitial();
    }, [loadMonthData]);

    // Load more months when scrolling up (past)
    const loadOlderMonths = useCallback(async () => {
        if (isLoadingOlderRef.current || loadingMore || months.length === 0) return;
        isLoadingOlderRef.current = true;
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

        // Cooldown: prevent re-triggering for 500ms after prepend settles
        setTimeout(() => {
            isLoadingOlderRef.current = false;
        }, 500);
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
        // Only trigger when user is very near the top AND no load is in progress
        if (y < 100 && !isLoadingOlderRef.current && !loadingMore && months.length > 0) {
            loadOlderMonths();
        }
    }, [loadOlderMonths, loadingMore, months.length]);

    // ------------------------------------------------
    // Day press handler (placeholder for Phase B modal)
    // ------------------------------------------------

    const handleDayPress = useCallback((date: string) => {
        setSelectedDate(date);
    }, []);

    const handleCloseModal = useCallback(() => {
        setSelectedDate(null);
    }, []);

    const handleMetricChange = useCallback((metric: string) => {
        setHeatmapMetric(metric);
        updateSettings({ calendarHeatmapMetric: metric });
    }, []);

    const handleStartDayChange = useCallback((day: string) => {
        setStartDay(day);
        updateSettings({ calendarStartDay: day });
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
            showPRFilter={showPRFilter}
            showNoteFilter={showNoteFilter}
            showFatigueFilter={showFatigueFilter}
            onDayPress={handleDayPress}
        />
    ), [startDay, heatmapMetric, globalMin, globalMax, todayStr, showPRFilter, showNoteFilter, showFatigueFilter, handleDayPress]);

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
            <CalendarHeader
                streak={streak}
                restDays={restDays}
                heatmapMetric={heatmapMetric}
                startDay={startDay}
                showPRFilter={showPRFilter}
                showNoteFilter={showNoteFilter}
                showFatigueFilter={showFatigueFilter}
                showJournalView={showJournalView}
                onMetricChange={handleMetricChange}
                onStartDayChange={handleStartDayChange}
                onPRFilterToggle={() => setShowPRFilter(prev => !prev)}
                onNoteFilterToggle={() => {
                    setShowNoteFilter(prev => {
                        if (prev) setShowJournalView(false); // Reset journal when Notes toggled off
                        return !prev;
                    });
                }}
                onFatigueFilterToggle={() => setShowFatigueFilter(prev => !prev)}
                onJournalViewToggle={() => setShowJournalView(prev => !prev)}
            />

            {/* Conditional: Journal View or Calendar Grid */}
            {showNoteFilter && showJournalView ? (
                <JournalView />
            ) : (
                <>
                    <FlatList
                        ref={flatListRef}
                        data={months}
                        renderItem={renderMonthBlock}
                        keyExtractor={(item) => item.key}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        maintainVisibleContentPosition={{
                            minIndexForVisible: 0,
                        }}
                        onScroll={handleScroll}
                        scrollEventThrottle={200}
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

                    <DailyWorkoutModal
                        date={selectedDate}
                        onClose={handleCloseModal}
                    />
                </>
            )}
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

    // Controls row (metric pills + start day toggle)
    controlsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.sm,
    },
    pillRow: {
        flexDirection: 'row',
        gap: spacing.xs,
    },
    pill: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
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
        color: '#ffffff',
        fontWeight: typography.weight.semibold,
    },
    startDayToggle: {
        flexDirection: 'row',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.full,
        padding: 2,
    },
    startDayPill: {
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
    },
    startDayPillActive: {
        backgroundColor: colors.background.tertiary,
    },
    startDayText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.medium,
        color: colors.text.disabled,
    },
    startDayTextActive: {
        color: colors.text.primary,
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
    dimmedDayText: {
        opacity: 0.4,
    },
    prIndicator: {
        position: 'absolute',
        top: 1,
        right: 2,
        fontSize: 8,
    },
    noteDot: {
        position: 'absolute',
        bottom: 3,
        right: 3,
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: colors.accent.warning,
    },

    // Filter pills
    filterRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
    filterPill: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
        borderRadius: borderRadius.full,
        backgroundColor: colors.background.secondary,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    filterPillActive: {
        borderColor: colors.accent.primary,
        backgroundColor: 'rgba(168, 85, 247, 0.15)',
    },
    filterPillText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
    },
    filterPillTextActive: {
        color: colors.accent.tertiary,
        fontWeight: typography.weight.semibold,
    },

    // Fatigue dot (bottom-left, red/orange)
    fatigueDot: {
        position: 'absolute',
        bottom: 3,
        left: 3,
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: '#EF4444',
    },

    // Journal pill (distinct teal color when active)
    journalPillActive: {
        borderColor: '#14B8A6',
        backgroundColor: 'rgba(20, 184, 166, 0.15)',
    },
    journalPillTextActive: {
        color: '#5EEAD4',
        fontWeight: typography.weight.semibold,
    },
});
