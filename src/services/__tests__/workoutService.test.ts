/**
 * Tests for workoutService
 *
 * Validates the CRUD round-trip for workouts:
 * save, update, load (list + by ID), delete, and previous-sets queries.
 *
 * Uses a mock database following the same pattern as analyticsService.test.ts.
 * The hydration layer is tested independently in hydration.test.ts —
 * these tests focus on the SQL layer and data flow.
 *
 * TD-049: This was a pre-Phase 6 prerequisite for test coverage
 * on the most critical codepath (workout save/load).
 */

import {
    saveWorkout,
    updateWorkout,
    getWorkouts,
    getWorkoutById,
    deleteWorkout,
    getWorkoutCount,
    getPreviousSetsForExercise,
    getPreviousSetsForExercises,
} from '../workoutService';
import {
    createWorkout,
    createWorkoutExercise,
    createSet,
} from '../../models/workout';
import type { Exercise } from '../../models/exercise';

// ============================================================
// Mock database
// ============================================================

const mockRunAsync = jest.fn();
const mockGetAllAsync = jest.fn();
const mockGetFirstAsync = jest.fn();
const mockExecAsync = jest.fn();
const mockWithTransactionAsync = jest.fn();

let mockDb: {
    runAsync: jest.Mock;
    getAllAsync: jest.Mock;
    getFirstAsync: jest.Mock;
    execAsync: jest.Mock;
    withTransactionAsync: jest.Mock;
} | null = null;

jest.mock('../database', () => ({
    getDatabase: jest.fn(async () => mockDb),
}));

jest.mock('../goalProgressService', () => ({
    refreshAllGoalProgress: jest.fn(async () => []),
}));

// Mock batchGetAll to just call the query builder directly
jest.mock('../../utils/batchQuery', () => ({
    batchGetAll: jest.fn(async (db: unknown, ids: string[], buildQuery: Function) => {
        if (ids.length === 0) return [];
        const placeholders = ids.map(() => '?').join(',');
        const [sql, params] = buildQuery(placeholders, ids);
        return (db as { getAllAsync: jest.Mock }).getAllAsync(sql, params);
    }),
}));

// ============================================================
// Test helpers
// ============================================================

function setMockDb(available: boolean) {
    if (available) {
        mockDb = {
            runAsync: mockRunAsync,
            getAllAsync: mockGetAllAsync,
            getFirstAsync: mockGetFirstAsync,
            execAsync: mockExecAsync,
            withTransactionAsync: mockWithTransactionAsync,
        };
        // Default: withTransactionAsync executes the callback immediately
        mockWithTransactionAsync.mockImplementation(async (fn: () => Promise<void>) => {
            await fn();
        });
    } else {
        mockDb = null;
    }
}

function makeExercise(overrides: Partial<Exercise> = {}): Exercise {
    return {
        id: 'ex-bench',
        name: 'Bench Press',
        category: 'strength',
        muscleGroups: [{ muscle: 'chest', contribution: 80, isPrimary: true }],
        equipment: ['barbell'],
        trackWeight: true,
        trackReps: true,
        trackTime: false,
        trackDistance: false,
        isCustom: false,
        isHidden: false,
        isFavorite: false,
        createdAt: new Date(0),
        updatedAt: new Date(0),
        ...overrides,
    };
}

function makeTestWorkout() {
    const exercise = makeExercise();
    const set1 = createSet(0);
    const set2 = createSet(1);
    // Simulate completed sets with data
    const completedSet1 = { ...set1, weight: 135, reps: 8, status: 'completed' as const };
    const completedSet2 = { ...set2, weight: 145, reps: 6, status: 'completed' as const };

    const workoutExercise = createWorkoutExercise(exercise, 0);
    const exerciseWithSets = {
        ...workoutExercise,
        sets: [completedSet1, completedSet2],
    };

    const workout = createWorkout();
    return {
        ...workout,
        name: 'Test Workout',
        status: 'completed' as const,
        startedAt: new Date('2026-03-15T09:00:00Z'),
        completedAt: new Date('2026-03-15T10:15:00Z'),
        totalDuration: 4500,
        totalVolume: 1950,
        totalSets: 2,
        muscleGroupsWorked: ['chest'],
        main: {
            ...workout.main,
            exercises: [exerciseWithSets],
        },
    };
}

// ============================================================
// saveWorkout
// ============================================================

