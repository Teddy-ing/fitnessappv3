/**
 * Exercise Analytics Service
 *
 * Per-exercise time series queries and related micro-level analytics.
 * Extracted from analyticsService.ts (TD-003) to keep each service
 * focused on a single domain.
 *
 * - getPerformedExercises: list of exercises user has performed
 * - getEstimated1RM: Epley 1RM per workout date
 * - getMaxWeight: max weight per workout date
 * - getExerciseVolume: total volume per workout date
 * - getMaxReps: max reps per workout date
 * - getBestWeightForReps: best weight at each rep count (1–15)
 * - getFatigueRatio: acute:chronic workload ratio
 *
 * Conventions:
 * - Uses typed row interfaces (never `any`)
 * - Returns empty arrays when DB is unavailable (Expo Go mode)
 * - Uses getDatabase() pattern from existing services
 */

import { getDatabase } from './database';
import { safeJsonParse } from './hydration';
import { getDateRangeStart } from './analyticsService';
import { MAX_EPLEY_1RM, SESSION_VOLUME } from '../utils/sqlFragments';
import {
    ChartRange,
    PerformedExercise,
    ExerciseTimeSeriesPoint,
    BestWeightForRep,
    FatigueRatioResult,
} from '../models/analytics';
import { MuscleContribution } from '../models/exercise';

// ============================================================
// Row types (typed DB results)
// ============================================================

/** Row for performed exercises list */
interface PerformedExerciseRow {
    exercise_id: string;
    exercise_name: string;
    last_performed: string;
    total_sessions: number;
    exercise_muscle_groups: string | null;
}

/** Row for per-exercise time series (date + value) */
interface ExerciseMetricRow {
    workout_date: string;
    value: number;
}

/** Row for best weight at a rep count */
interface BestWeightRow {
    reps: number;
    weight: number;
    achieved_date: string;
}

// ============================================================
// Helpers
// ============================================================

/** Date label formatter for per-workout time series */
function formatDateLabel(isoDate: string): string {
    const d = new Date(isoDate);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return `${month}/${day}`;
}

// ============================================================
// Queries
// ============================================================

/**
 * Get list of exercises the user has performed, with metadata.
 * Sorted by most recently performed.
 *
 * @param range - Date window filter
 * @param muscleGroups - Optional array of muscle group strings to filter by.
 *   When provided, only exercises whose exercise_muscle_groups JSON contains
 *   at least one of the specified muscles are returned.
 */
export async function getPerformedExercises(
    range: ChartRange,
    muscleGroups?: string[],
): Promise<PerformedExercise[]> {
    const db = await getDatabase();
    if (!db) return [];

    try {
        const rangeStart = getDateRangeStart(range);
        const whereRange = rangeStart ? `AND w.completed_at >= ?` : '';
        const params: string[] = rangeStart ? [rangeStart] : [];

        // Build optional muscle group filter
        let muscleFilter = '';
        if (muscleGroups && muscleGroups.length > 0) {
            const conditions = muscleGroups.map((mg) => {
                params.push(`%"muscle":"${mg}"%`);
                return `we.exercise_muscle_groups LIKE ?`;
            });
            muscleFilter = `AND (${conditions.join(' OR ')})`;
        }

        const sql = `
            SELECT
                we.exercise_id,
                we.exercise_name,
                MAX(w.completed_at) AS last_performed,
                COUNT(DISTINCT w.id) AS total_sessions,
                we.exercise_muscle_groups
            FROM workout_exercises we
            JOIN workouts w ON w.id = we.workout_id
            WHERE w.status = 'completed' ${whereRange} ${muscleFilter}
            GROUP BY we.exercise_id
            ORDER BY last_performed DESC
        `;

        const rows = await db.getAllAsync<PerformedExerciseRow>(sql, params);

        return rows.map((r) => {
            // Extract primary muscle from JSON
            let primaryMuscle: string | undefined;
            const muscleData = safeJsonParse<MuscleContribution[]>(
                r.exercise_muscle_groups,
                [],
            );
            const primary = muscleData.find((m) => m.isPrimary);
            if (primary) {
                primaryMuscle = primary.muscle;
            }

            return {
                exerciseId: r.exercise_id,
                exerciseName: r.exercise_name,
                lastPerformed: r.last_performed,
                totalSessions: r.total_sessions,
                primaryMuscle,
            };
        });
    } catch (error) {
        console.error('[ExerciseAnalytics] Failed to get performed exercises:', error);
        return [];
    }
}

