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
import * as Crypto from 'expo-crypto';
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
 *
 * Uses batch IN (...) queries (PP-017 fix) — same pattern as
 * workoutService.getWorkouts() to avoid N+1.
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

        if (workoutRows.length === 0) return [];

        // Batch load all exercises for these workouts
        const workoutIds = workoutRows.map((w) => w.id);
        const wPlaceholders = workoutIds.map(() => '?').join(',');

        const exerciseRows = await db.getAllAsync<ExerciseRow & { workout_id: string }>(
            `SELECT * FROM workout_exercises
             WHERE workout_id IN (${wPlaceholders})
             ORDER BY workout_id, order_index ASC`,
            workoutIds,
        );

        // Batch load all sets for these exercises
        const exerciseIds = exerciseRows.map((e) => e.id);
        const setsByExerciseId = new Map<string, SetRow[]>();

        if (exerciseIds.length > 0) {
            const ePlaceholders = exerciseIds.map(() => '?').join(',');
            const setRows = await db.getAllAsync<SetRowWithParent>(
                `SELECT * FROM workout_sets
                 WHERE workout_exercise_id IN (${ePlaceholders})
                 ORDER BY workout_exercise_id, order_index ASC`,
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

        // Group exercises by workout ID
        const exercisesByWorkout = new Map<string, ExerciseRow[]>();
        for (const ex of exerciseRows) {
            const wId = ex.workout_id;
            if (!exercisesByWorkout.has(wId)) {
                exercisesByWorkout.set(wId, []);
            }
            exercisesByWorkout.get(wId)!.push(ex);
        }

        // Hydrate all workouts using shared mapper
        return workoutRows.map((row) =>
            mapWorkoutRow(row, exercisesByWorkout.get(row.id) || [], setsByExerciseId),
        );
    } catch (error) {
        console.error('[CalendarService] Failed to get workouts for date:', error);
        return [];
    }
}

// ============================================================
// getPersonalRecordDates
// ============================================================

/** Raw row for PR date query */
interface PRDateRow {
    pr_date: string;
}

/**
 * Get the set of ISO date strings where personal records were achieved
 * in the given month.
 */
export async function getPersonalRecordDates(
    year: number,
    month: number,
): Promise<Set<string>> {
    const db = await getDatabase();
    if (!db) return new Set();

    try {
        const monthStr = String(month).padStart(2, '0');
        const startDate = `${year}-${monthStr}-01`;
        const nm = month === 12 ? 1 : month + 1;
        const ny = month === 12 ? year + 1 : year;
        const endDate = `${ny}-${String(nm).padStart(2, '0')}-01`;

        const rows = await db.getAllAsync<PRDateRow>(
            `SELECT DISTINCT DATE(achieved_at) AS pr_date
             FROM personal_records
             WHERE is_current = 1
               AND DATE(achieved_at) >= ?
               AND DATE(achieved_at) < ?`,
            [startDate, endDate],
        );

        return new Set(rows.map((r) => r.pr_date));
    } catch (error) {
        console.error('[CalendarService] Failed to get PR dates:', error);
        return new Set();
    }
}

// ============================================================
// getNoteDates
// ============================================================

/** Raw row for note date query */
interface NoteDateRow {
    note_date: string;
}

/**
 * Get ISO date strings where any workout, exercise, or set
 * has a non-empty note in the given month.
 */
