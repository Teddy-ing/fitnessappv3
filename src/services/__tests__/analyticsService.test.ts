/**
 * Tests for analyticsService
 *
 * Uses a mock database to test aggregation queries without
 * requiring an actual SQLite database.
 */

import {
    getAggregatedMetric,
    getDateRangeStart,
    getConsistencyStats,
    getMuscleDistribution,
} from '../analyticsService';
import {
    getPerformedExercises,
    getEstimated1RM,
    getMaxWeight,
    getExerciseVolume,
    getMaxReps,
    getBestWeightForReps,
    getFatigueRatio,
} from '../exerciseAnalyticsService';

// ============================================================
// Mock database
// ============================================================

const mockGetAllAsync = jest.fn();
const mockGetFirstAsync = jest.fn();
let mockDb: { getAllAsync: jest.Mock; getFirstAsync: jest.Mock } | null = null;

jest.mock('../database', () => ({
    getDatabase: jest.fn(async () => mockDb),
}));

// ============================================================
// Test helpers
// ============================================================

function setMockDb(available: boolean) {
    if (available) {
        mockDb = {
            getAllAsync: mockGetAllAsync,
            getFirstAsync: mockGetFirstAsync,
        };
    } else {
        mockDb = null;
    }
}

function setMockRows(rows: Array<{ bucket_label: string; bucket_date: string; value: number }>) {
    mockGetAllAsync.mockResolvedValueOnce(rows);
}

// ============================================================
// getDateRangeStart
// ============================================================

describe('getDateRangeStart', () => {
    it('returns null for ALL range', () => {
        expect(getDateRangeStart('ALL')).toBeNull();
    });

    it('returns a date string for 1M range', () => {
        const result = getDateRangeStart('1M');
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');

        const date = new Date(result!);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        expect(diffDays).toBeGreaterThan(25);
        expect(diffDays).toBeLessThan(35);
    });

    it('returns a date string for 3M range', () => {
        const result = getDateRangeStart('3M');
        const date = new Date(result!);
        const now = new Date();
        const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
        expect(diffDays).toBeGreaterThan(80);
        expect(diffDays).toBeLessThan(100);
    });

    it('returns a date string for 6M range', () => {
        const result = getDateRangeStart('6M');
        const date = new Date(result!);
        const now = new Date();
        const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
        expect(diffDays).toBeGreaterThan(170);
        expect(diffDays).toBeLessThan(190);
    });

    it('returns a date string for 1Y range', () => {
        const result = getDateRangeStart('1Y');
        const date = new Date(result!);
        const now = new Date();
        const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
        expect(diffDays).toBeGreaterThan(355);
        expect(diffDays).toBeLessThan(375);
    });
});

// ============================================================
// getAggregatedMetric
// ============================================================

