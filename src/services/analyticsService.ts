/**
 * Analytics Service
 *
 * Queries for macro-level workout analytics.
 * Returns aggregated metrics grouped by time bucket and filtered by date range.
 *
 * Conventions:
 * - Uses typed row interfaces (never `any`)
 * - Returns empty arrays when DB is unavailable (Expo Go mode)
 * - Uses getDatabase() pattern from existing services
 */

import { getDatabase } from './database';
import { safeJsonParse } from './hydration';
import {
    MetricType,
    TimeBucket,
    ChartRange,
    AggregatedMetricPoint,
    ConsistencyStats,
    MuscleDistributionPoint,
    PerformedExercise,
    ExerciseTimeSeriesPoint,
    BestWeightForRep,
    FatigueRatioResult,
} from '../models/analytics';
import { MuscleContribution } from '../models/exercise';

// ============================================================
// Row types (typed DB results)
// ============================================================

/** Raw row returned by aggregation queries */
interface AggregatedMetricRow {
    bucket_label: string;
    bucket_date: string;
    value: number;
}

/** Row for consistency count queries */
interface CountRow {
    count: number;
}

/** Row for streak calculation — raw completed dates */
interface DateRow {
    workout_date: string;
}

/** Row for muscle distribution source data */
interface MuscleSourceRow {
    exercise_muscle_groups: string | null;
    metric_value: number;
}

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
// Date range helpers
// ============================================================

/**
 * Calculate the start date ISO string for a given chart range.
 * Returns null for 'ALL' (no date filter).
 */
export function getDateRangeStart(range: ChartRange): string | null {
    if (range === 'ALL') return null;

    const now = new Date();
    const monthsBack: Record<Exclude<ChartRange, 'ALL'>, number> = {
        '1M': 1,
        '3M': 3,
        '6M': 6,
        '1Y': 12,
    };

    const d = new Date(now);
    d.setMonth(d.getMonth() - monthsBack[range]);
    return d.toISOString();
}

// ============================================================
// SQL builders
// ============================================================

/**
 * Build the SELECT expression and FROM/JOIN clause for a given metric.
 *
 * Volume, sets, and duration are stored directly on the `workouts` table.
 * Reps requires a JOIN to `workout_sets`.
 */
function buildMetricQuery(metric: MetricType): {
    selectExpr: string;
    fromClause: string;
    dateColumn: string;
} {
    switch (metric) {
        case 'volume':
            return {
                selectExpr: 'SUM(w.total_volume)',
                fromClause: 'workouts w',
                dateColumn: 'w.completed_at',
            };
        case 'sets':
            return {
                selectExpr: 'SUM(w.total_sets)',
                fromClause: 'workouts w',
                dateColumn: 'w.completed_at',
            };
        case 'duration':
            return {
                selectExpr: 'SUM(w.total_duration)',
                fromClause: 'workouts w',
                dateColumn: 'w.completed_at',
            };
        case 'reps':
            return {
                selectExpr: 'SUM(ws.reps)',
                fromClause:
                    'workouts w ' +
                    'JOIN workout_exercises we ON we.workout_id = w.id ' +
                    'JOIN workout_sets ws ON ws.workout_exercise_id = we.id',
                dateColumn: 'w.completed_at',
            };
    }
}

/**
 * Build the GROUP BY / label expression for a given time bucket.
 */