export async function getNoteDates(
    year: number,
    month: number,
): Promise<Set<string>> {
    const db = await getDatabase();
    if (!db) return new Set();

    try {
        const monthStr = String(month).padStart(2, '0');
        const startDate = `${year}-${monthStr}-01`;
        const nm = month === 12 ? 1 : month + 1;
        const ny = month === 12 ? year + 1 : year;
        const endDate = `${ny}-${String(nm).padStart(2, '0')}-01`;

        const sql = `
            SELECT DISTINCT DATE(w.completed_at) AS note_date
            FROM workouts w
            WHERE w.status = 'completed'
              AND w.note IS NOT NULL AND w.note != ''
              AND DATE(w.completed_at) >= ? AND DATE(w.completed_at) < ?

            UNION

            SELECT DISTINCT DATE(w.completed_at) AS note_date
            FROM workout_exercises we
            JOIN workouts w ON w.id = we.workout_id
            WHERE w.status = 'completed'
              AND we.note IS NOT NULL AND we.note != ''
              AND DATE(w.completed_at) >= ? AND DATE(w.completed_at) < ?

            UNION

            SELECT DISTINCT DATE(w.completed_at) AS note_date
            FROM workout_sets ws
            JOIN workout_exercises we ON ws.workout_exercise_id = we.id
            JOIN workouts w ON w.id = we.workout_id
            WHERE w.status = 'completed'
              AND ws.note IS NOT NULL AND ws.note != ''
              AND DATE(w.completed_at) >= ? AND DATE(w.completed_at) < ?
        `;

        const rows = await db.getAllAsync<NoteDateRow>(sql, [
            startDate, endDate,
            startDate, endDate,
            startDate, endDate,
        ]);

        return new Set(rows.map((r) => r.note_date));
    } catch (error) {
        console.error('[CalendarService] Failed to get note dates:', error);
        return new Set();
    }
}

// ============================================================
// backfillPersonalRecords
// ============================================================

/** Row shape for the backfill query */
interface BackfillSetRow {
    exercise_id: string;
    exercise_name: string;
    workout_id: string;
    set_id: string;
    weight: number;
    reps: number;
    achieved_at: string;
}

/**
 * One-time retroactive scan of all completed workout sets.
 * For each exercise, finds max_weight, max_reps, and max_e1rm.
 * Idempotent — skips if `pr_backfill_complete` flag is set.
 */
export async function backfillPersonalRecords(): Promise<void> {
    const db = await getDatabase();
    if (!db) return;

    try {
        // Check if backfill already done
        const flagRow = await db.getFirstAsync<{ pr_backfill_complete: number }>(
            `SELECT pr_backfill_complete FROM user_settings WHERE id = 1`,
        );
        if (flagRow?.pr_backfill_complete === 1) return;

        const rows = await db.getAllAsync<BackfillSetRow>(`
            SELECT
                we.exercise_id,
                we.exercise_name,
                w.id AS workout_id,
                ws.id AS set_id,
                ws.weight,
                ws.reps,
                DATE(w.completed_at) AS achieved_at
            FROM workout_sets ws
            JOIN workout_exercises we ON ws.workout_exercise_id = we.id
            JOIN workouts w ON w.id = we.workout_id
            WHERE w.status = 'completed'
              AND ws.status = 'completed'
              AND ws.weight > 0 AND ws.reps > 0
            ORDER BY we.exercise_id, w.completed_at ASC
        `);

        if (rows.length === 0) {
            await db.runAsync(
                `UPDATE user_settings SET pr_backfill_complete = 1 WHERE id = 1`,
            );
            return;
        }

        // Group by exercise
        const exerciseMap = new Map<string, BackfillSetRow[]>();
        for (const row of rows) {
            if (!exerciseMap.has(row.exercise_id)) {
                exerciseMap.set(row.exercise_id, []);
            }
            exerciseMap.get(row.exercise_id)!.push(row);
        }

        const now = new Date().toISOString();
        const insertSql = `
            INSERT INTO personal_records
            (id, exercise_id, exercise_name, workout_id, set_id, record_type, value, reps, weight, achieved_at, is_current, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
        `;

        // BH-008 fix: Use withTransactionAsync instead of manual BEGIN/COMMIT
        // to ensure proper rollback on failure and consistency with the rest of the codebase.
        await db.withTransactionAsync(async () => {
            for (const [exerciseId, sets] of exerciseMap.entries()) {
                let maxWeightSet = sets[0];
                let maxRepsSet = sets[0];
                let maxE1rmSet = sets[0];
                let maxE1rmValue = 0;

                for (const set of sets) {
                    if (set.weight > maxWeightSet.weight) maxWeightSet = set;
                    if (set.reps > maxRepsSet.reps) maxRepsSet = set;
                    const e1rm = set.weight * (1 + set.reps / 30);
                    if (e1rm > maxE1rmValue) {
                        maxE1rmValue = e1rm;
                        maxE1rmSet = set;
                    }
                }

                await db.runAsync(insertSql, [
                    Crypto.randomUUID(), exerciseId, maxWeightSet.exercise_name,
                    maxWeightSet.workout_id, maxWeightSet.set_id,
                    'max_weight', maxWeightSet.weight,
                    maxWeightSet.reps, maxWeightSet.weight,
                    maxWeightSet.achieved_at, now,
                ]);

                await db.runAsync(insertSql, [
                    Crypto.randomUUID(), exerciseId, maxRepsSet.exercise_name,
                    maxRepsSet.workout_id, maxRepsSet.set_id,
                    'max_reps', maxRepsSet.reps,
                    maxRepsSet.reps, maxRepsSet.weight,
                    maxRepsSet.achieved_at, now,
                ]);

                await db.runAsync(insertSql, [
                    Crypto.randomUUID(), exerciseId, maxE1rmSet.exercise_name,
                    maxE1rmSet.workout_id, maxE1rmSet.set_id,
                    'max_e1rm', Math.round(maxE1rmValue * 10) / 10,
                    maxE1rmSet.reps, maxE1rmSet.weight,
                    maxE1rmSet.achieved_at, now,
                ]);
            }

            await db.runAsync(
                `UPDATE user_settings SET pr_backfill_complete = 1 WHERE id = 1`,
            );
        });

        console.log(
            `[CalendarService] PR backfill complete: ${exerciseMap.size} exercises, ${exerciseMap.size * 3} records`,
        );
    } catch (error) {
        console.error('[CalendarService] PR backfill failed:', error);
    }
}