describe('saveWorkout', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns empty array when DB is unavailable', async () => {
        setMockDb(false);
        const workout = makeTestWorkout();
        const result = await saveWorkout(workout);
        expect(result).toEqual([]);
        expect(mockRunAsync).not.toHaveBeenCalled();
    });

    it('inserts workout row, exercise rows, and set rows inside a transaction', async () => {
        setMockDb(true);
        mockRunAsync.mockResolvedValue({ changes: 1 });

        const workout = makeTestWorkout();
        await saveWorkout(workout);

        // Transaction should be used
        expect(mockWithTransactionAsync).toHaveBeenCalledTimes(1);

        // 1 workout + 1 exercise + 2 sets = 4 inserts
        expect(mockRunAsync).toHaveBeenCalledTimes(4);

        // First call should be the workout INSERT
        const [workoutSql] = mockRunAsync.mock.calls[0];
        expect(workoutSql).toContain('INSERT INTO workouts');
        expect(workoutSql).toContain('id, name, status');

        // Second call should be the exercise INSERT
        const [exerciseSql] = mockRunAsync.mock.calls[1];
        expect(exerciseSql).toContain('INSERT INTO workout_exercises');

        // Third and fourth calls should be set INSERTs
        const [setSql] = mockRunAsync.mock.calls[2];
        expect(setSql).toContain('INSERT INTO workout_sets');
    });

    it('passes correct workout values in params', async () => {
        setMockDb(true);
        mockRunAsync.mockResolvedValue({ changes: 1 });

        const workout = makeTestWorkout();
        await saveWorkout(workout);

        const [, params] = mockRunAsync.mock.calls[0];
        // First param should be the workout ID
        expect(params[0]).toBe(workout.id);
        // Second param should be the workout name
        expect(params[1]).toBe('Test Workout');
        // Third param should be status
        expect(params[2]).toBe('completed');
    });

    it('serializes muscleGroupsWorked as JSON', async () => {
        setMockDb(true);
        mockRunAsync.mockResolvedValue({ changes: 1 });

        const workout = makeTestWorkout();
        await saveWorkout(workout);

        const [, params] = mockRunAsync.mock.calls[0];
        // muscleGroupsWorked is the 9th param (index 8):
        // id(0), name(1), status(2), started_at(3), completed_at(4),
        // total_duration(5), total_volume(6), total_sets(7), muscle_groups_worked(8)
        expect(params[8]).toBe(JSON.stringify(['chest']));
    });

    it('calls refreshAllGoalProgress after saving', async () => {
        setMockDb(true);
        mockRunAsync.mockResolvedValue({ changes: 1 });

        const { refreshAllGoalProgress } = require('../goalProgressService');
        refreshAllGoalProgress.mockResolvedValueOnce([]);

        await saveWorkout(makeTestWorkout());

        expect(refreshAllGoalProgress).toHaveBeenCalledTimes(1);
    });

    it('returns completed goals from refreshAllGoalProgress', async () => {
        setMockDb(true);
        mockRunAsync.mockResolvedValue({ changes: 1 });

        const mockGoal = { id: 'goal-1', name: 'Bench 225', status: 'completed' };
        const { refreshAllGoalProgress } = require('../goalProgressService');
        refreshAllGoalProgress.mockResolvedValueOnce([mockGoal]);

        const result = await saveWorkout(makeTestWorkout());

        expect(result).toEqual([mockGoal]);
    });

    it('propagates DB errors', async () => {
        setMockDb(true);
        mockWithTransactionAsync.mockRejectedValueOnce(new Error('SQLITE_BUSY'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        await expect(saveWorkout(makeTestWorkout())).rejects.toThrow('SQLITE_BUSY');
        consoleSpy.mockRestore();
    });

    it('returns empty array if goal refresh fails (non-fatal)', async () => {
        setMockDb(true);
        mockRunAsync.mockResolvedValue({ changes: 1 });

        const { refreshAllGoalProgress } = require('../goalProgressService');
        refreshAllGoalProgress.mockRejectedValueOnce(new Error('goal error'));
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        const result = await saveWorkout(makeTestWorkout());

        expect(result).toEqual([]);
        consoleSpy.mockRestore();
    });
});

// ============================================================
// updateWorkout
// ============================================================