/**
 * Get estimated 1RM over time for an exercise.
 * Uses Epley formula: weight × (1 + reps / 30)
 * Takes the MAX est. 1RM per workout date.
 */
export async function getEstimated1RM(
    exerciseId: string,
    range: ChartRange,
): Promise<ExerciseTimeSeriesPoint[]> {
    const db = await getDatabase();
    if (!db) return [];

    try {
        const rangeStart = getDateRangeStart(range);
        const whereRange = rangeStart ? `AND w.completed_at >= ?` : '';
        const params: (string)[] = [exerciseId, ...(rangeStart ? [rangeStart] : [])];

        const sql = `
            SELECT
                DATE(w.completed_at) AS workout_date,
                ${MAX_EPLEY_1RM} AS value
            FROM workout_sets ws
            JOIN workout_exercises we ON ws.workout_exercise_id = we.id
            JOIN workouts w ON w.id = we.workout_id
            WHERE we.exercise_id = ?
              AND w.status = 'completed'
              AND ws.weight > 0 AND ws.reps > 0
              ${whereRange}
            GROUP BY DATE(w.completed_at)
            ORDER BY workout_date ASC
        `;

        const rows = await db.getAllAsync<ExerciseMetricRow>(sql, params);

        return rows.map((r) => ({
            date: r.workout_date,
            value: Math.round(r.value * 10) / 10,
            label: formatDateLabel(r.workout_date),
        }));
    } catch (error) {
        console.error('[ExerciseAnalytics] Failed to get est. 1RM:', error);
        return [];
    }
}

/**
 * Get max weight per workout date for an exercise.
 */
export async function getMaxWeight(
    exerciseId: string,
    range: ChartRange,
): Promise<ExerciseTimeSeriesPoint[]> {
    const db = await getDatabase();
    if (!db) return [];

    try {
        const rangeStart = getDateRangeStart(range);
        const whereRange = rangeStart ? `AND w.completed_at >= ?` : '';
        const params: string[] = [exerciseId, ...(rangeStart ? [rangeStart] : [])];

        const sql = `
            SELECT
                DATE(w.completed_at) AS workout_date,
                MAX(ws.weight) AS value
            FROM workout_sets ws
            JOIN workout_exercises we ON ws.workout_exercise_id = we.id
            JOIN workouts w ON w.id = we.workout_id
            WHERE we.exercise_id = ?
              AND w.status = 'completed'
              AND ws.weight > 0
              ${whereRange}
            GROUP BY DATE(w.completed_at)
            ORDER BY workout_date ASC
        `;

        const rows = await db.getAllAsync<ExerciseMetricRow>(sql, params);

        return rows.map((r) => ({
            date: r.workout_date,
            value: r.value,
            label: formatDateLabel(r.workout_date),
        }));
    } catch (error) {
        console.error('[ExerciseAnalytics] Failed to get max weight:', error);
        return [];
    }
}

/**
 * Get total volume (SUM weight × reps) per workout date for an exercise.
 */
export async function getExerciseVolume(
    exerciseId: string,
    range: ChartRange,
): Promise<ExerciseTimeSeriesPoint[]> {
    const db = await getDatabase();
    if (!db) return [];

    try {
        const rangeStart = getDateRangeStart(range);
        const whereRange = rangeStart ? `AND w.completed_at >= ?` : '';
        const params: string[] = [exerciseId, ...(rangeStart ? [rangeStart] : [])];

        const sql = `
            SELECT
                DATE(w.completed_at) AS workout_date,
                ${SESSION_VOLUME} AS value
            FROM workout_sets ws
            JOIN workout_exercises we ON ws.workout_exercise_id = we.id
            JOIN workouts w ON w.id = we.workout_id
            WHERE we.exercise_id = ?
              AND w.status = 'completed'
              AND ws.weight > 0 AND ws.reps > 0
              ${whereRange}
            GROUP BY DATE(w.completed_at)
            ORDER BY workout_date ASC
        `;

        const rows = await db.getAllAsync<ExerciseMetricRow>(sql, params);

        return rows.map((r) => ({
            date: r.workout_date,
            value: Math.round(r.value),
            label: formatDateLabel(r.workout_date),
        }));
    } catch (error) {
        console.error('[ExerciseAnalytics] Failed to get exercise volume:', error);
        return [];
    }
}

/**
 * Get max reps per workout date for an exercise.
 */