// ============================================================
// searchNotes (Journal View)
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

/**
 * Search across workout and exercise notes.
 * Returns a chronological list of entries (newest first).
 * Optional `query` filters by keyword (case-insensitive LIKE).
 */
export async function searchNotes(query?: string): Promise<JournalEntry[]> {
    const db = await getDatabase();
    if (!db) return [];

    try {
        // Build WHERE clause for keyword filter
        let noteFilter = '';
        const params: string[] = [];

        if (query && query.trim().length > 0) {
            const keyword = `%${query.trim()}%`;
            noteFilter = `AND (w.note LIKE ? OR we_notes.exercise_note LIKE ?)`;
            params.push(keyword, keyword);
        }

        // Get workouts that have any note (workout-level or exercise-level)
        const sql = `
            SELECT DISTINCT
                w.id AS workout_id,
                w.name AS workout_name,
                w.note AS workout_note,
                w.total_duration AS duration,
                DATE(w.completed_at) AS date
            FROM workouts w
            LEFT JOIN (
                SELECT workout_id, GROUP_CONCAT(note, '||') AS exercise_note
                FROM workout_exercises
                WHERE note IS NOT NULL AND note != ''
                GROUP BY workout_id
            ) we_notes ON we_notes.workout_id = w.id
            WHERE w.status = 'completed'
              AND (
                  (w.note IS NOT NULL AND w.note != '')
                  OR we_notes.exercise_note IS NOT NULL
              )
              ${noteFilter}
            ORDER BY w.completed_at DESC
        `;

        const workoutRows = await db.getAllAsync<{
            workout_id: string;
            workout_name: string;
            workout_note: string | null;
            duration: number | null;
            date: string;
        }>(sql, params);

        // Batch-load exercise-level notes for all matched workouts (PP-016 fix)
        const workoutIds = workoutRows.map((r) => r.workout_id);
        const notesByWorkout = new Map<string, Array<{ name: string; note: string }>>();

        if (workoutIds.length > 0) {
            const placeholders = workoutIds.map(() => '?').join(',');
            const exerciseNoteRows = await db.getAllAsync<{
                workout_id: string;
                exercise_name: string;
                note: string;
            }>(
                `SELECT workout_id, exercise_name, note FROM workout_exercises
                 WHERE workout_id IN (${placeholders})
                   AND note IS NOT NULL AND note != ''
                 ORDER BY workout_id, order_index ASC`,
                workoutIds,
            );

            for (const row of exerciseNoteRows) {
                if (!notesByWorkout.has(row.workout_id)) {
                    notesByWorkout.set(row.workout_id, []);
                }
                notesByWorkout.get(row.workout_id)!.push({
                    name: row.exercise_name,
                    note: row.note,
                });
            }
        }

        // Build entries with pre-loaded exercise notes
        const entries: JournalEntry[] = [];
        for (const row of workoutRows) {
            const exerciseNotes = notesByWorkout.get(row.workout_id) ?? [];

            // If there's a keyword filter, skip entries where neither the workout note
            // nor any exercise note matches
            if (query && query.trim().length > 0) {
                const kw = query.trim().toLowerCase();
                const workoutNoteMatch = row.workout_note?.toLowerCase().includes(kw);
                const exerciseMatch = exerciseNotes.some(
                    (e) => e.note.toLowerCase().includes(kw),
                );
                if (!workoutNoteMatch && !exerciseMatch) continue;
            }

            entries.push({
                date: row.date,
                workoutId: row.workout_id,
                workoutName: row.workout_name,
                workoutNote: row.workout_note || null,
                duration: row.duration,
                exerciseNotes,
            });
        }

        return entries;
    } catch (error) {
        console.error('[CalendarService] searchNotes failed:', error);
        return [];
    }
}

