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
import {
    MetricType,
    TimeBucket,
    ChartRange,
    AggregatedMetricPoint,
} from '../models/analytics';

// ============================================================
// Row types (typed DB results)
// ============================================================

/** Raw row returned by aggregation queries */
interface AggregatedMetricRow {
    bucket_label: string;
    bucket_date: string;
    value: number;
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

export default {
    getAggregatedMetric,
    getDateRangeStart,
};
