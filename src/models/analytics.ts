/**
 * Analytics Models
 *
 * Typed interfaces for analytics data.
 * Used by analyticsService and the macro/micro analytics UI.
 */

/** Metric options for the macro analytics dual-axis controller */
export type MetricType = 'volume' | 'sets' | 'reps' | 'duration';

/** Time bucket grouping for bar chart data */
export type TimeBucket = 'per_workout' | 'per_week' | 'per_month' | 'per_year';

/** Chart range (date window) for filtering data */
export type ChartRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';

/** A single data point returned from getAggregatedMetric() */
export interface AggregatedMetricPoint {
    /** Display label for the x-axis (e.g., "Jan", "W12", "Mar 5") */
    label: string;
    /** Aggregated numeric value for this bucket */
    value: number;
    /** ISO date string for the start of this bucket (used for tooltips) */
    date?: string;
}

/** Consistency stats returned by getConsistencyStats() */
export interface ConsistencyStats {
    /** Total completed workouts in range */
    totalWorkouts: number;
    /** Distinct days with a completed workout in range */
    activeDays: number;
    /** Consecutive weeks (backward from current) with ≥1 workout */
    currentStreak: number;
    /** Average workouts per week over the range */
    avgPerWeek: number;
}

/** A single muscle group data point for distribution chart */
export interface MuscleDistributionPoint {
    /** Muscle group name (e.g., "chest", "back") */
    muscleGroup: string;
    /** Aggregated value weighted by contribution percentage */
    value: number;
}

/** Display metadata for each metric type */
export const METRIC_LABELS: Record<MetricType, string> = {
    volume: 'Volume',
    sets: 'Sets',
    reps: 'Reps',
    duration: 'Duration',
};

/** Display metadata for each time bucket */
export const TIME_BUCKET_LABELS: Record<TimeBucket, string> = {
    per_workout: 'Per Workout',
    per_week: 'Per Week',
    per_month: 'Per Month',
    per_year: 'Per Year',
};

/** Display metadata for each chart range */
export const CHART_RANGE_LABELS: Record<ChartRange, string> = {
    '1M': '1M',
    '3M': '3M',
    '6M': '6M',
    '1Y': '1Y',
    ALL: 'ALL',
};
