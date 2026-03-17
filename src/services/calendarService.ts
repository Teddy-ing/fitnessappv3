/**
 * Calendar Service
 *
 * Data access layer for the calendar feature.
 * Provides heatmap data, workout detail, and streak computation.
 *
 * Conventions:
 * - Uses typed row interfaces (never `any`)
 * - Returns empty arrays / null when DB is unavailable
 * - Reuses hydration helpers from hydration.ts
 */

import { getDatabase } from './database';
import {
    mapWorkoutRow,
    mapExerciseRow,
    mapSetRow,
    safeJsonParse,
    WorkoutRow,
    ExerciseRow,
    SetRow,
} from './hydration';
import { Workout } from '../models/workout';

// ============================================================
// Row types (typed DB results)
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

/** Raw row returned by the month summary query */
interface CalendarDayRow {
    workout_date: string;
    workout_count: number;
    total_volume: number;
    total_sets: number;
    total_duration: number;
    workout_ids: string;
}

/** SetRow extended with the foreign key for grouping */
interface SetRowWithParent extends SetRow {
    workout_exercise_id: string;
}

/** Raw row for streak date query */
interface DateRow {
    workout_date: string;
}

/** Raw row for rest day count query */
interface RestDayCountRow {
    rest_count: number;
}

// ============================================================
// ISO Week helpers (shared logic with analyticsService)
// ============================================================

/** Get ISO 8601 week number for a date */
function getISOWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Get ISO 8601 week-year for a date */
function getISOWeekYear(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    return d.getUTCFullYear();
}

/** Build an ISO week key like "2026-W11" from a Date */
function toISOWeekKey(date: Date): string {
    return `${getISOWeekYear(date)}-W${String(getISOWeekNumber(date)).padStart(2, '0')}`;
}

// ============================================================
// getWorkoutsForMonth
// ============================================================

/**
 * Fetch workout summary data for every day in a given month.
 * Returns an array of CalendarDayData — one entry per day that had workouts.
 * Days with no workouts are excluded (consumers fill them as empty cells).
 */
export async function getWorkoutsForMonth(
    year: number,
    month: number,
): Promise<CalendarDayData[]> {
    const db = await getDatabase();
    if (!db) return [];

    try {
        // Build date range for the month (1-indexed month)
        const monthStr = String(month).padStart(2, '0');
        const startDate = `${year}-${monthStr}-01`;

        // End date: first day of next month
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        const nextMonthStr = String(nextMonth).padStart(2, '0');
        const endDate = `${nextYear}-${nextMonthStr}-01`;

        const sql = `
            SELECT
                DATE(completed_at) AS workout_date,
                COUNT(*) AS workout_count,
                COALESCE(SUM(total_volume), 0) AS total_volume,
                COALESCE(SUM(total_sets), 0) AS total_sets,
                COALESCE(SUM(total_duration), 0) AS total_duration,
                GROUP_CONCAT(id) AS workout_ids
            FROM workouts
            WHERE status = 'completed'
              AND DATE(completed_at) >= ?
              AND DATE(completed_at) < ?
            GROUP BY DATE(completed_at)
            ORDER BY workout_date ASC
        `;

        const rows = await db.getAllAsync<CalendarDayRow>(sql, [startDate, endDate]);

        return rows.map((row) => ({
            date: row.workout_date,
            workoutCount: row.workout_count,
            totalVolume: row.total_volume ?? 0,
            totalSets: row.total_sets ?? 0,
            totalDuration: row.total_duration ?? 0,
            workoutIds: row.workout_ids ? row.workout_ids.split(',') : [],
        }));
    } catch (error) {
        console.error('[CalendarService] Failed to get workouts for month:', error);
        return [];
    }
}

// ============================================================
// getWorkoutStreak
// ============================================================

/**
 * Calculate the current consecutive ISO-week streak.
 * A "streak" is the number of consecutive ISO weeks (ending with the
 * current or most recent week) where the user completed at least one workout.
 */
export async function getWorkoutStreak(): Promise<number> {
    const db = await getDatabase();
    if (!db) return 0;

    try {
        const dateRows = await db.getAllAsync<DateRow>(
            `SELECT DISTINCT DATE(completed_at) AS workout_date
             FROM workouts WHERE status = 'completed'`,
        );

        if (dateRows.length === 0) return 0;

        // Build a set of ISO week keys from raw dates
        const weekSet = new Set<string>();
        for (const row of dateRows) {
            const d = new Date(row.workout_date + 'T00:00:00');
            weekSet.add(toISOWeekKey(d));
        }

        const now = new Date();
        const currentWeekKey = toISOWeekKey(now);

        // Start from Monday of current week
        const checkDate = new Date(now);
        const dayOfWeek = checkDate.getDay(); // 0=Sun
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        checkDate.setDate(checkDate.getDate() + mondayOffset);
        checkDate.setHours(0, 0, 0, 0);

        // If current week has no workout, start from previous week
        if (!weekSet.has(currentWeekKey)) {
            checkDate.setDate(checkDate.getDate() - 7);
        }

        let streak = 0;
        for (let i = 0; i < 200; i++) {
            const weekKey = toISOWeekKey(checkDate);
            if (weekSet.has(weekKey)) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 7);
            } else {
                break;
            }
        }

        return streak;
    } catch (error) {
        console.error('[CalendarService] Failed to get workout streak:', error);
        return 0;
    }
}

