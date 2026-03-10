/**
 * useMacroAnalytics Hook
 *
 * Manages macro analytics state: metric selection, time bucket, chart range,
 * and fetched chart data. Re-fetches automatically when any control changes.
 *
 * Convention: extracted because it manages 3+ useState for one concern
 * (metric, timeBucket, chartRange, data, loading, error).
 */

import { useState, useEffect, useCallback } from 'react';
import {
    MetricType,
    TimeBucket,
    ChartRange,
    AggregatedMetricPoint,
} from '../models/analytics';
import { getAggregatedMetric } from '../services/analyticsService';

interface UseMacroAnalyticsReturn {
    /** Currently selected metric */
    metric: MetricType;
    /** Currently selected time bucket */
    timeBucket: TimeBucket;
    /** Currently selected chart range */
    chartRange: ChartRange;
    /** Fetched chart data points */
    data: AggregatedMetricPoint[];
    /** Whether data is currently loading */
    loading: boolean;
    /** Error message if fetch failed */
    error: string | null;
    /** Update the selected metric */
    setMetric: (m: MetricType) => void;
    /** Update the selected time bucket */
    setTimeBucket: (tb: TimeBucket) => void;
    /** Update the selected chart range */
    setChartRange: (cr: ChartRange) => void;
}

export function useMacroAnalytics(): UseMacroAnalyticsReturn {
    const [metric, setMetric] = useState<MetricType>('volume');
    const [timeBucket, setTimeBucket] = useState<TimeBucket>('per_week');
    const [chartRange, setChartRange] = useState<ChartRange>('3M');
    const [data, setData] = useState<AggregatedMetricPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                const result = await getAggregatedMetric(metric, timeBucket, chartRange);
                if (!cancelled) {
                    setData(result);
                }
            } catch (err) {
                if (!cancelled) {
                    console.error('[useMacroAnalytics] Fetch failed:', err);
                    setError('Failed to load analytics data');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        fetchData();

        return () => {
            cancelled = true;
        };
    }, [metric, timeBucket, chartRange]);

    const handleSetMetric = useCallback((m: MetricType) => setMetric(m), []);
    const handleSetTimeBucket = useCallback((tb: TimeBucket) => setTimeBucket(tb), []);
    const handleSetChartRange = useCallback((cr: ChartRange) => setChartRange(cr), []);

    return {
        metric,
        timeBucket,
        chartRange,
        data,
        loading,
        error,
        setMetric: handleSetMetric,
        setTimeBucket: handleSetTimeBucket,
        setChartRange: handleSetChartRange,
    };
}
