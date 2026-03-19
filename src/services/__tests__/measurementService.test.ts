/**
 * Tests for measurementService
 *
 * Uses a mock database to test CRUD and query functions
 * without requiring an actual SQLite database.
 */

import {
    getMeasurementTypes,
    getVisibleMeasurementTypes,
    logMeasurement,
    updateMeasurement,
    deleteMeasurement,
    getMeasurementHistory,
    getLatestMeasurements,
    getSparklineData,
    getMeasurementsForDate,
} from '../measurementService';

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

// ============================================================
// getMeasurementTypes
// ============================================================

describe('getMeasurementTypes', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns empty array when DB is unavailable', async () => {
        setMockDb(false);
        const result = await getMeasurementTypes();
        expect(result).toEqual([]);
    });

    it('returns all measurement types sorted by order_index', async () => {
        setMockDb(true);
        mockGetAllAsync.mockResolvedValueOnce([
            {
                id: 'bodyweight',
                name: 'Bodyweight',
                category: 'core',
                unit_imperial: 'lbs',
                unit_metric: 'kg',
                default_visible: 1,
                order_index: 1,
            },
            {
                id: 'waist',
                name: 'Waist',
                category: 'torso',
                unit_imperial: 'in',
                unit_metric: 'cm',
                default_visible: 1,
                order_index: 3,
            },
        ]);

        const result = await getMeasurementTypes();

        expect(result).toHaveLength(2);
        expect(result[0].id).toBe('bodyweight');
        expect(result[0].name).toBe('Bodyweight');
        expect(result[0].category).toBe('core');
        expect(result[0].unitImperial).toBe('lbs');
        expect(result[0].unitMetric).toBe('kg');
        expect(result[0].defaultVisible).toBe(true);
        expect(result[0].orderIndex).toBe(1);
        expect(result[1].id).toBe('waist');
        expect(result[1].defaultVisible).toBe(true);

        const [sql] = mockGetAllAsync.mock.calls[0];
        expect(sql).toContain('ORDER BY order_index');
    });

    it('returns empty array on DB error', async () => {
        setMockDb(true);
        mockGetAllAsync.mockRejectedValueOnce(new Error('DB error'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const result = await getMeasurementTypes();
        expect(result).toEqual([]);
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('[MeasurementService]'),
            expect.any(Error),
        );
        consoleSpy.mockRestore();
    });
});

// ============================================================
// getVisibleMeasurementTypes
// ============================================================

describe('getVisibleMeasurementTypes', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns empty array for empty visibility list', async () => {
        const result = await getVisibleMeasurementTypes([]);
        expect(result).toEqual([]);
    });

    it('returns empty array when DB is unavailable', async () => {
        setMockDb(false);
        const result = await getVisibleMeasurementTypes(['bodyweight']);
        expect(result).toEqual([]);
    });

    it('queries with IN clause for visible IDs', async () => {
        setMockDb(true);
        mockGetAllAsync.mockResolvedValueOnce([
            {
                id: 'bodyweight',
                name: 'Bodyweight',
                category: 'core',
                unit_imperial: 'lbs',
                unit_metric: 'kg',
                default_visible: 1,
                order_index: 1,
            },
        ]);

        const result = await getVisibleMeasurementTypes(['bodyweight', 'waist']);

        expect(result).toHaveLength(1);
        const [sql, params] = mockGetAllAsync.mock.calls[0];
        expect(sql).toContain('IN');
        expect(params).toEqual(['bodyweight', 'waist']);
    });
});

// ============================================================
// logMeasurement
// ============================================================

