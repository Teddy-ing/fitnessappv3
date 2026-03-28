/**
 * Calendar Service
 *
 * Data access layer for the calendar feature: heatmap data,
 * workout detail, streak computation, and journal search.
 * Personal records and fatigue detection live in
 * personalRecordsService.ts (TD-011 extraction).
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
import { batchGetAll } from '../utils/batchQuery';
import { CalendarDayData, JournalEntry } from '../models/calendar';

export type { CalendarDayData, JournalEntry };

// ============================================================
// Row types (typed DB results)
// ============================================================



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
// ISO Week helpers — imported from shared utility
// ============================================================

import { toISOWeekKey } from '../utils/isoWeek';

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

        // Fetch all sets for this workout's exercises in one query (PP-037: chunked)
        const exerciseIds = exerciseRows.map((e) => e.id);
        const setsByExerciseId = new Map<string, SetRow[]>();

        const setRows = await batchGetAll<SetRowWithParent>(
            db,
            exerciseIds,
            (placeholders, batch) => [
                `SELECT * FROM workout_sets
                 WHERE workout_exercise_id IN (${placeholders})
                 ORDER BY order_index ASC`,
                batch,
            ],
        );

        for (const setRow of setRows) {
            const key = setRow.workout_exercise_id;
            if (!setsByExerciseId.has(key)) {
                setsByExerciseId.set(key, []);
            }
            setsByExerciseId.get(key)!.push(setRow);
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

        // Batch load all exercises for these workouts (PP-037: chunked)
        const workoutIds = workoutRows.map((w) => w.id);

        const exerciseRows = await batchGetAll<ExerciseRow & { workout_id: string }>(
            db,
            workoutIds,
            (placeholders, batch) => [
                `SELECT * FROM workout_exercises
                 WHERE workout_id IN (${placeholders})
                 ORDER BY workout_id, order_index ASC`,
                batch,
            ],
        );

        // Batch load all sets for these exercises (PP-037: chunked)
        const exerciseIds = exerciseRows.map((e) => e.id);
        const setsByExerciseId = new Map<string, SetRow[]>();

        const setRows = await batchGetAll<SetRowWithParent>(
            db,
            exerciseIds,
            (placeholders, batch) => [
                `SELECT * FROM workout_sets
                 WHERE workout_exercise_id IN (${placeholders})
                 ORDER BY workout_exercise_id, order_index ASC`,
                batch,
            ],
        );

        for (const setRow of setRows) {
            const key = setRow.workout_exercise_id;
            if (!setsByExerciseId.has(key)) {
                setsByExerciseId.set(key, []);
            }
            setsByExerciseId.get(key)!.push(setRow);
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
// searchNotes (Journal View)
// ============================================================

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

        // Batch-load exercise-level notes for all matched workouts (PP-016/PP-037 fix)
        const workoutIds = workoutRows.map((r) => r.workout_id);
        const notesByWorkout = new Map<string, Array<{ name: string; note: string }>>();

        const exerciseNoteRows = await batchGetAll<{
            workout_id: string;
            exercise_name: string;
            note: string;
        }>(
            db,
            workoutIds,
            (placeholders, batch) => [
                `SELECT workout_id, exercise_name, note FROM workout_exercises
                 WHERE workout_id IN (${placeholders})
                   AND note IS NOT NULL AND note != ''
                 ORDER BY workout_id, order_index ASC`,
                batch,
            ],
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
