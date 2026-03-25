/**
 * Batch Query Utility
 *
 * Chunks large arrays of IDs to avoid exceeding SQLite's
 * SQLITE_MAX_VARIABLE_NUMBER limit (default 999).
 * See conventions guardrail #8.
 */

import type { SQLiteDatabase } from 'expo-sqlite';

const BATCH_SIZE = 500;

/**
 * Execute a query with IN(?) placeholders in chunks of 500.
 * Merges and returns all results.
 *
 * @param db - Database instance
 * @param ids - Array of IDs to query (will be chunked)
 * @param buildQuery - Function that receives a placeholder string like "?,?,?" and returns [sql, params].
 *                     Extra params (beyond the IDs) should be included in the returned params array.
 */
export async function batchGetAll<T>(
    db: SQLiteDatabase,
    ids: string[],
    buildQuery: (placeholders: string, batchIds: string[]) => [sql: string, params: (string | number | null)[]],
): Promise<T[]> {
    if (ids.length === 0) return [];

    const allResults: T[] = [];
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const batch = ids.slice(i, i + BATCH_SIZE);
        const placeholders = batch.map(() => '?').join(',');
        const [sql, params] = buildQuery(placeholders, batch);
        const rows = await db.getAllAsync<T>(sql, params);
        allResults.push(...rows);
    }
    return allResults;
}