function buildBucketExpression(
    bucket: TimeBucket,
    dateColumn: string,
): { groupExpr: string; labelExpr: string; orderExpr: string } {
    switch (bucket) {
        case 'per_workout':
            return {
                groupExpr: `${dateColumn}`,
                labelExpr: `strftime('%m/%d', ${dateColumn})`,
                orderExpr: `${dateColumn}`,
            };
        case 'per_week': {
            // ISO 8601 week: find the Thursday of the ISO week via SQLite date modifiers.
            // This avoids strftime('%W') which uses non-ISO (Sunday/Monday-start) numbering
            // and disagrees with JS ISO week helpers near year boundaries.
            const isoThu = `date(${dateColumn}, '-3 days', 'weekday 4')`;
            const isoYear = `strftime('%Y', ${isoThu})`;
            const isoWeek = `((strftime('%j', ${isoThu}) - 1) / 7 + 1)`;
            const isoKey = `${isoYear} || '-W' || printf('%02d', ${isoWeek})`;
            return {
                groupExpr: isoKey,
                labelExpr: `'W' || ${isoWeek}`,
                orderExpr: isoKey,
            };
        }
        case 'per_month':
            return {
                groupExpr: `strftime('%Y-%m', ${dateColumn})`,
                labelExpr: `CASE strftime('%m', ${dateColumn})
                    WHEN '01' THEN 'Jan' WHEN '02' THEN 'Feb'
                    WHEN '03' THEN 'Mar' WHEN '04' THEN 'Apr'
                    WHEN '05' THEN 'May' WHEN '06' THEN 'Jun'
                    WHEN '07' THEN 'Jul' WHEN '08' THEN 'Aug'
                    WHEN '09' THEN 'Sep' WHEN '10' THEN 'Oct'
                    WHEN '11' THEN 'Nov' WHEN '12' THEN 'Dec'
                END`,
                orderExpr: `strftime('%Y-%m', ${dateColumn})`,
            };
        case 'per_year':
            return {
                groupExpr: `strftime('%Y', ${dateColumn})`,
                labelExpr: `strftime('%Y', ${dateColumn})`,
                orderExpr: `strftime('%Y', ${dateColumn})`,
            };
    }
}

// ============================================================
// Main query function
// ============================================================

/**
 * Fetch aggregated workout metrics grouped by time bucket within a date range.
 *
 * @param metric - Which metric to aggregate (volume, sets, reps, duration)
 * @param timeBucket - How to group data points (per workout, week, month, year)
 * @param range - Date window to query (1M, 3M, 6M, 1Y, ALL)
 * @returns Array of data points for bar chart rendering
 */
export async function getAggregatedMetric(
    metric: MetricType,
    timeBucket: TimeBucket,
    range: ChartRange,
): Promise<AggregatedMetricPoint[]> {
    const db = await getDatabase();
    if (!db) return [];

    try {
        const { selectExpr, fromClause, dateColumn } = buildMetricQuery(metric);
        const { groupExpr, labelExpr, orderExpr } = buildBucketExpression(timeBucket, dateColumn);
        const rangeStart = getDateRangeStart(range);

        const whereClause = rangeStart
            ? `WHERE w.status = 'completed' AND ${dateColumn} >= ?`
            : `WHERE w.status = 'completed'`;

        const params: string[] = rangeStart ? [rangeStart] : [];

        const sql = `
            SELECT
                ${labelExpr} AS bucket_label,
                ${groupExpr} AS bucket_date,
                COALESCE(${selectExpr}, 0) AS value
            FROM ${fromClause}
            ${whereClause}
            GROUP BY ${groupExpr}
            ORDER BY ${orderExpr} ASC
        `;

        const rows = await db.getAllAsync<AggregatedMetricRow>(sql, params);

        return rows.map((row) => ({
            label: row.bucket_label ?? '',
            value: row.value ?? 0,
            date: row.bucket_date ?? undefined,
        }));
    } catch (error) {
        console.error('[AnalyticsService] Failed to get aggregated metric:', error);
        return [];
    }
}

// ============================================================
// Consistency Stats
// ============================================================

/**
 * Get summary consistency statistics for the given date range.
 */
