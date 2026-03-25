/**
 * Measurement Service
 *
 * CRUD and query functions for body measurements.
 * Reads from `measurement_types` (catalog) and `measurements` (user data).
 *
 * Conventions:
 * - Uses typed row interfaces (never `any`)
 * - Returns empty arrays / null when DB is unavailable
 * - Uses getDatabase() pattern from existing services
 */

import { getDatabase } from './database';
import { refreshAllGoalProgress } from './goalProgressService';
import { MeasurementType, Measurement } from '../models/measurement';
import { Goal } from '../models/goal';
import { generateId } from '../utils/uuid';
import { toLocalISOString } from '../utils/localDate';

// ============================================================
// Row types (typed DB results)
// ============================================================

interface MeasurementTypeRow {
    id: string;
    name: string;
    category: string;
    unit_imperial: string;
    unit_metric: string;
    default_visible: number;
    order_index: number;
}

interface MeasurementRow {
    id: string;
    measurement_type_id: string;
    value: number;
    recorded_at: string;
    note: string | null;
    created_at: string;
}

interface LatestMeasurementRow {
    measurement_type_id: string;
    value: number;
    recorded_at: string;
}

// ============================================================
// Row mappers
// ============================================================

function mapMeasurementTypeRow(row: MeasurementTypeRow): MeasurementType {
    return {
        id: row.id,
        name: row.name,
        category: row.category as MeasurementType['category'],
        unitImperial: row.unit_imperial,
        unitMetric: row.unit_metric,
        defaultVisible: row.default_visible === 1,
        orderIndex: row.order_index,
    };
}

function mapMeasurementRow(row: MeasurementRow): Measurement {
    return {
        id: row.id,
        measurementTypeId: row.measurement_type_id,
        value: row.value,
        recordedAt: row.recorded_at,
        note: row.note,
        createdAt: row.created_at,
    };
}



// ============================================================
// Measurement Types (catalog)
// ============================================================

/**
 * Get all measurement type definitions, ordered by order_index.
 */
export async function getMeasurementTypes(): Promise<MeasurementType[]> {
    const db = await getDatabase();
    if (!db) return [];

    try {
        const rows = await db.getAllAsync<MeasurementTypeRow>(
            `SELECT * FROM measurement_types ORDER BY order_index ASC`,
        );
        return rows.map(mapMeasurementTypeRow);
    } catch (error) {
        console.error('[MeasurementService] Failed to get measurement types:', error);
        return [];
    }
}

/**
 * Get only measurement types that are currently visible to the user.
 *
 * @param visibleIds - Array of type IDs from user_settings.visible_measurements
 */
export async function getVisibleMeasurementTypes(
    visibleIds: string[],
): Promise<MeasurementType[]> {
    if (visibleIds.length === 0) return [];

    const db = await getDatabase();
    if (!db) return [];

    try {
        const placeholders = visibleIds.map(() => '?').join(', ');
        const rows = await db.getAllAsync<MeasurementTypeRow>(
            `SELECT * FROM measurement_types
             WHERE id IN (${placeholders})
             ORDER BY order_index ASC`,
            visibleIds,
        );
        return rows.map(mapMeasurementTypeRow);
    } catch (error) {
        console.error('[MeasurementService] Failed to get visible measurement types:', error);
        return [];
    }
}

// ============================================================
// Measurements (CRUD)
// ============================================================

/**
 * Log a new measurement value.
 *
 * @param typeId - Measurement type ID (e.g., 'bodyweight')
 * @param value - Numeric value
 * @param date - ISO date string (YYYY-MM-DD)
 * @param note - Optional note
 * @returns The created measurement and any completed goals, or null on failure
 */