describe('getAggregatedMetric', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns empty array when DB is unavailable', async () => {
        setMockDb(false);
        const result = await getAggregatedMetric('volume', 'per_month', '3M');
        expect(result).toEqual([]);
    });

    it('returns aggregated volume data per month', async () => {
        setMockDb(true);
        setMockRows([
            { bucket_label: 'Jan', bucket_date: '2026-01', value: 15000 },
            { bucket_label: 'Feb', bucket_date: '2026-02', value: 22000 },
            { bucket_label: 'Mar', bucket_date: '2026-03', value: 18500 },
        ]);

        const result = await getAggregatedMetric('volume', 'per_month', '3M');

        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({ label: 'Jan', value: 15000, date: '2026-01' });
        expect(result[1].value).toBe(22000);
        expect(result[2].label).toBe('Mar');

        expect(mockGetAllAsync).toHaveBeenCalledTimes(1);
        const [sql, params] = mockGetAllAsync.mock.calls[0];
        expect(params).toHaveLength(1);
        expect(sql).toContain('total_volume');
        expect(sql).toContain("strftime('%Y-%m'");
    });

    it('queries total_sets for sets metric', async () => {
        setMockDb(true);
        setMockRows([{ bucket_label: 'W10', bucket_date: '2026-W10', value: 42 }]);

        const result = await getAggregatedMetric('sets', 'per_week', '1M');
        expect(result).toHaveLength(1);
        expect(result[0].value).toBe(42);

        const [sql] = mockGetAllAsync.mock.calls[0];
        expect(sql).toContain('total_sets');
    });

    it('joins workout_sets for reps metric', async () => {
        setMockDb(true);
        setMockRows([
            { bucket_label: '03/01', bucket_date: '2026-03-01T10:00:00Z', value: 120 },
            { bucket_label: '03/05', bucket_date: '2026-03-05T10:00:00Z', value: 95 },
        ]);

        const result = await getAggregatedMetric('reps', 'per_workout', '1M');
        expect(result).toHaveLength(2);
        expect(result[0].value).toBe(120);

        const [sql] = mockGetAllAsync.mock.calls[0];
        expect(sql).toContain('workout_sets');
        expect(sql).toContain('SUM(ws.reps)');
    });

    it('queries total_duration for duration metric', async () => {
        setMockDb(true);
        setMockRows([
            { bucket_label: '2025', bucket_date: '2025', value: 360000 },
            { bucket_label: '2026', bucket_date: '2026', value: 120000 },
        ]);

        const result = await getAggregatedMetric('duration', 'per_year', '1Y');
        expect(result).toHaveLength(2);
        const [sql] = mockGetAllAsync.mock.calls[0];
        expect(sql).toContain('total_duration');
    });

    it('passes no date parameter for ALL range', async () => {
        setMockDb(true);
        setMockRows([{ bucket_label: 'Jan', bucket_date: '2026-01', value: 5000 }]);

        await getAggregatedMetric('volume', 'per_month', 'ALL');

        const [sql, params] = mockGetAllAsync.mock.calls[0];
        expect(params).toHaveLength(0);
        expect(sql).not.toContain('>=');
    });

    it('returns correct shape for empty result set', async () => {
        setMockDb(true);
        setMockRows([]);
        const result = await getAggregatedMetric('volume', 'per_week', '3M');
        expect(result).toEqual([]);
        expect(Array.isArray(result)).toBe(true);
    });

    it('handles null bucket_label gracefully', async () => {
        setMockDb(true);
        mockGetAllAsync.mockResolvedValueOnce([
            { bucket_label: null, bucket_date: '2026-01', value: 100 },
        ]);
        const result = await getAggregatedMetric('volume', 'per_month', '1M');
        expect(result).toHaveLength(1);
        expect(result[0].label).toBe('');
        expect(result[0].value).toBe(100);
    });

    it('returns empty array and logs error on DB failure', async () => {
        setMockDb(true);
        mockGetAllAsync.mockRejectedValueOnce(new Error('DB error'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const result = await getAggregatedMetric('volume', 'per_month', '3M');
        expect(result).toEqual([]);
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('[AnalyticsService]'),
            expect.any(Error),
        );
        consoleSpy.mockRestore();
    });

    it('always filters for completed workouts', async () => {
        setMockDb(true);
        setMockRows([]);
        await getAggregatedMetric('volume', 'per_month', '3M');
        const [sql] = mockGetAllAsync.mock.calls[0];
        expect(sql).toContain("w.status = 'completed'");
    });

    it('orders results ascending by bucket', async () => {
        setMockDb(true);
        setMockRows([]);
        await getAggregatedMetric('sets', 'per_week', '6M');
        const [sql] = mockGetAllAsync.mock.calls[0];
        expect(sql).toContain('ORDER BY');
        expect(sql).toContain('ASC');
    });
});

// ============================================================
// getConsistencyStats
// ============================================================

