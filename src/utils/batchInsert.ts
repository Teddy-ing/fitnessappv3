/**
 * Batch INSERT Utility for SQLite
 *
 * Combines multiple rows into single multi-value INSERT statements
 * to reduce DB round-trips. Automatically respects SQLite's 999
 * parameter limit (SQLITE_MAX_VARIABLE_NUMBER) by calculating
 * the maximum rows per batch based on column count.
 *
 * PP-079: Replaces the row-level INSERT pattern that caused
 * O(N) round-trips in restore/import paths.
 *
 * Example: a 15-column table batches at 66 rows per statement,
 * reducing 10,000 round-trips to ~152.
 */

/** Minimum interface needed from expo-sqlite database */
interface BatchInsertDB {
    runAsync(sql: string, params: (string | number | null)[]): Promise<unknown>;
}

const SQLITE_MAX_PARAMS = 999;

/**
 * Insert multiple rows into a table using batched multi-value INSERT.
 *
 * Automatically chunks rows to stay under SQLite's 999 parameter limit.
 * Each batch produces a single `INSERT OR REPLACE INTO table (cols) VALUES (?,?), (?,?), ...`
 * statement.
 *
 * @param db - Database instance with runAsync
 * @param table - Table name
 * @param columns - Column names (must match row value ordering)
 * @param rows - Array of value arrays (each must have same length as columns)
 */
export async function batchInsert(
    db: BatchInsertDB,
    table: string,
    columns: string[],
    rows: (string | number | null)[][],
): Promise<void> {
    if (rows.length === 0) return;

    const colCount = columns.length;
    const maxRowsPerBatch = Math.max(1, Math.floor(SQLITE_MAX_PARAMS / colCount));
    const colList = columns.join(', ');
    const singleRowPlaceholder = `(${columns.map(() => '?').join(', ')})`;

    for (let i = 0; i < rows.length; i += maxRowsPerBatch) {
        const batch = rows.slice(i, i + maxRowsPerBatch);
        const placeholders = batch.map(() => singleRowPlaceholder).join(', ');
        const flatValues = batch.flat();

        await db.runAsync(
            `INSERT OR REPLACE INTO ${table} (${colList}) VALUES ${placeholders}`,
            flatValues,
        );
    }
}

/**
 * Normalize a JSON payload row's values for SQLite insertion.
 * Maps column names to values with type coercion:
 * - null/undefined → null
 * - boolean → 0/1 (SQLite has no boolean type)
 * - everything else → pass-through
 *
 * @param row - Raw JSON row from export payload
 * @param columns - Column names to extract in order
 */
export function normalizeRowValues(
    row: Record<string, unknown>,
    columns: string[],
): (string | number | null)[] {
    return columns.map((col) => {
        const val = row[col];
        if (val === null || val === undefined) return null;
        if (typeof val === 'boolean') return val ? 1 : 0;
        return val as string | number;
    });
}