export async function logMeasurement(
    typeId: string,
    value: number,
    date: string,
    note?: string,
): Promise<{ measurement: Measurement; completedGoals: Goal[] } | null> {
    const db = await getDatabase();
    if (!db) return null;

    try {
        const id = generateId();
        const now = toLocalISOString(new Date());

        await db.runAsync(
            `INSERT INTO measurements (id, measurement_type_id, value, recorded_at, note, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id, typeId, value, date, note ?? null, now],
        );

        const measurement: Measurement = {
            id,
            measurementTypeId: typeId,
            value,
            recordedAt: date,
            note: note ?? null,
            createdAt: now,
        };

        // Refresh goal progress after logging
        let completedGoals: Goal[] = [];
        try {
            completedGoals = await refreshAllGoalProgress();
        } catch (err) {
            console.warn('[MeasurementService] Goal refresh failed:', err);
        }

        return { measurement, completedGoals };
    } catch (error) {
        console.error('[MeasurementService] Failed to log measurement:', error);
        return null;
    }
}

/**
 * Update the value of an existing measurement entry.
 */
export async function updateMeasurement(
    id: string,
    value: number,
): Promise<void> {
    const db = await getDatabase();
    if (!db) return;

    try {
        await db.runAsync(
            `UPDATE measurements SET value = ? WHERE id = ?`,
            [value, id],
        );
    } catch (error) {
        console.error('[MeasurementService] Failed to update measurement:', error);
    }
}

/**
 * Delete a measurement entry.
 */
export async function deleteMeasurement(id: string): Promise<void> {
    const db = await getDatabase();
    if (!db) return;

    try {
        await db.runAsync(`DELETE FROM measurements WHERE id = ?`, [id]);
    } catch (error) {
        console.error('[MeasurementService] Failed to delete measurement:', error);
    }
}

// ============================================================
// Measurements (queries)
// ============================================================

/**
 * Get measurement history for a given type, optionally filtered by date range.
 * Returns time-series data ordered ascending by date (for chart rendering).
 */
export async function getMeasurementHistory(
    typeId: string,
    startDate?: string,
    endDate?: string,
): Promise<Measurement[]> {
    const db = await getDatabase();
    if (!db) return [];

    try {
        let sql = `SELECT * FROM measurements WHERE measurement_type_id = ?`;
        const params: string[] = [typeId];

        if (startDate) {
            sql += ` AND recorded_at >= ?`;
            params.push(startDate);
        }
        if (endDate) {
            sql += ` AND recorded_at <= ?`;
            params.push(endDate);
        }

        sql += ` ORDER BY recorded_at ASC`;

        const rows = await db.getAllAsync<MeasurementRow>(sql, params);
        return rows.map(mapMeasurementRow);
    } catch (error) {
        console.error('[MeasurementService] Failed to get measurement history:', error);
        return [];
    }
}

/**
 * Get the most recent value for each of the given measurement types.
 * Returns a map of typeId → { value, recordedAt }.
 */
export async function getLatestMeasurements(
    typeIds: string[],
): Promise<Map<string, { value: number; recordedAt: string }>> {
    const result = new Map<string, { value: number; recordedAt: string }>();
    if (typeIds.length === 0) return result;

    const db = await getDatabase();
    if (!db) return result;

    try {
        const placeholders = typeIds.map(() => '?').join(', ');
        const rows = await db.getAllAsync<LatestMeasurementRow>(
            `SELECT m.measurement_type_id, m.value, m.recorded_at
             FROM measurements m
             INNER JOIN (
                 SELECT measurement_type_id,
                        MAX(recorded_at) AS max_date,
                        MAX(created_at) AS max_created
                 FROM measurements
                 WHERE measurement_type_id IN (${placeholders})
                 GROUP BY measurement_type_id
             ) latest ON m.measurement_type_id = latest.measurement_type_id
                     AND m.recorded_at = latest.max_date
                      AND m.created_at = latest.max_created
             WHERE m.measurement_type_id IN (${placeholders})`,
            [...typeIds, ...typeIds],
        );

        for (const row of rows) {
            result.set(row.measurement_type_id, {
                value: row.value,
                recordedAt: row.recorded_at,
            });
        }

        return result;
    } catch (error) {
        console.error('[MeasurementService] Failed to get latest measurements:', error);
        return result;
    }
}

/**
 * Get simplified data points for sparkline rendering.
 * Returns up to `days` days of data (default 90).
 */
export async function getSparklineData(
    typeId: string,
    days: number = 90,
): Promise<{ date: string; value: number }[]> {
    const db = await getDatabase();
    if (!db) return [];

    try {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffStr = cutoff.toISOString().split('T')[0];

        const rows = await db.getAllAsync<{ recorded_at: string; value: number }>(
            `SELECT recorded_at, value
             FROM measurements
             WHERE measurement_type_id = ? AND recorded_at >= ?
             ORDER BY recorded_at ASC`,
            [typeId, cutoffStr],
        );

        return rows.map((r) => ({
            date: r.recorded_at,
            value: r.value,
        }));
    } catch (error) {
        console.error('[MeasurementService] Failed to get sparkline data:', error);
        return [];
    }
}

/**
 * Batch-fetch sparkline data for multiple measurement types in a single query.
 * Returns a Map of typeId → { date, value }[] arrays.
 *
 * Replaces N separate getSparklineData() calls with one round-trip.
 */
export async function getSparklineDataBatch(
    typeIds: string[],
    days: number = 90,
): Promise<Map<string, { date: string; value: number }[]>> {
    const result = new Map<string, { date: string; value: number }[]>();
    if (typeIds.length === 0) return result;

    const db = await getDatabase();
    if (!db) return result;

    try {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffStr = cutoff.toISOString().split('T')[0];

        const placeholders = typeIds.map(() => '?').join(', ');
        const rows = await db.getAllAsync<{ measurement_type_id: string; recorded_at: string; value: number }>(
            `SELECT measurement_type_id, recorded_at, value
             FROM measurements
             WHERE measurement_type_id IN (${placeholders}) AND recorded_at >= ?
             ORDER BY recorded_at ASC`,
            [...typeIds, cutoffStr],
        );

        // Initialise empty arrays for all requested types
        for (const id of typeIds) {
            result.set(id, []);
        }

        // Partition rows into their type buckets
        for (const row of rows) {
            const arr = result.get(row.measurement_type_id);
            if (arr) {
                arr.push({ date: row.recorded_at, value: row.value });
            }
        }

        return result;
    } catch (error) {
        console.error('[MeasurementService] Failed to get sparkline data batch:', error);
        return result;
    }
}

/**
 * Get all measurements for a specific date.
 * Useful for the Track tab to show what's already been logged today.
 */
export async function getMeasurementsForDate(
    date: string,
): Promise<Measurement[]> {
    const db = await getDatabase();
    if (!db) return [];

    try {
        const rows = await db.getAllAsync<MeasurementRow>(
            `SELECT * FROM measurements
             WHERE recorded_at = ?
             ORDER BY created_at ASC`,
            [date],
        );
        return rows.map(mapMeasurementRow);
    } catch (error) {
        console.error('[MeasurementService] Failed to get measurements for date:', error);
        return [];
    }
}