describe('logMeasurement', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns null when DB is unavailable', async () => {
        setMockDb(false);
        const result = await logMeasurement('bodyweight', 180, '2026-03-18');
        expect(result).toBeNull();
    });

    it('inserts a measurement and returns the created record', async () => {
        setMockDb(true);
        mockRunAsync.mockResolvedValueOnce(undefined);

        const result = await logMeasurement('bodyweight', 183.5, '2026-03-18', 'Morning weigh-in');

        expect(result).not.toBeNull();
        expect(result!.measurementTypeId).toBe('bodyweight');
        expect(result!.value).toBe(183.5);
        expect(result!.recordedAt).toBe('2026-03-18');
        expect(result!.note).toBe('Morning weigh-in');
        expect(result!.id).toBeTruthy();
        expect(result!.createdAt).toBeTruthy();

        expect(mockRunAsync).toHaveBeenCalledTimes(1);
        const [sql] = mockRunAsync.mock.calls[0];
        expect(sql).toContain('INSERT INTO measurements');
    });

    it('sets note to null when not provided', async () => {
        setMockDb(true);
        mockRunAsync.mockResolvedValueOnce(undefined);

        const result = await logMeasurement('waist', 32, '2026-03-18');

        expect(result).not.toBeNull();
        expect(result!.note).toBeNull();
    });

    it('returns null on DB error', async () => {
        setMockDb(true);
        mockRunAsync.mockRejectedValueOnce(new Error('INSERT failed'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const result = await logMeasurement('bodyweight', 180, '2026-03-18');
        expect(result).toBeNull();
        consoleSpy.mockRestore();
    });
});

// ============================================================
// updateMeasurement
// ============================================================

describe('updateMeasurement', () => {
    beforeEach(() => jest.clearAllMocks());

    it('does nothing when DB is unavailable', async () => {
        setMockDb(false);
        await updateMeasurement('id-1', 185);
        expect(mockRunAsync).not.toHaveBeenCalled();
    });

    it('updates the value of an existing measurement', async () => {
        setMockDb(true);
        mockRunAsync.mockResolvedValueOnce(undefined);

        await updateMeasurement('id-1', 185);

        expect(mockRunAsync).toHaveBeenCalledTimes(1);
        const [sql, params] = mockRunAsync.mock.calls[0];
        expect(sql).toContain('UPDATE measurements');
        expect(params).toEqual([185, 'id-1']);
    });
});

// ============================================================
// deleteMeasurement
// ============================================================

describe('deleteMeasurement', () => {
    beforeEach(() => jest.clearAllMocks());

    it('does nothing when DB is unavailable', async () => {
        setMockDb(false);
        await deleteMeasurement('id-1');
        expect(mockRunAsync).not.toHaveBeenCalled();
    });

    it('deletes the measurement record', async () => {
        setMockDb(true);
        mockRunAsync.mockResolvedValueOnce(undefined);

        await deleteMeasurement('id-1');

        expect(mockRunAsync).toHaveBeenCalledTimes(1);
        const [sql, params] = mockRunAsync.mock.calls[0];
        expect(sql).toContain('DELETE FROM measurements');
        expect(params).toEqual(['id-1']);
    });
});

// ============================================================
// getMeasurementHistory
// ============================================================

describe('getMeasurementHistory', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns empty array when DB is unavailable', async () => {
        setMockDb(false);
        const result = await getMeasurementHistory('bodyweight');
        expect(result).toEqual([]);
    });

    it('returns time series ordered by date ascending', async () => {
        setMockDb(true);
        mockGetAllAsync.mockResolvedValueOnce([
            {
                id: 'm1',
                measurement_type_id: 'bodyweight',
                value: 180,
                recorded_at: '2026-03-01',
                note: null,
                created_at: '2026-03-01T10:00:00Z',
            },
            {
                id: 'm2',
                measurement_type_id: 'bodyweight',
                value: 182,
                recorded_at: '2026-03-10',
                note: null,
                created_at: '2026-03-10T10:00:00Z',
            },
        ]);

        const result = await getMeasurementHistory('bodyweight');

        expect(result).toHaveLength(2);
        expect(result[0].value).toBe(180);
        expect(result[1].value).toBe(182);
        expect(result[0].recordedAt).toBe('2026-03-01');

        const [sql] = mockGetAllAsync.mock.calls[0];
        expect(sql).toContain('ORDER BY recorded_at ASC');
    });

    it('applies date range filters when provided', async () => {
        setMockDb(true);
        mockGetAllAsync.mockResolvedValueOnce([]);

        await getMeasurementHistory('bodyweight', '2026-01-01', '2026-03-31');

        const [sql, params] = mockGetAllAsync.mock.calls[0];
        expect(sql).toContain('recorded_at >= ?');
        expect(sql).toContain('recorded_at <= ?');
        expect(params).toEqual(['bodyweight', '2026-01-01', '2026-03-31']);
    });

    it('works without date range', async () => {
        setMockDb(true);
        mockGetAllAsync.mockResolvedValueOnce([]);

        await getMeasurementHistory('bodyweight');

        const [sql, params] = mockGetAllAsync.mock.calls[0];
        expect(sql).not.toContain('recorded_at >= ?');
        expect(params).toEqual(['bodyweight']);
    });
});