export async function getConsistencyStats(
    range: ChartRange,
): Promise<ConsistencyStats> {
    const db = await getDatabase();
    const empty: ConsistencyStats = {
        totalWorkouts: 0,
        activeDays: 0,
        currentStreak: 0,
        avgPerWeek: 0,
    };

    if (!db) return empty;

    try {
        const rangeStart = getDateRangeStart(range);
        const whereRange = rangeStart
            ? `AND completed_at >= ?`
            : '';
        const params: string[] = rangeStart ? [rangeStart] : [];

        // Total workouts
        const totalRow = await db.getFirstAsync<CountRow>(
            `SELECT COUNT(*) AS count FROM workouts
             WHERE status = 'completed' ${whereRange}`,
            params,
        );
        const totalWorkouts = totalRow?.count ?? 0;

        // Active days
        const activeDaysRow = await db.getFirstAsync<CountRow>(
            `SELECT COUNT(DISTINCT DATE(completed_at)) AS count FROM workouts
             WHERE status = 'completed' ${whereRange}`,
            params,
        );
        const activeDays = activeDaysRow?.count ?? 0;

        // Average per week
        let avgPerWeek = 0;
        if (totalWorkouts > 0) {
            if (rangeStart) {
                const startDate = new Date(rangeStart);
                const now = new Date();
                const weeksInRange = Math.max(
                    1,
                    (now.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000),
                );
                avgPerWeek = Math.round((totalWorkouts / weeksInRange) * 10) / 10;
            } else {
                // ALL range — find the first workout date
                const firstRow = await db.getFirstAsync<{ first_date: string }>(
                    `SELECT MIN(completed_at) AS first_date FROM workouts WHERE status = 'completed'`,
                );
                if (firstRow?.first_date) {
                    const firstDate = new Date(firstRow.first_date);
                    const now = new Date();
                    const weeksTotal = Math.max(
                        1,
                        (now.getTime() - firstDate.getTime()) / (7 * 24 * 60 * 60 * 1000),
                    );
                    avgPerWeek = Math.round((totalWorkouts / weeksTotal) * 10) / 10;
                }
            }
        }

        // Current streak: consecutive ISO weeks with ≥1 workout (walking backward)
        // BH-001 fix: Fetch raw dates and compute ISO week keys entirely in JS
        // to avoid mismatch between SQLite's %W (non-ISO) and JS ISO 8601 weeks.
        const dateRows = await db.getAllAsync<DateRow>(
            `SELECT DISTINCT DATE(completed_at) AS workout_date
             FROM workouts WHERE status = 'completed'`,
        );

        let currentStreak = 0;
        if (dateRows.length > 0) {
            // Build a set of ISO week keys from raw dates
            const weekSet = new Set<string>();
            for (const row of dateRows) {
                const d = new Date(row.workout_date + 'T00:00:00');
                weekSet.add(toISOWeekKey(d));
            }

            const now = new Date();
            const currentWeekKey = toISOWeekKey(now);

            // Walk backward week by week from current week
            const checkDate = new Date(now);
            // Start from the Monday of the current week
            const dayOfWeek = checkDate.getDay(); // 0=Sun
            const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            checkDate.setDate(checkDate.getDate() + mondayOffset);
            checkDate.setHours(0, 0, 0, 0);

            // If current week has no workout, check if we should still count
            // (week isn't over yet, so start streak from last week if needed)
            if (!weekSet.has(currentWeekKey)) {
                // Move to last week to start counting
                checkDate.setDate(checkDate.getDate() - 7);
            }

            for (let i = 0; i < 200; i++) {
                const weekKey = toISOWeekKey(checkDate);
                if (weekSet.has(weekKey)) {
                    currentStreak++;
                    checkDate.setDate(checkDate.getDate() - 7);
                } else {
                    break;
                }
            }
        }

        return { totalWorkouts, activeDays, currentStreak, avgPerWeek };
    } catch (error) {
        console.error('[AnalyticsService] Failed to get consistency stats:', error);
        return empty;
    }
}

