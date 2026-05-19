/**
 * Tests for goalService
 *
 * Uses a mock database to test CRUD and progress computation functions
 * without requiring an actual SQLite database.
 */

import {
    createGoal,
    getActiveGoals,
    getCompletedGoals,
    updateGoal,
    deleteGoal,
    markGoalCompleted,
    abandonGoal,
} from '../goalService';
import {
    computeCurrentBest,
    refreshAllGoalProgress,
    getCurrentBestForTarget,
} from '../goalProgressService';

// ============================================================
// Mock database
// ============================================================

const mockGetAllAsync = jest.fn();
const mockGetFirstAsync = jest.fn();
const mockRunAsync = jest.fn();
let mockDb: {
    getAllAsync: jest.Mock;
    getFirstAsync: jest.Mock;
    runAsync: jest.Mock;
} | null = null;

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
            runAsync: mockRunAsync,
        };
    } else {
        mockDb = null;
    }
}

function makeGoalRow(overrides: Partial<Record<string, unknown>> = {}) {
    return {
        id: 'goal-1',
        goal_type: 'exercise_1rm',
        exercise_id: 'bench-press',
        measurement_type_id: null,
        target_value: 315,
        starting_value: 275,
        current_best: 285,
        label: 'Hit 3 plates',
        deadline: '2026-06-01',
        status: 'active',
        completed_at: null,
        created_at: '2026-03-01T00:00:00Z',
        updated_at: '2026-03-20T00:00:00Z',
        ...overrides,
    };
}

// ============================================================
// createGoal
// ============================================================

describe('createGoal', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns null when DB is unavailable', async () => {
        setMockDb(false);
        const result = await createGoal({
            goalType: 'exercise_1rm',
            exerciseId: 'bench-press',
            targetValue: 315,
        });
        expect(result).toBeNull();
    });

    it('inserts a goal and returns the created record', async () => {
        setMockDb(true);
        mockRunAsync.mockResolvedValueOnce(undefined);

        const result = await createGoal({
            goalType: 'exercise_1rm',
            exerciseId: 'bench-press',
            targetValue: 315,
            startingValue: 275,
            label: 'Hit 3 plates',
            deadline: '2026-06-01',
        });

        expect(result).not.toBeNull();
        expect(result!.goalType).toBe('exercise_1rm');
        expect(result!.exerciseId).toBe('bench-press');
        expect(result!.targetValue).toBe(315);
        expect(result!.startingValue).toBe(275);
        expect(result!.currentBest).toBe(275);
        expect(result!.label).toBe('Hit 3 plates');
        expect(result!.deadline).toBe('2026-06-01');
        expect(result!.status).toBe('active');
        expect(result!.completedAt).toBeNull();
        expect(result!.id).toBeTruthy();
        expect(result!.createdAt).toBeTruthy();

        expect(mockRunAsync).toHaveBeenCalledTimes(1);
        const [sql] = mockRunAsync.mock.calls[0];
        expect(sql).toContain('INSERT INTO goals');
    });

    it('handles optional fields as null', async () => {
        setMockDb(true);
        mockRunAsync.mockResolvedValueOnce(undefined);

        const result = await createGoal({
            goalType: 'consistency',
            targetValue: 30,
        });

        expect(result).not.toBeNull();
        expect(result!.exerciseId).toBeNull();
        expect(result!.measurementTypeId).toBeNull();
        expect(result!.label).toBeNull();
        expect(result!.deadline).toBeNull();
        expect(result!.startingValue).toBeNull();
    });

    it('returns null on DB error', async () => {
        setMockDb(true);
        mockRunAsync.mockRejectedValueOnce(new Error('INSERT failed'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const result = await createGoal({
            goalType: 'exercise_1rm',
            exerciseId: 'bench-press',
            targetValue: 315,
        });
        expect(result).toBeNull();
        consoleSpy.mockRestore();
    });
});

// ============================================================
// getActiveGoals
// ============================================================

