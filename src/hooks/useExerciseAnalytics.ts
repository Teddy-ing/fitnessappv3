/**
 * useExerciseAnalytics Hook
 *
 * Manages state for per-exercise analytics charts.
 * Fetches all chart data in parallel when exerciseId or chartRange changes.
 */

import { useState, useEffect } from 'react';

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
