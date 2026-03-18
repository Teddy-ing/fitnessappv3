/**
 * MonthBlock + DayCell
 *
 * Renders a single month grid in the calendar heatmap.
 * Each day cell shows workout intensity, PR/note/fatigue indicators.
 *
 * Extracted from CalendarScreen.tsx to satisfy the 600-line guardrail.
 */

import React, { useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme';
import type { CalendarDayData } from '../../services';
import {
    type MonthData,
    DAY_LABELS_SUNDAY,
    DAY_LABELS_MONDAY,
    MONTH_NAMES,
    daysInMonth,
    getFirstDayOffset,
    getMetricValue,
    getHeatmapOpacity,
} from './types';

// ============================================================
// Component: DayCell
// ============================================================

interface DayCellProps {
    dayNumber: number | null;
    date: string | null;
    heatmapOpacity: number;
    isToday: boolean;
    hasWorkout: boolean;
    hasPR: boolean;
    hasNote: boolean;
    hasFatigue: boolean;
    showPRFilter: boolean;
    showNoteFilter: boolean;
    showFatigueFilter: boolean;
    onDayPress: (date: string) => void;
}

const DayCell = React.memo(function DayCell({
    dayNumber,
    date,
    heatmapOpacity,
    isToday,
    hasWorkout,
    hasPR,
    hasNote,
    hasFatigue,
    showPRFilter,
    showNoteFilter,
    showFatigueFilter,
    onDayPress,
}: DayCellProps) {
    // PP-019 fix: callback lives inside the memoized component,
    // so the parent never creates per-cell closures.
    const handlePress = useCallback(() => {
        if (date) onDayPress(date);
    }, [date, onDayPress]);

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
            onPress={handlePress}
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
                            date={cell.date}
                            heatmapOpacity={opacity}
                            isToday={isToday}
                            hasWorkout={hasWorkout}
                            hasPR={hasPR}
                            hasNote={hasNote}
                            hasFatigue={hasFatigue}
                            showPRFilter={showPRFilter}
                            showNoteFilter={showNoteFilter}
                            showFatigueFilter={showFatigueFilter}
                            onDayPress={onDayPress}
                        />
                    );
                })}
            </View>
        </View>
    );
});

export default MonthBlock;

// ============================================================
// Styles
// ============================================================

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_PADDING = spacing.md * 2; // paddingHorizontal on listContent
const CELL_WIDTH = Math.floor((SCREEN_WIDTH - GRID_PADDING) / 7);
const CELL_GAP = 3;

const styles = StyleSheet.create({
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
});