describe('getActiveGoals', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns empty array when DB is unavailable', async () => {
        setMockDb(false);
        const result = await getActiveGoals();
        expect(result).toEqual([]);
    });

    it('returns active goals sorted by deadline then creation date', async () => {
        setMockDb(true);
        mockGetAllAsync.mockResolvedValueOnce([
            makeGoalRow({ id: 'g1', deadline: '2026-04-01' }),
            makeGoalRow({ id: 'g2', deadline: '2026-06-01' }),
            makeGoalRow({ id: 'g3', deadline: null }),
        ]);

        const result = await getActiveGoals();

        expect(result).toHaveLength(3);
        expect(result[0].id).toBe('g1');
        expect(result[1].id).toBe('g2');
        expect(result[2].id).toBe('g3');

        const [sql] = mockGetAllAsync.mock.calls[0];
        expect(sql).toContain("status = 'active'");
        expect(sql).toContain('ORDER BY');
    });

    it('maps row types correctly', async () => {
        setMockDb(true);
        mockGetAllAsync.mockResolvedValueOnce([makeGoalRow()]);

        const result = await getActiveGoals();

        expect(result[0].goalType).toBe('exercise_1rm');
        expect(result[0].exerciseId).toBe('bench-press');
        expect(result[0].targetValue).toBe(315);
        expect(result[0].startingValue).toBe(275);
        expect(result[0].currentBest).toBe(285);
        expect(result[0].label).toBe('Hit 3 plates');
        expect(result[0].status).toBe('active');
    });
});

// ============================================================
// getCompletedGoals
// ============================================================

describe('getCompletedGoals', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns empty array when DB is unavailable', async () => {
        setMockDb(false);
        const result = await getCompletedGoals();
        expect(result).toEqual([]);
    });

    it('returns completed goals sorted by completed_at DESC', async () => {
        setMockDb(true);
        mockGetAllAsync.mockResolvedValueOnce([
            makeGoalRow({ id: 'g1', status: 'completed', completed_at: '2026-03-20' }),
            makeGoalRow({ id: 'g2', status: 'completed', completed_at: '2026-03-10' }),
        ]);

        const result = await getCompletedGoals();

        expect(result).toHaveLength(2);
        expect(result[0].id).toBe('g1');

        const [sql] = mockGetAllAsync.mock.calls[0];
        expect(sql).toContain("status = 'completed'");
        expect(sql).toContain('completed_at DESC');
    });
});

// ============================================================
// updateGoal
// ============================================================

describe('updateGoal', () => {
    beforeEach(() => jest.clearAllMocks());

    it('does nothing when DB is unavailable', async () => {
        setMockDb(false);
        await updateGoal('goal-1', { targetValue: 405 });
        expect(mockRunAsync).not.toHaveBeenCalled();
    });

    it('updates target value', async () => {
        setMockDb(true);
        mockRunAsync.mockResolvedValueOnce(undefined);

        await updateGoal('goal-1', { targetValue: 405 });

        expect(mockRunAsync).toHaveBeenCalledTimes(1);
        const [sql, params] = mockRunAsync.mock.calls[0];
        expect(sql).toContain('target_value = ?');
        expect(params[0]).toBe(405);
        expect(params[params.length - 1]).toBe('goal-1');
    });

    it('updates multiple fields at once', async () => {
        setMockDb(true);
        mockRunAsync.mockResolvedValueOnce(undefined);

        await updateGoal('goal-1', { targetValue: 405, label: 'New label', deadline: '2026-12-31' });

        const [sql] = mockRunAsync.mock.calls[0];
        expect(sql).toContain('target_value = ?');
        expect(sql).toContain('label = ?');
        expect(sql).toContain('deadline = ?');
    });

    it('does nothing when no updates provided', async () => {
        setMockDb(true);
        await updateGoal('goal-1', {});
        expect(mockRunAsync).not.toHaveBeenCalled();
    });
});

// ============================================================
// deleteGoal
// ============================================================

describe('deleteGoal', () => {
    beforeEach(() => jest.clearAllMocks());

    it('does nothing when DB is unavailable', async () => {
        setMockDb(false);
        await deleteGoal('goal-1');
        expect(mockRunAsync).not.toHaveBeenCalled();
    });

    it('deletes the goal record', async () => {
        setMockDb(true);
        mockRunAsync.mockResolvedValueOnce(undefined);

        await deleteGoal('goal-1');

        expect(mockRunAsync).toHaveBeenCalledTimes(1);
        const [sql, params] = mockRunAsync.mock.calls[0];
        expect(sql).toContain('DELETE FROM goals');
        expect(params).toEqual(['goal-1']);
    });
});

// ============================================================
// markGoalCompleted
// ============================================================

describe('markGoalCompleted', () => {
    beforeEach(() => jest.clearAllMocks());

    it('does nothing when DB is unavailable', async () => {
        setMockDb(false);
        await markGoalCompleted('goal-1', 320);
        expect(mockRunAsync).not.toHaveBeenCalled();
    });

    it('sets status to completed with final value and timestamp', async () => {
        setMockDb(true);
        mockRunAsync.mockResolvedValueOnce(undefined);

        await markGoalCompleted('goal-1', 320);

        expect(mockRunAsync).toHaveBeenCalledTimes(1);
        const [sql, params] = mockRunAsync.mock.calls[0];
        expect(sql).toContain("status = 'completed'");
        expect(sql).toContain('current_best = ?');
        expect(sql).toContain('completed_at = ?');
        expect(params[0]).toBe(320);
        expect(params[params.length - 1]).toBe('goal-1');
    });
});

