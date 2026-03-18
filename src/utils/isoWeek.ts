/**
 * ISO 8601 Week Utilities
 *
 * Shared helpers for ISO week number, week-year, and week key calculation.
 * Used by both analyticsService (streak computation) and calendarService
 * (streak computation).
 *
 * These functions compute ISO weeks entirely in JS to avoid mismatch with
 * SQLite's strftime('%W') which uses non-ISO (Sunday/Monday-start) numbering
 * and disagrees with JS ISO week helpers near year boundaries (BH-001).
 */

/** Get ISO 8601 week number for a date */
export function getISOWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Get ISO 8601 week-year for a date.
 * The ISO week-year can differ from the calendar year near Jan 1 / Dec 31.
 * E.g., Dec 31, 2024 is in ISO week 1 of 2025.
 */
export function getISOWeekYear(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    return d.getUTCFullYear();
}

/** Build an ISO week key like "2026-W11" from a Date */
export function toISOWeekKey(date: Date): string {
    return `${getISOWeekYear(date)}-W${String(getISOWeekNumber(date)).padStart(2, '0')}`;
}