/** Get ISO 8601 week number for a date */
function getISOWeekNumber(date: Date): number {
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
// Muscle Distribution
// ============================================================

/**
 * Get muscle group distribution for the given metric and date range.
 *
 * For each workout exercise in range, parses the exercise_muscle_groups
 * JSON and distributes the metric value across muscle groups weighted
 * by their contribution percentage.
 */
export async function getMuscleDistribution(
    metric: MetricType,
    range: ChartRange,
): Promise<MuscleDistributionPoint[]> {
    const db = await getDatabase();
    if (!db) return [];

    try {
        const rangeStart = getDateRangeStart(range);
        const whereRange = rangeStart
            ? `AND w.completed_at >= ?`
            : '';
        const params: string[] = rangeStart ? [rangeStart] : [];

        // Build metric-specific value expression
        let metricExpr: string;
        let joinSets = false;

        switch (metric) {
            case 'volume':
                // Volume per exercise = SUM(weight * reps) from sets
                metricExpr = 'COALESCE(SUM(ws.weight * ws.reps), 0)';
                joinSets = true;
                break;
            case 'sets':
                // Count of sets per exercise
                metricExpr = 'COUNT(ws.id)';
                joinSets = true;
                break;
            case 'reps':
                metricExpr = 'COALESCE(SUM(ws.reps), 0)';
                joinSets = true;
                break;
            case 'duration':
                // Duration is workout-level, distribute evenly across exercises
                // Use 1 as value — gets multiplied by contribution
                metricExpr = '1';
                break;
        }

        const setJoin = joinSets
            ? `JOIN workout_sets ws ON ws.workout_exercise_id = we.id`
            : '';

        const sql = `
            SELECT
                we.exercise_muscle_groups,
                ${metricExpr} AS metric_value
            FROM workout_exercises we
            JOIN workouts w ON w.id = we.workout_id
            ${setJoin}
            WHERE w.status = 'completed' ${whereRange}
            GROUP BY we.id
        `;

        const rows = await db.getAllAsync<MuscleSourceRow>(sql, params);

        // Aggregate across muscle groups using contribution weighting
        const distribution = new Map<string, number>();

        for (const row of rows) {
            const muscleGroups = safeJsonParse<MuscleContribution[]>(
                row.exercise_muscle_groups,
                [],
            );

            if (muscleGroups.length === 0) continue;

            for (const mg of muscleGroups) {
                const weight = (mg.contribution ?? 100) / 100;
                const weighted = row.metric_value * weight;
                const current = distribution.get(mg.muscle) ?? 0;
                distribution.set(mg.muscle, current + weighted);
            }
        }

        // Convert to sorted array (descending by value)
        return Array.from(distribution.entries())
            .map(([muscleGroup, value]) => ({
                muscleGroup,
                value: Math.round(value),
            }))
            .sort((a, b) => b.value - a.value);
    } catch (error) {
        console.error('[AnalyticsService] Failed to get muscle distribution:', error);
        return [];
    }
}

// ============================================================
// Micro Analytics — Per-Exercise Queries
// ============================================================

/** Date label formatter for per-workout time series */
function formatDateLabel(isoDate: string): string {
    const d = new Date(isoDate);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return `${month}/${day}`;
}

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
        console.error('[AnalyticsService] Failed to get performed exercises:', error);
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
                MAX(ws.weight * (1.0 + ws.reps / 30.0)) AS value
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
        console.error('[AnalyticsService] Failed to get est. 1RM:', error);
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
        console.error('[AnalyticsService] Failed to get max weight:', error);
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
                SUM(ws.weight * ws.reps) AS value
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
        console.error('[AnalyticsService] Failed to get exercise volume:', error);
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
        console.error('[AnalyticsService] Failed to get max reps:', error);
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
        console.error('[AnalyticsService] Failed to get best weight for reps:', error);
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
        console.error('[AnalyticsService] Failed to get fatigue ratio:', error);
        return empty;
    }
}

export default {
    getAggregatedMetric,
    getDateRangeStart,
    getConsistencyStats,
    getMuscleDistribution,
    getPerformedExercises,
    getEstimated1RM,
    getMaxWeight,
    getExerciseVolume,
    getMaxReps,
    getBestWeightForReps,
    getFatigueRatio,
};