// ============================================================
// getLatestMeasurements
// ============================================================

describe('getLatestMeasurements', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns empty map for empty type list', async () => {
        const result = await getLatestMeasurements([]);
        expect(result.size).toBe(0);
    });

    it('returns empty map when DB is unavailable', async () => {
        setMockDb(false);
        const result = await getLatestMeasurements(['bodyweight']);
        expect(result.size).toBe(0);
    });

    it('returns latest value per measurement type', async () => {
        setMockDb(true);
        mockGetAllAsync.mockResolvedValueOnce([
            {
                measurement_type_id: 'bodyweight',
                value: 183.5,
                recorded_at: '2026-03-18',
            },
            {
                measurement_type_id: 'waist',
                value: 32.5,
                recorded_at: '2026-03-15',
            },
        ]);

        const result = await getLatestMeasurements(['bodyweight', 'waist']);

        expect(result.size).toBe(2);
        expect(result.get('bodyweight')).toEqual({
            value: 183.5,
            recordedAt: '2026-03-18',
        });
        expect(result.get('waist')).toEqual({
            value: 32.5,
            recordedAt: '2026-03-15',
        });
    });
});

// ============================================================
// getSparklineData
// ============================================================

describe('getSparklineData', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns empty array when DB is unavailable', async () => {
        setMockDb(false);
        const result = await getSparklineData('bodyweight');
        expect(result).toEqual([]);
    });

    it('returns date/value pairs for sparkline rendering', async () => {
        setMockDb(true);
        mockGetAllAsync.mockResolvedValueOnce([
            { recorded_at: '2026-01-01', value: 180 },
            { recorded_at: '2026-02-01', value: 182 },
            { recorded_at: '2026-03-01', value: 183 },
        ]);

        const result = await getSparklineData('bodyweight');

        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({ date: '2026-01-01', value: 180 });

        const [sql, params] = mockGetAllAsync.mock.calls[0];
        expect(sql).toContain('ORDER BY recorded_at ASC');
        expect(params[0]).toBe('bodyweight');
    });

    it('respects custom days parameter', async () => {
        setMockDb(true);
        mockGetAllAsync.mockResolvedValueOnce([]);

        await getSparklineData('bodyweight', 30);

        const [, params] = mockGetAllAsync.mock.calls[0];
        // The cutoff date should be approximately 30 days ago
        const cutoff = new Date(params[1]);
        const now = new Date();
        const diffDays = (now.getTime() - cutoff.getTime()) / (1000 * 60 * 60 * 24);
        expect(diffDays).toBeGreaterThan(28);
        expect(diffDays).toBeLessThan(32);
    });
});

// ============================================================
// getMeasurementsForDate
// ============================================================

describe('getMeasurementsForDate', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns empty array when DB is unavailable', async () => {
        setMockDb(false);
        const result = await getMeasurementsForDate('2026-03-18');
        expect(result).toEqual([]);
    });

    it('returns all measurements logged on a specific date', async () => {
        setMockDb(true);
        mockGetAllAsync.mockResolvedValueOnce([
            {
                id: 'm1',
                measurement_type_id: 'bodyweight',
                value: 183.5,
                recorded_at: '2026-03-18',
                note: null,
                created_at: '2026-03-18T08:00:00Z',
            },
            {
                id: 'm2',
                measurement_type_id: 'waist',
                value: 32,
                recorded_at: '2026-03-18',
                note: null,
                created_at: '2026-03-18T08:01:00Z',
            },
        ]);

        const result = await getMeasurementsForDate('2026-03-18');

        expect(result).toHaveLength(2);
        expect(result[0].measurementTypeId).toBe('bodyweight');
        expect(result[1].measurementTypeId).toBe('waist');

        const [sql, params] = mockGetAllAsync.mock.calls[0];
        expect(sql).toContain('recorded_at = ?');
        expect(params).toEqual(['2026-03-18']);
    });
});