// ============================================================
// getFatigueDates
// ============================================================

/** Row shape for fatigue detection query */
interface FatigueSessionRow {
    exercise_id: string;
    workout_date: string;
    session_volume: number;
}

/**
 * Detect days where exercise volume regressed compared to the
 * 4-session trailing average. If any exercise on a given day had
 * volume ≤80% of its trailing average, that date is flagged.
 */
export async function getFatigueDates(
    year: number,
    month: number,
): Promise<Set<string>> {
    const db = await getDatabase();
    if (!db) return new Set();

    try {
        const monthStr = String(month).padStart(2, '0');
        const startDate = `${year}-${monthStr}-01`;
        const nm = month === 12 ? 1 : month + 1;
        const ny = month === 12 ? year + 1 : year;
        const endDate = `${ny}-${String(nm).padStart(2, '0')}-01`;

        // Get per-exercise, per-session volume for all time up to end of month
        // We need historical data to compute trailing averages
        const rows = await db.getAllAsync<FatigueSessionRow>(`
            SELECT
                we.exercise_id,
                DATE(w.completed_at) AS workout_date,
                SUM(ws.weight * ws.reps) AS session_volume
            FROM workout_sets ws
            JOIN workout_exercises we ON ws.workout_exercise_id = we.id
            JOIN workouts w ON w.id = we.workout_id
            WHERE w.status = 'completed'
              AND ws.status = 'completed'
              AND ws.weight > 0 AND ws.reps > 0
              AND DATE(w.completed_at) < ?
            GROUP BY we.exercise_id, DATE(w.completed_at)
            ORDER BY we.exercise_id, w.completed_at ASC
        `, [endDate]);

        if (rows.length === 0) return new Set();

        // Group by exercise
        const exerciseHistory = new Map<string, FatigueSessionRow[]>();
        for (const row of rows) {
            if (!exerciseHistory.has(row.exercise_id)) {
                exerciseHistory.set(row.exercise_id, []);
            }
            exerciseHistory.get(row.exercise_id)!.push(row);
        }

        const fatigueDates = new Set<string>();

        // For each exercise, check sessions within the target month
        for (const [, sessions] of exerciseHistory.entries()) {
            for (let i = 0; i < sessions.length; i++) {
                const session = sessions[i];

                // Only flag dates within the target month
                if (session.workout_date < startDate || session.workout_date >= endDate) {
                    continue;
                }

                // Need at least 4 prior sessions for a trailing average
                if (i < 4) continue;

                // Compute 4-session trailing average (sessions i-4 to i-1)
                let trailingSum = 0;
                for (let j = i - 4; j < i; j++) {
                    trailingSum += sessions[j].session_volume;
                }
                const trailingAvg = trailingSum / 4;

                // Flag if volume dropped to ≤80% of trailing average
                if (trailingAvg > 0 && session.session_volume <= trailingAvg * 0.8) {
                    fatigueDates.add(session.workout_date);
                }
            }
        }

        return fatigueDates;
    } catch (error) {
        console.error('[CalendarService] getFatigueDates failed:', error);
        return new Set();
    }
}
