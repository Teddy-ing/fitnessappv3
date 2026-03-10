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

/** Row for weekly workout presence (streak calculation) */
interface WeekRow {
    week_key: string;
}

/** Row for muscle distribution source data */
interface MuscleSourceRow {
    exercise_muscle_groups: string | null;
    metric_value: number;
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
        case 'per_week':
            return {
                groupExpr: `strftime('%Y-W%W', ${dateColumn})`,
                labelExpr: `'W' || strftime('%W', ${dateColumn})`,
                orderExpr: `strftime('%Y-W%W', ${dateColumn})`,
            };
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
        const weekRows = await db.getAllAsync<WeekRow>(
            `SELECT DISTINCT strftime('%Y-W%W', completed_at) AS week_key
             FROM workouts WHERE status = 'completed'
             ORDER BY week_key DESC`,
        );

        let currentStreak = 0;
        if (weekRows.length > 0) {
            // Build the current ISO week key
            const now = new Date();
            const currentWeekKey = `${now.getFullYear()}-W${String(getISOWeekNumber(now)).padStart(2, '0')}`;
            const weekSet = new Set(weekRows.map((r) => r.week_key));

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
                const weekKey = `${checkDate.getFullYear()}-W${String(getISOWeekNumber(checkDate)).padStart(2, '0')}`;
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

/** Get ISO week number for a date */
function getISOWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
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

export default {
    getAggregatedMetric,
    getDateRangeStart,
    getConsistencyStats,
    getMuscleDistribution,
};
