/**
 * Tests for analyticsService
 *
 * Uses a mock database to test aggregation queries without
 * requiring an actual SQLite database.
 */

import { getAggregatedMetric, getDateRangeStart } from '../analyticsService';

// ============================================================
// Mock database
// ============================================================

const mockGetAllAsync = jest.fn();
let mockDb: { getAllAsync: jest.Mock } | null = null;

jest.mock('../database', () => ({
    getDatabase: jest.fn(async () => mockDb),
}));

// ============================================================
// Test helpers
// ============================================================

function setMockDb(available: boolean) {
    if (available) {
        mockDb = { getAllAsync: mockGetAllAsync };
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

        // Should be roughly 1 month ago
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

    // ---- DB unavailable ----

    it('returns empty array when DB is unavailable', async () => {
        setMockDb(false);
        const result = await getAggregatedMetric('volume', 'per_month', '3M');
        expect(result).toEqual([]);
    });

    // ---- Volume metric ----

    it('returns aggregated volume data per month', async () => {
        setMockDb(true);
        setMockRows([
            { bucket_label: 'Jan', bucket_date: '2026-01', value: 15000 },
            { bucket_label: 'Feb', bucket_date: '2026-02', value: 22000 },
            { bucket_label: 'Mar', bucket_date: '2026-03', value: 18500 },
        ]);

        const result = await getAggregatedMetric('volume', 'per_month', '3M');

        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({
            label: 'Jan',
            value: 15000,
            date: '2026-01',
        });
        expect(result[1].value).toBe(22000);
        expect(result[2].label).toBe('Mar');

        // Should have been called with a date parameter (not ALL)
        expect(mockGetAllAsync).toHaveBeenCalledTimes(1);
        const [sql, params] = mockGetAllAsync.mock.calls[0];
        expect(params).toHaveLength(1); // range start date
        expect(sql).toContain('total_volume');
        expect(sql).toContain("strftime('%Y-%m'");
    });

    // ---- Sets metric ----

    it('queries total_sets for sets metric', async () => {
        setMockDb(true);
        setMockRows([
            { bucket_label: 'W10', bucket_date: '2026-W10', value: 42 },
        ]);

        const result = await getAggregatedMetric('sets', 'per_week', '1M');

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe(42);

        const [sql] = mockGetAllAsync.mock.calls[0];
        expect(sql).toContain('total_sets');
    });

    // ---- Reps metric (requires JOIN) ----

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

    // ---- Duration metric ----

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

    // ---- ALL range (no date filter) ----

    it('passes no date parameter for ALL range', async () => {
        setMockDb(true);
        setMockRows([
            { bucket_label: 'Jan', bucket_date: '2026-01', value: 5000 },
        ]);

        await getAggregatedMetric('volume', 'per_month', 'ALL');

        const [sql, params] = mockGetAllAsync.mock.calls[0];
        expect(params).toHaveLength(0); // No date filter for ALL
        expect(sql).not.toContain('>=');
    });

    // ---- Return shape ----

    it('returns correct shape for empty result set', async () => {
        setMockDb(true);
        setMockRows([]);

        const result = await getAggregatedMetric('volume', 'per_week', '3M');

        expect(result).toEqual([]);
        expect(Array.isArray(result)).toBe(true);
    });

    it('handles null bucket_label gracefully', async () => {
        setMockDb(true);
        // Simulate a row where SQLite returns null for the label
        mockGetAllAsync.mockResolvedValueOnce([
            { bucket_label: null, bucket_date: '2026-01', value: 100 },
        ]);

        const result = await getAggregatedMetric('volume', 'per_month', '1M');

        expect(result).toHaveLength(1);
        expect(result[0].label).toBe('');
        expect(result[0].value).toBe(100);
    });

    // ---- Error handling ----

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

    // ---- SQL correctness ----

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