describe('updateWorkout', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns empty array when DB is unavailable', async () => {
        setMockDb(false);
        const result = await updateWorkout(makeTestWorkout());
        expect(result).toEqual([]);
    });

    it('uses UPDATE (not DELETE+INSERT) for the parent workout row — guardrail #12', async () => {
        setMockDb(true);
        mockRunAsync.mockResolvedValue({ changes: 1 });

        await updateWorkout(makeTestWorkout());

        // First call inside the transaction should be the UPDATE
        const [updateSql] = mockRunAsync.mock.calls[0];
        expect(updateSql).toContain('UPDATE workouts SET');
        expect(updateSql).toContain('WHERE id = ?');
        // Should NOT be a DELETE on the workout itself
        expect(updateSql).not.toContain('DELETE FROM workouts');
    });

    it('deletes old child rows (exercises + sets) then re-inserts', async () => {
        setMockDb(true);
        mockRunAsync.mockResolvedValue({ changes: 1 });

        await updateWorkout(makeTestWorkout());

        // calls: UPDATE workout, DELETE sets, DELETE exercises, INSERT exercise, INSERT set1, INSERT set2
        expect(mockRunAsync.mock.calls.length).toBeGreaterThanOrEqual(6);

        // Second call should delete sets (children first)
        const [deleteSql1] = mockRunAsync.mock.calls[1];
        expect(deleteSql1).toContain('DELETE FROM workout_sets');

        // Third call should delete exercises
        const [deleteSql2] = mockRunAsync.mock.calls[2];
        expect(deleteSql2).toContain('DELETE FROM workout_exercises');
    });

    it('preserves workout ID across update', async () => {
        setMockDb(true);
        mockRunAsync.mockResolvedValue({ changes: 1 });

        const workout = makeTestWorkout();
        await updateWorkout(workout);

        // UPDATE statement: workout.id is the last param (WHERE id = ?)
        const [, updateParams] = mockRunAsync.mock.calls[0];
        expect(updateParams[updateParams.length - 1]).toBe(workout.id);

        // Exercise INSERT: workout_id matches
        const [, exerciseParams] = mockRunAsync.mock.calls[3];
        expect(exerciseParams[1]).toBe(workout.id);
    });
});

// ============================================================
// getWorkouts
// ============================================================

describe('getWorkouts', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns empty array when DB is unavailable', async () => {
        setMockDb(false);
        const result = await getWorkouts();
        expect(result).toEqual([]);
    });

    it('returns empty array when no workouts exist', async () => {
        setMockDb(true);
        mockGetAllAsync.mockResolvedValueOnce([]); // workout rows
        const result = await getWorkouts();
        expect(result).toEqual([]);
    });

    it('queries with ORDER BY completed_at DESC and LIMIT/OFFSET', async () => {
        setMockDb(true);
        mockGetAllAsync.mockResolvedValueOnce([]); // workouts
        await getWorkouts(10, 5);

        const [sql, params] = mockGetAllAsync.mock.calls[0];
        expect(sql).toContain('ORDER BY completed_at DESC');
        expect(sql).toContain('LIMIT ? OFFSET ?');
        expect(params).toEqual([10, 5]);
    });

    it('batch-loads exercises and sets (not N+1)', async () => {
        setMockDb(true);

        // Mock workout rows
        mockGetAllAsync.mockResolvedValueOnce([
            {
                id: 'w-1', name: 'Push', status: 'completed',
                started_at: '2026-03-15T09:00:00', completed_at: '2026-03-15T10:00:00',
                total_duration: 3600, total_volume: 5000, total_sets: 10,
                muscle_groups_worked: '["chest"]', location: null, note: null,
                template_id: null, day_of_week: 3,
                created_at: '2026-03-15T09:00:00', updated_at: '2026-03-15T10:00:00',
            },
        ]);
        // Mock exercise batch (via batchGetAll mock)
        mockGetAllAsync.mockResolvedValueOnce([
            {
                id: 'we-1', workout_id: 'w-1', exercise_id: 'ex-1',
                exercise_name: 'Bench', exercise_category: 'strength',
                exercise_muscle_groups: '[]', exercise_equipment: '[]',
                exercise_track_weight: 1, exercise_track_reps: 1, exercise_track_time: 0,
                order_index: 0, superset_group_id: null, note: null,
            },
        ]);
        // Mock sets batch (via batchGetAll mock)
        mockGetAllAsync.mockResolvedValueOnce([
            {
                id: 's-1', workout_exercise_id: 'we-1', order_index: 0,
                weight: 135, reps: 8, duration: null, distance: null,
                type: 'working', status: 'completed', rpe: null, rir: null,
                suggested_weight: null, suggested_reps: null, note: null,
                completed_at: null, rest_duration: null,
            },
        ]);

        const result = await getWorkouts();

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('w-1');
        expect(result[0].main.exercises).toHaveLength(1);
        expect(result[0].main.exercises[0].sets).toHaveLength(1);
        expect(result[0].main.exercises[0].sets[0].weight).toBe(135);

        // Should be 3 getAllAsync calls total (workouts + exercises batch + sets batch)
        // NOT N+1 per workout
        expect(mockGetAllAsync).toHaveBeenCalledTimes(3);
    });
});

