/**
 * Calendar Models
 *
 * Canonical types for calendar-related features:
 * heatmap data, journal entries, and personal record tracking.
 */

// ============================================================
// CalendarDayData — heatmap cell data
// ============================================================

/** Aggregated day-level data for the calendar heatmap */
export interface CalendarDayData {
    /** ISO date string (YYYY-MM-DD) */
    date: string;
    /** Number of completed workouts on this day */
    workoutCount: number;
    /** Sum of total_volume across all workouts on this day */
    totalVolume: number;
    /** Sum of total_sets across all workouts on this day */
    totalSets: number;
    /** Sum of total_duration (seconds) across all workouts on this day */
    totalDuration: number;
    /** List of workout IDs on this day (for detail drill-down) */
    workoutIds: string[];
}

// ============================================================
// JournalEntry — searchNotes result
// ============================================================

/** A single journal entry (workout-level + exercise notes) */
export interface JournalEntry {
    date: string;          // ISO date
    workoutId: string;
    workoutName: string;
    workoutNote: string | null;
    duration: number | null;
    exerciseNotes: Array<{ name: string; note: string }>;
}

// ============================================================
// PRSetIds — personal record tracking
// ============================================================

/** Set of workout_set IDs that are personal records */
export type PRSetIds = Set<string>;