describe('getConsistencyStats', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns zeros when DB is unavailable', async () => {
        setMockDb(false);
        const result = await getConsistencyStats('3M');
        expect(result).toEqual({
            totalWorkouts: 0,
            activeDays: 0,
            currentStreak: 0,
            avgPerWeek: 0,
        });
    });

    it('returns correct counts for total workouts and active days', async () => {
        setMockDb(true);
        mockGetFirstAsync.mockResolvedValueOnce({ count: 24 });
        mockGetFirstAsync.mockResolvedValueOnce({ count: 18 });
        mockGetAllAsync.mockResolvedValueOnce([]);

        const result = await getConsistencyStats('3M');

        expect(result.totalWorkouts).toBe(24);
        expect(result.activeDays).toBe(18);
    });

    it('calculates avg per week for bounded range', async () => {
        setMockDb(true);
        mockGetFirstAsync.mockResolvedValueOnce({ count: 12 });
        mockGetFirstAsync.mockResolvedValueOnce({ count: 10 });
        mockGetAllAsync.mockResolvedValueOnce([]);

        const result = await getConsistencyStats('3M');

        // ~12 workouts over ~13 weeks ≈ 0.9/week
        expect(result.avgPerWeek).toBeGreaterThan(0);
        expect(result.avgPerWeek).toBeLessThan(2);
    });

    it('returns zero streak when no workouts exist', async () => {
        setMockDb(true);
        mockGetFirstAsync.mockResolvedValueOnce({ count: 0 });
        mockGetFirstAsync.mockResolvedValueOnce({ count: 0 });
        mockGetAllAsync.mockResolvedValueOnce([]);

        const result = await getConsistencyStats('ALL');
        expect(result.currentStreak).toBe(0);
    });

    it('returns zeros on DB error', async () => {
        setMockDb(true);
        mockGetFirstAsync.mockRejectedValueOnce(new Error('DB error'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const result = await getConsistencyStats('1M');
        expect(result.totalWorkouts).toBe(0);
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});

// ============================================================
// getMuscleDistribution
// ============================================================

describe('getMuscleDistribution', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns empty array when DB is unavailable', async () => {
        setMockDb(false);
        const result = await getMuscleDistribution('volume', '3M');
        expect(result).toEqual([]);
    });

    it('returns empty array when no exercise data exists', async () => {
        setMockDb(true);
        mockGetAllAsync.mockResolvedValueOnce([]);
        const result = await getMuscleDistribution('volume', '3M');
        expect(result).toEqual([]);
    });

    it('distributes volume across muscle groups weighted by contribution', async () => {
        setMockDb(true);
        mockGetAllAsync.mockResolvedValueOnce([
            {
                exercise_muscle_groups: JSON.stringify([
                    { muscle: 'chest', contribution: 60, isPrimary: true },
                    { muscle: 'triceps', contribution: 25, isPrimary: false },
                    { muscle: 'shoulders', contribution: 15, isPrimary: false },
                ]),
                metric_value: 1000,
            },
        ]);

        const result = await getMuscleDistribution('volume', '3M');

        expect(result).toHaveLength(3);
        // Sorted descending by value
        expect(result[0].muscleGroup).toBe('chest');
        expect(result[0].value).toBe(600); // 1000 * 0.60
        expect(result[1].muscleGroup).toBe('triceps');
        expect(result[1].value).toBe(250); // 1000 * 0.25
        expect(result[2].muscleGroup).toBe('shoulders');
        expect(result[2].value).toBe(150); // 1000 * 0.15
    });

    it('handles malformed JSON gracefully', async () => {
        setMockDb(true);
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        mockGetAllAsync.mockResolvedValueOnce([
            { exercise_muscle_groups: '{broken}', metric_value: 500 },
        ]);

        const result = await getMuscleDistribution('sets', '1M');
        expect(result).toEqual([]);
        consoleSpy.mockRestore();
    });

    it('returns empty array on DB error', async () => {
        setMockDb(true);
        mockGetAllAsync.mockRejectedValueOnce(new Error('SQL error'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const result = await getMuscleDistribution('reps', 'ALL');
        expect(result).toEqual([]);
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});

// ============================================================
// Micro Analytics — getPerformedExercises
// ============================================================

describe('getPerformedExercises', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns empty array when DB is unavailable', async () => {
        setMockDb(false);
        const result = await getPerformedExercises('3M');
        expect(result).toEqual([]);
    });

    it('returns exercises sorted by recency', async () => {
        setMockDb(true);
        mockGetAllAsync.mockResolvedValueOnce([
            {
                exercise_id: 'ex1',
                exercise_name: 'Bench Press',
                last_performed: '2026-03-10T10:00:00Z',
                total_sessions: 12,
                exercise_muscle_groups: null,
            },
            {
                exercise_id: 'ex2',
                exercise_name: 'Squat',
                last_performed: '2026-03-08T10:00:00Z',
                total_sessions: 8,
                exercise_muscle_groups: null,
            },
        ]);

        const result = await getPerformedExercises('3M');

        expect(result).toHaveLength(2);
        expect(result[0].exerciseId).toBe('ex1');
        expect(result[0].exerciseName).toBe('Bench Press');
        expect(result[0].totalSessions).toBe(12);
        expect(result[1].exerciseId).toBe('ex2');
    });

    it('returns empty array on error', async () => {
        setMockDb(true);
        mockGetAllAsync.mockRejectedValueOnce(new Error('fail'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const result = await getPerformedExercises('ALL');
        expect(result).toEqual([]);
        consoleSpy.mockRestore();
    });

    it('applies LIKE filter when muscleGroups are provided', async () => {
        setMockDb(true);
        mockGetAllAsync.mockResolvedValueOnce([
            {
                exercise_id: 'ex1',
                exercise_name: 'Bench Press',
                last_performed: '2026-03-10T10:00:00Z',
                total_sessions: 5,
                exercise_muscle_groups: JSON.stringify([
                    { muscle: 'chest', contribution: 60, isPrimary: true },
                ]),
            },
        ]);

        const result = await getPerformedExercises('ALL', ['chest']);

        expect(result).toHaveLength(1);
        expect(result[0].exerciseName).toBe('Bench Press');
        expect(result[0].primaryMuscle).toBe('chest');

        const [sql, params] = mockGetAllAsync.mock.calls[0];
        expect(sql).toContain('LIKE');
        expect(params).toContain('%"muscle":"chest"%');
    });

    it('ORs multiple muscle groups in filter', async () => {
        setMockDb(true);
        mockGetAllAsync.mockResolvedValueOnce([]);

        await getPerformedExercises('3M', ['quads', 'hamstrings', 'glutes', 'calves']);

        const [sql, params] = mockGetAllAsync.mock.calls[0];
        expect(sql).toContain('OR');
        expect(params).toContain('%"muscle":"quads"%');
        expect(params).toContain('%"muscle":"hamstrings"%');
    });

    it('extracts primaryMuscle from muscle groups JSON', async () => {
        setMockDb(true);
        mockGetAllAsync.mockResolvedValueOnce([
            {
                exercise_id: 'ex1',
                exercise_name: 'Squat',
                last_performed: '2026-03-10T10:00:00Z',
                total_sessions: 8,
                exercise_muscle_groups: JSON.stringify([
                    { muscle: 'quads', contribution: 50, isPrimary: true },
                    { muscle: 'glutes', contribution: 30, isPrimary: true },
                    { muscle: 'core', contribution: 20, isPrimary: false },
                ]),
            },
        ]);

        const result = await getPerformedExercises('ALL');
        expect(result[0].primaryMuscle).toBe('quads');
    });
});

// ============================================================
// Micro Analytics — getEstimated1RM
// ============================================================

describe('getEstimated1RM', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns empty array when DB is unavailable', async () => {
        setMockDb(false);
        const result = await getEstimated1RM('ex1', '3M');
        expect(result).toEqual([]);
    });

    it('returns time series with rounded Epley values', async () => {
        setMockDb(true);
        // Epley: 225 * (1 + 5/30) = 225 * 1.1667 = 262.5
        mockGetAllAsync.mockResolvedValueOnce([
            { workout_date: '2026-03-01', value: 262.5 },
            { workout_date: '2026-03-05', value: 275.0 },
        ]);

        const result = await getEstimated1RM('ex1', '3M');

        expect(result).toHaveLength(2);
        expect(result[0].value).toBe(262.5);
        expect(result[0].date).toBe('2026-03-01');
        expect(result[0].label).toBeTruthy();
        expect(result[1].value).toBe(275.0);

        // Verify SQL uses Epley formula
        const [sql] = mockGetAllAsync.mock.calls[0];
        expect(sql).toContain('1.0 + ws.reps / 30.0');
    });
});