// ============================================================
// getRestDaysThisWeek
// ============================================================

/**
 * Count rest days in the current week from the active split's schedule.
 */
export async function getRestDaysThisWeek(): Promise<number> {
    const db = await getDatabase();
    if (!db) return 0;

    try {
        const row = await db.getFirstAsync<RestDayCountRow>(
            `SELECT COUNT(*) AS rest_count
             FROM splits_schedule ss
             JOIN user_settings us ON us.active_split_id = ss.split_id
             WHERE ss.item_type = 'rest'
               AND us.id = 1`,
        );

        return row?.rest_count ?? 0;
    } catch (error) {
        console.error('[CalendarService] Failed to get rest days:', error);
        return 0;
    }
}

// ============================================================
// getWorkoutDetail
// ============================================================

/**
 * Get a complete workout with exercises and sets for the daily detail modal.
 * Reuses hydration mappers to stay DRY.
 */
export async function getWorkoutDetail(
    workoutId: string,
): Promise<Workout | null> {
    const db = await getDatabase();
    if (!db) return null;

    try {
        // Fetch workout row
        const workoutRow = await db.getFirstAsync<WorkoutRow>(
            `SELECT * FROM workouts WHERE id = ?`,
            [workoutId],
        );
        if (!workoutRow) return null;

        // Fetch exercise rows
        const exerciseRows = await db.getAllAsync<ExerciseRow>(
            `SELECT * FROM workout_exercises
             WHERE workout_id = ?
             ORDER BY order_index ASC`,
            [workoutId],
        );

        // Fetch all sets for this workout's exercises in one query
        const exerciseIds = exerciseRows.map((e) => e.id);
        const setsByExerciseId = new Map<string, SetRow[]>();

        if (exerciseIds.length > 0) {
            const placeholders = exerciseIds.map(() => '?').join(',');
            const setRows = await db.getAllAsync<SetRowWithParent>(
                `SELECT * FROM workout_sets
                 WHERE workout_exercise_id IN (${placeholders})
                 ORDER BY order_index ASC`,
                exerciseIds,
            );

            for (const setRow of setRows) {
                const key = setRow.workout_exercise_id;
                if (!setsByExerciseId.has(key)) {
                    setsByExerciseId.set(key, []);
                }
                setsByExerciseId.get(key)!.push(setRow);
            }
        }

        return mapWorkoutRow(workoutRow, exerciseRows, setsByExerciseId);
    } catch (error) {
        console.error('[CalendarService] Failed to get workout detail:', error);
        return null;
    }
}

/**
 * Get all workouts for a specific date.
 * Returns an array of full Workout objects.
 */
export async function getWorkoutsForDate(
    date: string,
): Promise<Workout[]> {
    const db = await getDatabase();
    if (!db) return [];

    try {
        const workoutRows = await db.getAllAsync<WorkoutRow>(
            `SELECT * FROM workouts
             WHERE status = 'completed'
               AND DATE(completed_at) = ?
             ORDER BY completed_at ASC`,
            [date],
        );

        const workouts: Workout[] = [];

        for (const workoutRow of workoutRows) {
            const exerciseRows = await db.getAllAsync<ExerciseRow>(
                `SELECT * FROM workout_exercises
                 WHERE workout_id = ?
                 ORDER BY order_index ASC`,
                [workoutRow.id],
            );

            const exerciseIds = exerciseRows.map((e) => e.id);
            const setsByExerciseId = new Map<string, SetRow[]>();

            if (exerciseIds.length > 0) {
                const placeholders = exerciseIds.map(() => '?').join(',');
                const setRows = await db.getAllAsync<SetRow>(
                    `SELECT * FROM workout_sets
                     WHERE workout_exercise_id IN (${placeholders})
                     ORDER BY order_index ASC`,
                    exerciseIds,
                );

                for (const setRow of setRows) {
                    const key = (setRow as SetRow & { workout_exercise_id: string }).workout_exercise_id;
                    if (!setsByExerciseId.has(key)) {
                        setsByExerciseId.set(key, []);
                    }
                    setsByExerciseId.get(key)!.push(setRow);
                }
            }

            workouts.push(mapWorkoutRow(workoutRow, exerciseRows, setsByExerciseId));
        }

        return workouts;
    } catch (error) {
        console.error('[CalendarService] Failed to get workouts for date:', error);
        return [];
    }
}