// ============================================================
// abandonGoal
// ============================================================

describe('abandonGoal', () => {
    beforeEach(() => jest.clearAllMocks());

    it('does nothing when DB is unavailable', async () => {
        setMockDb(false);
        await abandonGoal('goal-1');
        expect(mockRunAsync).not.toHaveBeenCalled();
    });

    it('sets status to abandoned', async () => {
        setMockDb(true);
        mockRunAsync.mockResolvedValueOnce(undefined);

        await abandonGoal('goal-1');

        expect(mockRunAsync).toHaveBeenCalledTimes(1);
        const [sql] = mockRunAsync.mock.calls[0];
        expect(sql).toContain("status = 'abandoned'");
    });
});

// ============================================================
// computeCurrentBest
// ============================================================

describe('computeCurrentBest', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns null when DB is unavailable', async () => {
        setMockDb(false);
        const goal = {
            id: 'g1', goalType: 'exercise_1rm' as const,
            exerciseId: 'bench', measurementTypeId: null,
            targetValue: 315, startingValue: 275, currentBest: 285,
            label: null, deadline: null, status: 'active' as const,
            completedAt: null, createdAt: '2026-03-01T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z',
        };
        const result = await computeCurrentBest(goal);
        expect(result).toBeNull();
    });

    it('dispatches exercise_1rm to correct query', async () => {
        setMockDb(true);
        mockGetFirstAsync.mockResolvedValueOnce({ best: 290 });

        const goal = {
            id: 'g1', goalType: 'exercise_1rm' as const,
            exerciseId: 'bench', measurementTypeId: null,
            targetValue: 315, startingValue: 275, currentBest: 285,
            label: null, deadline: null, status: 'active' as const,
            completedAt: null, createdAt: '2026-03-01T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z',
        };

        const result = await computeCurrentBest(goal);

        expect(result).toBe(290);
        const [sql] = mockGetFirstAsync.mock.calls[0];
        expect(sql).toContain('CASE WHEN ws.reps <= 10 THEN ws.weight * (1.0 + ws.reps / 30.0) ELSE NULL END');
        expect(sql).toContain("ws.type = 'working'");
    });

    it('dispatches exercise_volume to correct query', async () => {
        setMockDb(true);
        mockGetFirstAsync.mockResolvedValueOnce({ best: 12000 });

        const goal = {
            id: 'g1', goalType: 'exercise_volume' as const,
            exerciseId: 'squat', measurementTypeId: null,
            targetValue: 15000, startingValue: 10000, currentBest: 11000,
            label: null, deadline: null, status: 'active' as const,
            completedAt: null, createdAt: '2026-03-01T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z',
        };

        const result = await computeCurrentBest(goal);

        expect(result).toBe(12000);
        const [sql] = mockGetFirstAsync.mock.calls[0];
        expect(sql).toContain('SUM(ws.weight * ws.reps)');
        expect(sql).toContain('GROUP BY we.workout_id');
    });

    it('dispatches exercise_reps to correct query', async () => {
        setMockDb(true);
        mockGetFirstAsync.mockResolvedValueOnce({ best: 15 });

        const goal = {
            id: 'g1', goalType: 'exercise_reps' as const,
            exerciseId: 'pullups', measurementTypeId: null,
            targetValue: 20, startingValue: 10, currentBest: 12,
            label: null, deadline: null, status: 'active' as const,
            completedAt: null, createdAt: '2026-03-01T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z',
        };

        const result = await computeCurrentBest(goal);

        expect(result).toBe(15);
        const [sql] = mockGetFirstAsync.mock.calls[0];
        expect(sql).toContain('MAX(ws.reps)');
    });

    it('dispatches measurement (loss) to MIN query', async () => {
        setMockDb(true);
        mockGetFirstAsync.mockResolvedValueOnce({ best: 178 });

        const goal = {
            id: 'g1', goalType: 'measurement' as const,
            exerciseId: null, measurementTypeId: 'bodyweight',
            targetValue: 175, startingValue: 185, currentBest: 180,
            label: null, deadline: null, status: 'active' as const,
            completedAt: null, createdAt: '2026-03-01T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z',
        };

        const result = await computeCurrentBest(goal);

        expect(result).toBe(178);
        const [sql] = mockGetFirstAsync.mock.calls[0];
        expect(sql).toContain('MIN(value)');
    });

    it('dispatches measurement (gain) to MAX query', async () => {
        setMockDb(true);
        mockGetFirstAsync.mockResolvedValueOnce({ best: 195 });

        const goal = {
            id: 'g1', goalType: 'measurement' as const,
            exerciseId: null, measurementTypeId: 'bodyweight',
            targetValue: 200, startingValue: 180, currentBest: 190,
            label: null, deadline: null, status: 'active' as const,
            completedAt: null, createdAt: '2026-03-01T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z',
        };

        const result = await computeCurrentBest(goal);

        expect(result).toBe(195);
        const [sql] = mockGetFirstAsync.mock.calls[0];
        expect(sql).toContain('MAX(value)');
    });

    it('dispatches consistency to workout count query', async () => {
        setMockDb(true);
        mockGetFirstAsync.mockResolvedValueOnce({ count: 12 });

        const goal = {
            id: 'g1', goalType: 'consistency' as const,
            exerciseId: null, measurementTypeId: null,
            targetValue: 30, startingValue: 0, currentBest: 8,
            label: null, deadline: null, status: 'active' as const,
            completedAt: null, createdAt: '2026-03-01T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z',
        };

        const result = await computeCurrentBest(goal);

        expect(result).toBe(12);
        const [sql] = mockGetFirstAsync.mock.calls[0];
        expect(sql).toContain('COUNT(*)');
        expect(sql).toContain('completed_at >= ?');
    });
});