// ============================================================
// Micro Analytics — getMaxWeight
// ============================================================

describe('getMaxWeight', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns empty array when DB is unavailable', async () => {
        setMockDb(false);
        const result = await getMaxWeight('ex1', '3M');
        expect(result).toEqual([]);
    });

    it('returns max weight per workout date', async () => {
        setMockDb(true);
        mockGetAllAsync.mockResolvedValueOnce([
            { workout_date: '2026-03-01', value: 225 },
            { workout_date: '2026-03-05', value: 230 },
        ]);

        const result = await getMaxWeight('ex1', '3M');

        expect(result).toHaveLength(2);
        expect(result[0].value).toBe(225);
        expect(result[1].value).toBe(230);
    });
});

// ============================================================
// Micro Analytics — getExerciseVolume
// ============================================================

describe('getExerciseVolume', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns volume per workout date', async () => {
        setMockDb(true);
        mockGetAllAsync.mockResolvedValueOnce([
            { workout_date: '2026-03-01', value: 4500 },
        ]);

        const result = await getExerciseVolume('ex1', '1M');

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe(4500);
    });
});

// ============================================================
// Micro Analytics — getMaxReps
// ============================================================

describe('getMaxReps', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns max reps per workout date', async () => {
        setMockDb(true);
        mockGetAllAsync.mockResolvedValueOnce([
            { workout_date: '2026-03-01', value: 12 },
            { workout_date: '2026-03-05', value: 15 },
        ]);

        const result = await getMaxReps('ex1', 'ALL');

        expect(result).toHaveLength(2);
        expect(result[0].value).toBe(12);
        expect(result[1].value).toBe(15);
    });
});

