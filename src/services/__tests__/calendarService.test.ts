/**
 * Tests for calendarService
 *
 * Uses a mock database to test calendar queries without
 * requiring an actual SQLite database.
 */

import {
    getWorkoutsForMonth,
    getWorkoutStreak,
    getRestDaysThisWeek,
    getWorkoutDetail,
    getWorkoutsForDate,
} from '../calendarService';

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

// ============================================================
// getWorkoutsForMonth
// ============================================================

describe('getWorkoutsForMonth', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns empty array when DB is unavailable', async () => {
        setMockDb(false);
        const result = await getWorkoutsForMonth(2026, 3);
        expect(result).toEqual([]);
    });

    it('returns day data grouped by date', async () => {
        setMockDb(true);
        mockGetAllAsync.mockResolvedValueOnce([
            {
                workout_date: '2026-03-01',
                workout_count: 1,
                total_volume: 15000,
                total_sets: 20,
                total_duration: 3600,
                workout_ids: 'w1',
            },
            {
                workout_date: '2026-03-05',
                workout_count: 2,
                total_volume: 22000,
                total_sets: 30,
                total_duration: 5400,
                workout_ids: 'w2,w3',
            },
        ]);

        const result = await getWorkoutsForMonth(2026, 3);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
            date: '2026-03-01',
            workoutCount: 1,
            totalVolume: 15000,
            totalSets: 20,
            totalDuration: 3600,
            workoutIds: ['w1'],
        });
        expect(result[1].workoutCount).toBe(2);
        expect(result[1].workoutIds).toEqual(['w2', 'w3']);

        // Verify correct date range in SQL params
        const [_sql, params] = mockGetAllAsync.mock.calls[0];
        expect(params).toEqual(['2026-03-01', '2026-04-01']);
    });

    it('handles month with no workouts', async () => {
        setMockDb(true);
        mockGetAllAsync.mockResolvedValueOnce([]);
        const result = await getWorkoutsForMonth(2026, 1);
        expect(result).toEqual([]);
        expect(Array.isArray(result)).toBe(true);
    });

    it('handles December to January boundary', async () => {
        setMockDb(true);
        mockGetAllAsync.mockResolvedValueOnce([]);
        await getWorkoutsForMonth(2026, 12);

        const [_sql, params] = mockGetAllAsync.mock.calls[0];
        expect(params).toEqual(['2026-12-01', '2027-01-01']);
    });

    it('returns empty array and logs error on DB failure', async () => {
        setMockDb(true);
        mockGetAllAsync.mockRejectedValueOnce(new Error('DB error'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const result = await getWorkoutsForMonth(2026, 3);
        expect(result).toEqual([]);
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('[CalendarService]'),
            expect.any(Error),
        );
        consoleSpy.mockRestore();
    });

    it('handles null volume/sets/duration gracefully', async () => {
        setMockDb(true);
        mockGetAllAsync.mockResolvedValueOnce([
            {
                workout_date: '2026-03-10',
                workout_count: 1,
                total_volume: null,
                total_sets: null,
                total_duration: null,
                workout_ids: 'w1',
            },
        ]);

        const result = await getWorkoutsForMonth(2026, 3);
        expect(result[0].totalVolume).toBe(0);
        expect(result[0].totalSets).toBe(0);
        expect(result[0].totalDuration).toBe(0);
    });

    it('always filters for completed workouts', async () => {
        setMockDb(true);
        mockGetAllAsync.mockResolvedValueOnce([]);
        await getWorkoutsForMonth(2026, 3);

        const [sql] = mockGetAllAsync.mock.calls[0];
        expect(sql).toContain("status = 'completed'");
    });
});

// ============================================================
// getWorkoutStreak
// ============================================================