// ============================================================
// refreshAllGoalProgress
// ============================================================

describe('refreshAllGoalProgress', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns empty array when DB is unavailable', async () => {
        setMockDb(false);
        const result = await refreshAllGoalProgress();
        expect(result).toEqual([]);
    });

    it('updates current_best for all active goals (batched)', async () => {
        setMockDb(true);
        // First call: getActiveGoals
        mockGetAllAsync.mockResolvedValueOnce([
            makeGoalRow({ id: 'g1', target_value: 315, current_best: 285 }),
        ]);
        // Batch 1RM query returns result for bench-press
        mockGetAllAsync.mockResolvedValueOnce([
            { exercise_id: 'bench-press', best: 295 },
        ]);
        // UPDATE current_best
        mockRunAsync.mockResolvedValueOnce(undefined);

        const result = await refreshAllGoalProgress();

        // Should have updated current_best but not completed (295 < 315)
        expect(result).toEqual([]);
        expect(mockRunAsync).toHaveBeenCalledTimes(1);
        const [sql] = mockRunAsync.mock.calls[0];
        expect(sql).toContain('current_best = ?');
    });

    it('marks goals as completed when target is reached (batched)', async () => {
        setMockDb(true);
        // getActiveGoals
        mockGetAllAsync.mockResolvedValueOnce([
            makeGoalRow({ id: 'g1', target_value: 315, current_best: 310 }),
        ]);
        // Batch 1RM query returns value >= target
        mockGetAllAsync.mockResolvedValueOnce([
            { exercise_id: 'bench-press', best: 320 },
        ]);
        // UPDATE current_best
        mockRunAsync.mockResolvedValueOnce(undefined);
        // markGoalCompleted
        mockRunAsync.mockResolvedValueOnce(undefined);

        const result = await refreshAllGoalProgress();

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('g1');
        expect(result[0].status).toBe('completed');
        expect(result[0].currentBest).toBe(320);
    });
});

// ============================================================
// getCurrentBestForTarget
// ============================================================

describe('getCurrentBestForTarget', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns null when DB is unavailable', async () => {
        setMockDb(false);
        const result = await getCurrentBestForTarget('exercise_1rm', 'bench');
        expect(result).toBeNull();
    });

    it('returns 0 for consistency goals', async () => {
        setMockDb(true);
        const result = await getCurrentBestForTarget('consistency');
        expect(result).toBe(0);
    });

    it('returns latest measurement value', async () => {
        setMockDb(true);
        mockGetFirstAsync.mockResolvedValueOnce({ value: 183 });

        const result = await getCurrentBestForTarget('measurement', undefined, 'bodyweight');

        expect(result).toBe(183);
        const [sql] = mockGetFirstAsync.mock.calls[0];
        expect(sql).toContain('ORDER BY recorded_at DESC');
    });

    it('returns null for measurement without typeId', async () => {
        setMockDb(true);
        const result = await getCurrentBestForTarget('measurement');
        expect(result).toBeNull();
    });

    it('returns exercise 1RM for exercise_1rm type', async () => {
        setMockDb(true);
        mockGetFirstAsync.mockResolvedValueOnce({ best: 285 });

        const result = await getCurrentBestForTarget('exercise_1rm', 'bench');

        expect(result).toBe(285);
    });
});