export async function getMaxReps(
    exerciseId: string,
    range: ChartRange,
): Promise<ExerciseTimeSeriesPoint[]> {
    const db = await getDatabase();
    if (!db) return [];

    try {
        const rangeStart = getDateRangeStart(range);
        const whereRange = rangeStart ? `AND w.completed_at >= ?` : '';
        const params: string[] = [exerciseId, ...(rangeStart ? [rangeStart] : [])];

        const sql = `
            SELECT
                DATE(w.completed_at) AS workout_date,
                MAX(ws.reps) AS value
            FROM workout_sets ws
            JOIN workout_exercises we ON ws.workout_exercise_id = we.id
            JOIN workouts w ON w.id = we.workout_id
            WHERE we.exercise_id = ?
              AND w.status = 'completed'
              AND ws.reps > 0
              ${whereRange}
            GROUP BY DATE(w.completed_at)
            ORDER BY workout_date ASC
        `;

        const rows = await db.getAllAsync<ExerciseMetricRow>(sql, params);

        return rows.map((r) => ({
            date: r.workout_date,
            value: r.value,
            label: formatDateLabel(r.workout_date),
        }));
    } catch (error) {
        console.error('[ExerciseAnalytics] Failed to get max reps:', error);
        return [];
    }
}

/**
 * Get best weight achieved at each rep count (1-15) for an exercise.
 * Returns only rep counts that have data.
 */
export async function getBestWeightForReps(
    exerciseId: string,
): Promise<BestWeightForRep[]> {
    const db = await getDatabase();
    if (!db) return [];

    try {
        // BH-004 fix: Use ROW_NUMBER() window function to guarantee
        // achieved_date comes from the same row as the best weight.
        // Tiebreaker: most recent date when same weight hit multiple times.
        const sql = `
            WITH ranked AS (
                SELECT
                    ws.reps,
                    ws.weight,
                    DATE(w.completed_at) AS achieved_date,
                    ROW_NUMBER() OVER (
                        PARTITION BY ws.reps
                        ORDER BY ws.weight DESC, w.completed_at DESC
                    ) AS rn
                FROM workout_sets ws
                JOIN workout_exercises we ON ws.workout_exercise_id = we.id
                JOIN workouts w ON w.id = we.workout_id
                WHERE we.exercise_id = ?
                  AND w.status = 'completed'
                  AND ws.weight > 0 AND ws.reps > 0
                  AND ws.reps <= 15
            )
            SELECT reps, weight, achieved_date
            FROM ranked
            WHERE rn = 1
            ORDER BY reps ASC
        `;

        const rows = await db.getAllAsync<BestWeightRow>(sql, [exerciseId]);

        return rows.map((r) => ({
            reps: r.reps,
            weight: r.weight,
            date: r.achieved_date,
        }));
    } catch (error) {
        console.error('[ExerciseAnalytics] Failed to get best weight for reps:', error);
        return [];
    }
}

// ============================================================
// Fatigue Ratio
// ============================================================

/**
 * Compute acute:chronic workload ratio.
 * Acute  = total volume this week (last 7 days).
 * Chronic = average weekly volume over last 4 weeks (28 days).
 * Ratio < 0.8 → light, 0.8–1.3 → normal, > 1.3 → high.
 */
export async function getFatigueRatio(): Promise<FatigueRatioResult> {
    const empty: FatigueRatioResult = { acute: 0, chronic: 0, ratio: 0, status: 'normal' };
    const db = await getDatabase();
    if (!db) return empty;

    try {
        const acuteRow = await db.getFirstAsync<{ total: number | null }>(
            `SELECT SUM(total_volume) AS total FROM workouts
             WHERE status = 'completed'
               AND completed_at >= DATE('now', '-7 days')`,
        );

        const chronicRow = await db.getFirstAsync<{ total: number | null }>(
            `SELECT SUM(total_volume) / 4.0 AS total FROM workouts
             WHERE status = 'completed'
               AND completed_at >= DATE('now', '-28 days')`,
        );

        const acute = acuteRow?.total ?? 0;
        const chronic = chronicRow?.total ?? 0;

        if (chronic === 0) {
            return { acute, chronic: 0, ratio: 0, status: 'normal' };
        }

        const ratio = Math.round((acute / chronic) * 100) / 100;
        let status: FatigueRatioResult['status'] = 'normal';
        if (ratio < 0.8) status = 'light';
        else if (ratio > 1.3) status = 'high';

        return { acute, chronic: Math.round(chronic), ratio, status };
    } catch (error) {
        console.error('[ExerciseAnalytics] Failed to get fatigue ratio:', error);
        return empty;
    }
}