describe('getWorkoutStreak', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns 0 when DB is unavailable', async () => {
        setMockDb(false);
        const result = await getWorkoutStreak();
        expect(result).toBe(0);
    });

    it('returns 0 when no workouts exist', async () => {
        setMockDb(true);
        mockGetAllAsync.mockResolvedValueOnce([]);
        const result = await getWorkoutStreak();
        expect(result).toBe(0);
    });

    it('returns streak count for consecutive weeks', async () => {
        setMockDb(true);
        // Generate dates for 3 consecutive weeks from today
        const now = new Date();
        const dates: Array<{ workout_date: string }> = [];

        for (let weeksBack = 0; weeksBack < 3; weeksBack++) {
            const d = new Date(now);
            d.setDate(d.getDate() - weeksBack * 7);
            const dateStr = d.toISOString().split('T')[0];
            dates.push({ workout_date: dateStr });
        }

        mockGetAllAsync.mockResolvedValueOnce(dates);
        const result = await getWorkoutStreak();

        // Should be at least 3 (could be more depending on current week)
        expect(result).toBeGreaterThanOrEqual(3);
    });

    it('returns 0 on DB error', async () => {
        setMockDb(true);
        mockGetAllAsync.mockRejectedValueOnce(new Error('DB error'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const result = await getWorkoutStreak();
        expect(result).toBe(0);
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});

// ============================================================
// getRestDaysThisWeek
// ============================================================

describe('getRestDaysThisWeek', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns 0 when DB is unavailable', async () => {
        setMockDb(false);
        const result = await getRestDaysThisWeek();
        expect(result).toBe(0);
    });

    it('returns rest day count from split schedule', async () => {
        setMockDb(true);
        mockGetFirstAsync.mockResolvedValueOnce({ rest_count: 2 });
        const result = await getRestDaysThisWeek();
        expect(result).toBe(2);
    });

    it('returns 0 when no active split', async () => {
        setMockDb(true);
        mockGetFirstAsync.mockResolvedValueOnce(null);
        const result = await getRestDaysThisWeek();
        expect(result).toBe(0);
    });

    it('returns 0 on DB error', async () => {
        setMockDb(true);
        mockGetFirstAsync.mockRejectedValueOnce(new Error('fail'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const result = await getRestDaysThisWeek();
        expect(result).toBe(0);
        consoleSpy.mockRestore();
    });
});

// ============================================================
// getWorkoutDetail
// ============================================================

describe('getWorkoutDetail', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns null when DB is unavailable', async () => {
        setMockDb(false);
        const result = await getWorkoutDetail('w1');
        expect(result).toBeNull();
    });

    it('returns null for non-existent workout', async () => {
        setMockDb(true);
        mockGetFirstAsync.mockResolvedValueOnce(null);
        const result = await getWorkoutDetail('nonexistent');
        expect(result).toBeNull();
    });

    it('returns full workout with exercises and sets', async () => {
        setMockDb(true);

        // Mock workout row
        mockGetFirstAsync.mockResolvedValueOnce({
            id: 'w1',
            name: 'Push Day',
            status: 'completed',
            started_at: '2026-03-10T10:00:00Z',
            completed_at: '2026-03-10T11:00:00Z',
            total_volume: 15000,
            total_sets: 20,
            total_duration: 3600,
            template_id: null,
            note: null,
            location: null,
            muscle_groups_worked: null,
            day_of_week: 2,
            created_at: '2026-03-10T10:00:00Z',
            updated_at: '2026-03-10T11:00:00Z',
        });

        // Mock exercise rows
        mockGetAllAsync.mockResolvedValueOnce([
            {
                id: 'we1',
                workout_id: 'w1',
                exercise_id: 'ex1',
                exercise_name: 'Bench Press',
                exercise_category: 'strength',
                exercise_muscle_groups: null,
                exercise_equipment: null,
                exercise_track_weight: 1,
                exercise_track_reps: 1,
                exercise_track_time: 0,
                order_index: 0,
                note: null,
            },
        ]);

        // Mock set rows
        mockGetAllAsync.mockResolvedValueOnce([
            {
                id: 's1',
                workout_exercise_id: 'we1',
                order_index: 0,
                weight: 225,
                reps: 5,
                duration: null,
                distance: null,
                type: 'working',
                status: 'completed',
                rpe: null,
                rir: null,
                suggested_weight: null,
                suggested_reps: null,
                note: null,
                completed_at: '2026-03-10T10:30:00Z',
                rest_duration: null,
            },
        ]);

        const result = await getWorkoutDetail('w1');

        expect(result).not.toBeNull();
        expect(result!.id).toBe('w1');
        expect(result!.name).toBe('Push Day');
        expect(result!.main.exercises).toHaveLength(1);
        expect(result!.main.exercises[0].exercise.name).toBe('Bench Press');
        expect(result!.main.exercises[0].sets).toHaveLength(1);
        expect(result!.main.exercises[0].sets[0].weight).toBe(225);
    });

    it('returns null on DB error', async () => {
        setMockDb(true);
        mockGetFirstAsync.mockRejectedValueOnce(new Error('fail'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const result = await getWorkoutDetail('w1');
        expect(result).toBeNull();
        consoleSpy.mockRestore();
    });
});

// ============================================================
// getWorkoutsForDate
// ============================================================

describe('getWorkoutsForDate', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns empty array when DB is unavailable', async () => {
        setMockDb(false);
        const result = await getWorkoutsForDate('2026-03-10');
        expect(result).toEqual([]);
    });

    it('returns empty array when no workouts on date', async () => {
        setMockDb(true);
        mockGetAllAsync.mockResolvedValueOnce([]);
        const result = await getWorkoutsForDate('2026-03-10');
        expect(result).toEqual([]);
    });

    it('returns empty array on DB error', async () => {
        setMockDb(true);
        mockGetAllAsync.mockRejectedValueOnce(new Error('fail'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const result = await getWorkoutsForDate('2026-03-10');
        expect(result).toEqual([]);
        consoleSpy.mockRestore();
    });
});
