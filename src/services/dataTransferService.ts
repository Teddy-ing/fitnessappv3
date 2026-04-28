/**
 * Data Transfer Service
 *
 * JSON export/import for full database snapshots ("save slots").
 * Export: Queries all tables → writes JSON → opens share sheet.
 * Import: Reads JSON → validates → clears DB → inserts all data.
 *
 * This is the foundation for Phase 6 (full import/export).
 * Current scope: own-app JSON only. Competitor CSV import comes later.
 */

import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getDatabase } from './database';
import { formatISODate } from '../utils/formatters';
import { withWriteLock } from '../utils/dbMutex';
import { batchInsert, normalizeRowValues } from '../utils/batchInsert';

// ============================================================
// Types
// ============================================================

/** The shape of the exported JSON file */
interface ExportPayload {
    /** Metadata about the export */
    meta: {
        appVersion: string;
        schemaVersion: number;
        exportedAt: string;
        platform: string;
    };
    /** Raw table data — each key is a table name, value is an array of rows */
    tables: Record<string, Record<string, unknown>[]>;
}

/**
 * Tables to export/import.
 * Order matters for import — parent tables before children (FK dependencies).
 * `measurement_types` is excluded: it's seed data from migrations.
 */
export const EXPORT_TABLES = [
    'user_settings',
    'exercises',
    'templates',
    'template_exercises',
    'splits',
    'splits_templates',
    'splits_schedule',
    'workouts',
    'workout_exercises',
    'workout_sets',
    'personal_records',
    'measurements',
    'progress_photos',
    'goals',
    'exercise_notes',          // v11 — Exercise Details
    // NOTE: cloud_backup_config deliberately excluded — it's device-specific
] as const;

// ============================================================
// Export
// ============================================================

/**
 * Generate the export payload JSON object from the database.
 * Reused by both local export (share sheet) and cloud backup (Drive upload).
 *
 * @returns The export payload object
 */
export async function generateExportPayload(): Promise<ExportPayload> {
    const db = await getDatabase();
    if (!db) throw new Error('Database not available');

    // Read current schema version
    const versionRow = await db.getFirstAsync<{ user_version: number }>(
        'PRAGMA user_version;',
    );
    const schemaVersion = versionRow?.user_version ?? 0;

    // Build the payload
    const tables: Record<string, Record<string, unknown>[]> = {};

    for (const table of EXPORT_TABLES) {
        const rows = await db.getAllAsync<Record<string, unknown>>(
            `SELECT * FROM ${table}`,
        );
        tables[table] = rows;
    }

    return {
        meta: {
            appVersion: '0.1.0',
            schemaVersion,
            exportedAt: new Date().toISOString(),
            platform: 'workout-app',
        },
        tables,
    };
}

/**
 * Export all app data as a JSON file and open the share sheet.
 * The file is written to the app's cache directory and shared
 * via the system share sheet (save to files, send via email, etc).
 *
 * @returns The file URI of the exported file
 * @throws If the database is unavailable or sharing fails
 */
export async function exportAllData(): Promise<string> {
    const payload = await generateExportPayload();

    // Write to cache directory using new expo-file-system API
    const dateStamp = formatISODate(new Date());
    const fileName = `workout-backup-${dateStamp}.json`;
    const file = new File(Paths.cache, fileName);

    file.write(JSON.stringify(payload, null, 2));

    // Open share sheet
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
        throw new Error('Sharing is not available on this device');
    }

    await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: 'Export Workout Data',
        UTI: 'public.json',
    });

    return file.uri;
}

// ============================================================
// Import
// ============================================================

/**
 * Open a document picker, validate the selected JSON file,
 * and restore all data from it. This is a DESTRUCTIVE operation —
 * all existing data is cleared before importing.
 *
 * @returns true if import completed successfully, false if cancelled
 * @throws If the file is invalid or the import fails
 */
export async function importAllData(): Promise<boolean> {
    // Pick a file (outside the lock — user interaction)
    const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) {
        return false; // User cancelled
    }

    const pickedUri = result.assets[0].uri;

    // Read and parse using new File API
    const pickedFile = new File(pickedUri);
    const content = await pickedFile.text();

    let payload: ExportPayload;
    try {
        payload = JSON.parse(content);
    } catch {
        throw new Error('Invalid file: could not parse JSON');
    }

    // Validate structure
    if (!payload.meta || !payload.tables) {
        throw new Error('Invalid file: missing meta or tables');
    }

    if (payload.meta.platform !== 'workout-app') {
        throw new Error('Invalid file: this backup was not created by workout-app');
    }

    const db = await getDatabase();
    if (!db) throw new Error('Database not available');

    // Check schema version compatibility
    const versionRow = await db.getFirstAsync<{ user_version: number }>(
        'PRAGMA user_version;',
    );
    const currentVersion = versionRow?.user_version ?? 0;

    if (payload.meta.schemaVersion > currentVersion) {
        throw new Error(
            `This backup requires app version ${payload.meta.appVersion} or newer ` +
            `(schema v${payload.meta.schemaVersion}, you have v${currentVersion}). ` +
            `Please update the app first.`,
        );
    }

    // ---- Destructive restore (under write lock) ----
    return withWriteLock(async () => {
    await db.withTransactionAsync(async () => {
        // Clear tables in reverse order (children before parents) to respect FK constraints
        const reversedTables = [...EXPORT_TABLES].reverse();
        for (const table of reversedTables) {
            await db.execAsync(`DELETE FROM ${table};`);
        }

        // Insert data using batched multi-value INSERT (PP-079)
        for (const table of EXPORT_TABLES) {
            const rows = payload.tables[table];
            if (!rows || rows.length === 0) continue;

            const columns = Object.keys(rows[0]);
            const normalizedRows = rows.map((row) =>
                normalizeRowValues(row, columns),
            );
            await batchInsert(db, table, columns, normalizedRows);
        }
    });

    console.log(
        `[DataTransfer] Import complete from ${payload.meta.exportedAt} ` +
        `(schema v${payload.meta.schemaVersion})`,
    );

    return true;
    }); // withWriteLock
}
