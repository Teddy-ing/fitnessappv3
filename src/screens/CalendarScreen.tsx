/**
 * Calendar Screen
 *
 * Heatmap calendar view showing workout history with purple intensity
 * gradient. Supports infinite scrolling of month blocks and configurable
 * start day / heatmap metric.
 *
 * Entry point: Profile → Workout Calendar button
 *
 * Sub-components extracted to src/components/calendar/:
 * - CalendarHeader: streak/rest badges, metric/filter/start-day controls
 * - MonthBlock: month grid with DayCell sub-component
 * - types.ts: shared types (MonthData) and pure helpers
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../theme';
import {
    getWorkoutsForMonth,
    getWorkoutStreak,
    getRestDaysThisWeek,
    getPersonalRecordDates,
    getNoteDates,
    backfillPersonalRecords,
    getFatigueDates,
} from '../services';
import { getSettings, updateSettings } from '../services/preferencesService';
import DailyWorkoutModal from '../components/DailyWorkoutModal';
import JournalView from '../components/JournalView';
import {
    CalendarHeader,
    MonthBlock,
    type MonthData,
    monthKey,
    prevMonth,
    nextMonth,
    getMetricValue,
    INITIAL_MONTHS_TO_LOAD,
    MONTHS_TO_LOAD_ON_SCROLL,
} from '../components/calendar';

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
        // Compute all target months first, then load in parallel (PP-020 fix)
        const targets: Array<[number, number]> = [];
        let [y, m] = prevMonth(oldest.year, oldest.month);
        for (let i = 0; i < MONTHS_TO_LOAD_ON_SCROLL; i++) {
            targets.push([y, m]);
            [y, m] = prevMonth(y, m);
        }

        const newMonths = await Promise.all(
            targets.map(([ty, tm]) => loadMonthData(ty, tm)),
        );

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

        // Compute all target months first, then load in parallel (PP-020 fix)
        const targets: Array<[number, number]> = [];
        let [y, m] = nextMonth(newest.year, newest.month);
        for (let i = 0; i < MONTHS_TO_LOAD_ON_SCROLL; i++) {
            if (y > currentYear || (y === currentYear && m > currentMonth)) break;
            targets.push([y, m]);
            [y, m] = nextMonth(y, m);
        }

        const newMonths = await Promise.all(
            targets.map(([ty, tm]) => loadMonthData(ty, tm)),
        );

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
    // Handlers
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
});