// ============================================================
// Micro Analytics — getBestWeightForReps
// ============================================================

describe('getBestWeightForReps', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns empty array when DB is unavailable', async () => {
        setMockDb(false);
        const result = await getBestWeightForReps('ex1');
        expect(result).toEqual([]);
    });

    it('returns best weight at each rep count', async () => {
        setMockDb(true);
        mockGetAllAsync.mockResolvedValueOnce([
            { reps: 1, weight: 285, achieved_date: '2026-03-01' },
            { reps: 5, weight: 225, achieved_date: '2026-02-28' },
            { reps: 10, weight: 175, achieved_date: '2026-02-21' },
        ]);

        const result = await getBestWeightForReps('ex1');

        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({ reps: 1, weight: 285, date: '2026-03-01' });
        expect(result[1].reps).toBe(5);
        expect(result[2].weight).toBe(175);
    });

    it('returns empty array on error', async () => {
        setMockDb(true);
        mockGetAllAsync.mockRejectedValueOnce(new Error('fail'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const result = await getBestWeightForReps('ex1');
        expect(result).toEqual([]);
        consoleSpy.mockRestore();
    });
});

// ============================================================
// getFatigueRatio
// ============================================================

describe('getFatigueRatio', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns default when DB is unavailable', async () => {
        setMockDb(false);
        const result = await getFatigueRatio();
        expect(result).toEqual({ acute: 0, chronic: 0, ratio: 0, status: 'normal' });
    });

    it('returns normal status when chronic is zero', async () => {
        setMockDb(true);
        mockGetFirstAsync.mockResolvedValueOnce({ total: 5000 });
        mockGetFirstAsync.mockResolvedValueOnce({ total: 0 });

        const result = await getFatigueRatio();
        expect(result.ratio).toBe(0);
        expect(result.status).toBe('normal');
    });

    it('returns light status when ratio < 0.8', async () => {
        setMockDb(true);
        mockGetFirstAsync.mockResolvedValueOnce({ total: 3000 });  // acute
        mockGetFirstAsync.mockResolvedValueOnce({ total: 5000 });  // chronic avg

        const result = await getFatigueRatio();
        expect(result.ratio).toBe(0.6);
        expect(result.status).toBe('light');
    });

    it('returns high status when ratio > 1.3', async () => {
        setMockDb(true);
        mockGetFirstAsync.mockResolvedValueOnce({ total: 8000 });  // acute
        mockGetFirstAsync.mockResolvedValueOnce({ total: 5000 });  // chronic avg

        const result = await getFatigueRatio();
        expect(result.ratio).toBe(1.6);
        expect(result.status).toBe('high');
    });

    it('returns default on error', async () => {
        setMockDb(true);
        mockGetFirstAsync.mockRejectedValueOnce(new Error('fail'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const result = await getFatigueRatio();
        expect(result.ratio).toBe(0);
        expect(result.status).toBe('normal');
        consoleSpy.mockRestore();
    });
});
