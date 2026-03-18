/**
 * Calendar Component Types & Helpers
 *
 * Shared types and pure helper functions used across the calendar
 * component family (CalendarScreen, CalendarHeader, MonthBlock, DayCell).
 */

import type { CalendarDayData } from '../../services';

// ============================================================
// Types
// ============================================================

export interface MonthData {
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

export const DAY_LABELS_SUNDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAY_LABELS_MONDAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

export const INITIAL_MONTHS_TO_LOAD = 6; // Load current month + 5 past
export const MONTHS_TO_LOAD_ON_SCROLL = 3;

export const METRIC_OPTIONS = [
    { key: 'volume', label: 'Volume' },
    { key: 'sets', label: 'Sets' },
    { key: 'duration', label: 'Duration' },
] as const;

export const START_DAY_OPTIONS = [
    { key: 'sunday', label: 'Sun' },
    { key: 'monday', label: 'Mon' },
] as const;

// ============================================================
// Pure helpers
// ============================================================

/** Get a month key like "2026-03" */
export function monthKey(year: number, month: number): string {
    return `${year}-${String(month).padStart(2, '0')}`;
}

/** Get the previous month (year, month) tuple */
export function prevMonth(year: number, month: number): [number, number] {
    return month === 1 ? [year - 1, 12] : [year, month - 1];
}

/** Get the next month (year, month) tuple */
export function nextMonth(year: number, month: number): [number, number] {
    return month === 12 ? [year + 1, 1] : [year, month + 1];
}

/** Get the number of days in a month */
export function daysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
}

/**
 * Get the day-of-week index (0-6) for the first day of the month,
 * adjusted for the user's configured start day.
 */
export function getFirstDayOffset(year: number, month: number, startDay: string): number {
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
export function getHeatmapOpacity(value: number, min: number, max: number): number {
    if (max === min) return 0.6; // Single value
    const normalized = (value - min) / (max - min);
    return 0.15 + normalized * 0.85; // Range: 0.15 to 1.0
}

/**
 * Extract the heatmap value from a CalendarDayData based on the selected metric.
 */
export function getMetricValue(day: CalendarDayData, metric: string): number {
    switch (metric) {
        case 'sets': return day.totalSets;
        case 'duration': return day.totalDuration;
        case 'volume':
        default: return day.totalVolume;
    }
}