// ============================================================
// getWorkoutById
// ============================================================

describe('getWorkoutById', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns null when DB is unavailable', async () => {
        setMockDb(false);
        const result = await getWorkoutById('w-1');
        expect(result).toBeNull();
    });

    it('returns null for non-existent ID', async () => {
        setMockDb(true);
        mockGetFirstAsync.mockResolvedValueOnce(null);

        const result = await getWorkoutById('nonexistent');
        expect(result).toBeNull();
    });

    it('returns fully assembled workout with exercises and sets', async () => {
        setMockDb(true);

        // Workout row
        mockGetFirstAsync.mockResolvedValueOnce({
            id: 'w-1', name: 'Pull', status: 'completed',
            started_at: '2026-03-15T09:00:00', completed_at: '2026-03-15T10:00:00',
            total_duration: 3600, total_volume: 5000, total_sets: 10,
            muscle_groups_worked: '["back"]', location: null, note: null,
            template_id: null, day_of_week: 1,
            created_at: '2026-03-15T09:00:00', updated_at: '2026-03-15T10:00:00',
        });

        // Exercises
        mockGetAllAsync.mockResolvedValueOnce([
            {
                id: 'we-1', exercise_id: 'ex-row', exercise_name: 'Row',
                exercise_category: 'strength', exercise_muscle_groups: '[]',
                exercise_equipment: '[]', exercise_track_weight: 1,
                exercise_track_reps: 1, exercise_track_time: 0,
                order_index: 0, superset_group_id: null, note: null,
            },
        ]);

        // Sets (via batchGetAll mock)
        mockGetAllAsync.mockResolvedValueOnce([
            {
                id: 's-1', workout_exercise_id: 'we-1', order_index: 0,
                weight: 185, reps: 5, duration: null, distance: null,
                type: 'working', status: 'completed', rpe: 8, rir: 2,
                suggested_weight: null, suggested_reps: null, note: null,
                completed_at: null, rest_duration: null,
            },
        ]);

        const result = await getWorkoutById('w-1');

        expect(result).not.toBeNull();
        expect(result!.id).toBe('w-1');
        expect(result!.name).toBe('Pull');
        expect(result!.main.exercises).toHaveLength(1);
        expect(result!.main.exercises[0].exercise.name).toBe('Row');
        expect(result!.main.exercises[0].sets[0].weight).toBe(185);
        expect(result!.main.exercises[0].sets[0].rpe).toBe(8);
    });
});

// ============================================================
// deleteWorkout
// ============================================================

describe('deleteWorkout', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('does nothing when DB is unavailable', async () => {
        setMockDb(false);
        await deleteWorkout('w-1');
        expect(mockRunAsync).not.toHaveBeenCalled();
    });

    it('deletes by ID', async () => {
        setMockDb(true);
        mockRunAsync.mockResolvedValue({ changes: 1 });
        await deleteWorkout('w-1');

        expect(mockRunAsync).toHaveBeenCalledTimes(1);
        const [sql, params] = mockRunAsync.mock.calls[0];
        expect(sql).toContain('DELETE FROM workouts WHERE id = ?');
        expect(params).toEqual(['w-1']);
    });
});

// ============================================================
// getWorkoutCount
// ============================================================

describe('getWorkoutCount', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns 0 when DB is unavailable', async () => {
        setMockDb(false);
        const result = await getWorkoutCount();
        expect(result).toBe(0);
    });

    it('returns count from database', async () => {
        setMockDb(true);
        mockGetFirstAsync.mockResolvedValueOnce({ count: 42 });
        const result = await getWorkoutCount();
        expect(result).toBe(42);
    });
});

// ============================================================
// getPreviousSetsForExercise
// ============================================================

