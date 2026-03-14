/**
 * useExerciseAnalytics Hook
 *
 * Manages state for per-exercise analytics charts.
 * Fetches all chart data in parallel when exerciseId or chartRange changes.
 */

import { useState, useEffect } from 'react';
import { Platform } from 'react-native';

import {
    getEstimated1RM,
    getMaxWeight,
    getExerciseVolume,
    getMaxReps,
    getBestWeightForReps,
} from '../services/analyticsService';
import {
    ChartRange,
    ExerciseTimeSeriesPoint,
    BestWeightForRep,
} from '../models/analytics';

interface ExerciseAnalyticsState {
    chartRange: ChartRange;
    est1rm: ExerciseTimeSeriesPoint[];
    maxWeight: ExerciseTimeSeriesPoint[];
    volume: ExerciseTimeSeriesPoint[];
    maxReps: ExerciseTimeSeriesPoint[];
    bestForReps: BestWeightForRep[];
    loading: boolean;
}

// ============================================================
// Web mock data for visual debugging
// ============================================================

function generateMockTimeSeries(count: number, baseValue: number, variance: number): ExerciseTimeSeriesPoint[] {
    const points: ExerciseTimeSeriesPoint[] = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - count * 4); // Spread over ~4 days per point

    for (let i = 0; i < count; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i * 4);
        const month = d.getMonth() + 1;
        const day = d.getDate();
        points.push({
            date: d.toISOString(),
            value: baseValue + Math.round((Math.random() - 0.3) * variance),
            label: `${month}/${day}`,
        });
    }
    return points;
}

function getWebMockData(chartRange: ChartRange) {
    const count = chartRange === '1M' ? 7 : 21;
    return {
        est1rm: generateMockTimeSeries(count, 200, 40),
        maxWeight: generateMockTimeSeries(count, 135, 20),
        volume: generateMockTimeSeries(count, 3000, 1500),
        maxReps: generateMockTimeSeries(count, 10, 4),
        bestForReps: [
            { reps: 1, weight: 225, date: new Date().toISOString() },
            { reps: 3, weight: 205, date: new Date().toISOString() },
            { reps: 5, weight: 185, date: new Date().toISOString() },
            { reps: 8, weight: 165, date: new Date().toISOString() },
            { reps: 10, weight: 155, date: new Date().toISOString() },
        ] as BestWeightForRep[],
    };
}

// ============================================================
// Hook
// ============================================================

export function useExerciseAnalytics(exerciseId: string) {
    const [chartRange, setChartRange] = useState<ChartRange>('3M');
    const [state, setState] = useState<Omit<ExerciseAnalyticsState, 'chartRange'>>({
        est1rm: [],
        maxWeight: [],
        volume: [],
        maxReps: [],
        bestForReps: [],
        loading: true,
    });

    useEffect(() => {
        let cancelled = false;
        setState((prev) => ({ ...prev, loading: true }));

        // Web: use mock data (no database available)
        if (Platform.OS === 'web') {
            const mock = getWebMockData(chartRange);
            setState({ ...mock, loading: false });
            return () => {};
        }

        Promise.all([
            getEstimated1RM(exerciseId, chartRange),
            getMaxWeight(exerciseId, chartRange),
            getExerciseVolume(exerciseId, chartRange),
            getMaxReps(exerciseId, chartRange),
            getBestWeightForReps(exerciseId),
        ]).then(([est1rm, maxWeight, volume, maxReps, bestForReps]) => {
            if (!cancelled) {
                setState({
                    est1rm,
                    maxWeight,
                    volume,
                    maxReps,
                    bestForReps,
                    loading: false,
                });
            }
        });

        return () => {
            cancelled = true;
        };
    }, [exerciseId, chartRange]);

    return {
        chartRange,
        setChartRange,
        ...state,
    };
}