describe('getPreviousSetsForExercise', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns empty array when DB is unavailable', async () => {
        setMockDb(false);
        const result = await getPreviousSetsForExercise('ex-bench');
        expect(result).toEqual([]);
    });

    it('returns sets from the most recent completed workout', async () => {
        setMockDb(true);
        mockGetAllAsync.mockResolvedValueOnce([
            { weight: 135, reps: 8, type: 'working', order_index: 0 },
            { weight: 145, reps: 6, type: 'working', order_index: 1 },
            { weight: 155, reps: 4, type: 'working', order_index: 2 },
        ]);

        const result = await getPreviousSetsForExercise('ex-bench');

        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({ weight: 135, reps: 8, type: 'working' });
        expect(result[1]).toEqual({ weight: 145, reps: 6, type: 'working' });
        expect(result[2]).toEqual({ weight: 155, reps: 4, type: 'working' });
    });

    it('queries using a correlated subquery for the latest workout', async () => {
        setMockDb(true);
        mockGetAllAsync.mockResolvedValueOnce([]);

        await getPreviousSetsForExercise('ex-bench');

        const [sql, params] = mockGetAllAsync.mock.calls[0];
        expect(sql).toContain("w.status = 'completed'");
        expect(sql).toContain('ORDER BY w.completed_at DESC');
        expect(sql).toContain('LIMIT 1');
        expect(params).toEqual(['ex-bench']);
    });

    it('returns empty array when no previous workout exists', async () => {
        setMockDb(true);
        mockGetAllAsync.mockResolvedValueOnce([]);

        const result = await getPreviousSetsForExercise('ex-nonexistent');
        expect(result).toEqual([]);
    });

    it('handles null weight and reps', async () => {
        setMockDb(true);
        mockGetAllAsync.mockResolvedValueOnce([
            { weight: null, reps: null, type: 'working', order_index: 0 },
        ]);

        const result = await getPreviousSetsForExercise('ex-bodyweight');
        expect(result[0].weight).toBeNull();
        expect(result[0].reps).toBeNull();
    });

    it('returns empty array and logs error on DB failure', async () => {
        setMockDb(true);
        mockGetAllAsync.mockRejectedValueOnce(new Error('SQL error'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const result = await getPreviousSetsForExercise('ex-bench');
        expect(result).toEqual([]);
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('[WorkoutService]'),
            expect.any(Error),
        );
        consoleSpy.mockRestore();
    });
});

// ============================================================
// getPreviousSetsForExercises
// ============================================================

describe('getPreviousSetsForExercises', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns empty Map for empty input', async () => {
        setMockDb(true);
        const result = await getPreviousSetsForExercises([]);
        expect(result).toBeInstanceOf(Map);
        expect(result.size).toBe(0);
    });

    it('returns empty Map when DB is unavailable', async () => {
        setMockDb(false);
        const result = await getPreviousSetsForExercises(['ex-bench']);
        expect(result).toBeInstanceOf(Map);
        expect(result.size).toBe(0);
    });

    it('returns Map keyed by exerciseId with single batched query (PP-075)', async () => {
        setMockDb(true);

        // Single query returns all results with exercise_id column
        mockGetAllAsync.mockResolvedValueOnce([
            { exercise_id: 'ex-bench', weight: 135, reps: 8, type: 'working', order_index: 0 },
            { exercise_id: 'ex-bench', weight: 145, reps: 6, type: 'working', order_index: 1 },
            { exercise_id: 'ex-squat', weight: 225, reps: 5, type: 'working', order_index: 0 },
        ]);

        const result = await getPreviousSetsForExercises(['ex-bench', 'ex-squat']);

        expect(result).toBeInstanceOf(Map);
        expect(result.size).toBe(2);
        expect(result.get('ex-bench')).toHaveLength(2);
        expect(result.get('ex-bench')![0]).toEqual({ weight: 135, reps: 8, type: 'working' });
        expect(result.get('ex-squat')).toHaveLength(1);
        expect(result.get('ex-squat')![0]).toEqual({ weight: 225, reps: 5, type: 'working' });

        // Should be exactly 1 getAllAsync call (via batchGetAll), NOT N
        expect(mockGetAllAsync).toHaveBeenCalledTimes(1);

        // Verify CTE query uses ROW_NUMBER
        const [sql] = mockGetAllAsync.mock.calls[0];
        expect(sql).toContain('ROW_NUMBER()');
        expect(sql).toContain("w.status = 'completed'");
    });

    it('returns empty arrays for exercises with no history', async () => {
        setMockDb(true);

        // Only ex-bench has results; ex-squat has none
        mockGetAllAsync.mockResolvedValueOnce([
            { exercise_id: 'ex-bench', weight: 135, reps: 8, type: 'working', order_index: 0 },
        ]);

        const result = await getPreviousSetsForExercises(['ex-bench', 'ex-squat']);

        expect(result.get('ex-bench')).toHaveLength(1);
        expect(result.get('ex-squat')).toEqual([]);
    });

    it('returns empty arrays for all exercises on DB error', async () => {
        setMockDb(true);
        mockGetAllAsync.mockRejectedValueOnce(new Error('SQL error'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const result = await getPreviousSetsForExercises(['ex-bench', 'ex-squat']);

        expect(result.get('ex-bench')).toEqual([]);
        expect(result.get('ex-squat')).toEqual([]);
        consoleSpy.mockRestore();
    });
});
