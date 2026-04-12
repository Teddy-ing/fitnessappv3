/**
 * Database Service
 * 
 * Handles SQLite database initialization and connection management.
 * Schema creation and versioning is delegated to the migration system
 * in ./migrations.ts — see that file for all schema definitions.
 */

import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';

// Database state
let db: SQLite.SQLiteDatabase | null = null;
let dbInitPromise: Promise<SQLite.SQLiteDatabase | null> | null = null;
let dbInitFailed = false;

/**
 * Check if database is available
 */
export function isDatabaseAvailable(): boolean {
    return !dbInitFailed && db !== null;
}

/**
 * Get or create the database instance
 * Uses a singleton pattern with deferred initialization
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase | null> {
    // If init already failed, don't retry
    if (dbInitFailed) return null;

    // Return existing database if available
    if (db) return db;

    // If initialization is in progress, wait for it
    if (dbInitPromise) {
        return dbInitPromise;
    }

    // Start initialization
    dbInitPromise = initDatabase();
    const result = await dbInitPromise;
    dbInitPromise = null;
    return result;
}

/**
 * Initialize the database
 */
async function initDatabase(): Promise<SQLite.SQLiteDatabase | null> {
    try {
        console.log('[DB] Opening database...');
        const database = await SQLite.openDatabaseAsync('workout_app.db');

        // Connection-level pragmas (must be set on every open, not migration-specific)
        await database.execAsync(`PRAGMA journal_mode = WAL;`);
        await database.execAsync(`PRAGMA foreign_keys = ON;`);

        console.log('[DB] Running migrations...');
        await runMigrations(database);

        console.log('[DB] Database ready!');
        db = database;
        return db;
    } catch (error) {
        console.error('[DB] Database initialization failed:', error);
        dbInitFailed = true;
        return null;
    }
}

/**
 * Close the database connection
 */
export async function closeDatabase(): Promise<void> {
    if (db) {
        try {
            await db.closeAsync();
        } catch (error) {
            console.error('[DB] Error closing database:', error);
        }
        db = null;
    }
}

/**
 * Clear all user data (for development/testing/import).
 *
 * Deletes from ALL user-data tables in FK-safe order (children first).
 * Does NOT delete from `measurement_types` (migration-seeded reference data).
 * Also clears the persisted in-progress workout file (TD-021).
 *
 * TD-022: Updated to cover all tables introduced through v7 migrations.
 */
export async function clearAllData(): Promise<void> {
    const database = await getDatabase();
    if (!database) return;

    try {
        // Children → parents order to respect FK constraints
        // v11 — Exercise notes
        await database.execAsync(`DELETE FROM exercise_notes;`);
        // v7 — Goals
        await database.execAsync(`DELETE FROM goals;`);
        // v5 — Measurements & Photos
        await database.execAsync(`DELETE FROM progress_photos;`);
        await database.execAsync(`DELETE FROM measurements;`);
        // Note: measurement_types is seed data from migration v5 — not cleared.
        // v4 — Personal Records
        await database.execAsync(`DELETE FROM personal_records;`);
        // v1 — Workout data (sets → exercises → workouts)
        await database.execAsync(`DELETE FROM workout_sets;`);
        await database.execAsync(`DELETE FROM workout_exercises;`);
        await database.execAsync(`DELETE FROM workouts;`);
        // v1 — Templates
        await database.execAsync(`DELETE FROM template_exercises;`);
        await database.execAsync(`DELETE FROM templates;`);
        // v1 — Splits
        await database.execAsync(`DELETE FROM splits_templates;`);
        await database.execAsync(`DELETE FROM splits_schedule;`);
        await database.execAsync(`DELETE FROM splits;`);
        // v2 — Exercises (custom)
        await database.execAsync(`DELETE FROM exercises;`);
        // v2 — Legacy preferences (superseded by user_settings in v3)
        await database.execAsync(`DELETE FROM user_preferences;`);
        // v3 — Settings
        await database.execAsync(`DELETE FROM user_settings;`);
        // Re-seed the single settings row with defaults
        await database.execAsync(`INSERT OR IGNORE INTO user_settings (id) VALUES (1);`);

        // Clear persisted in-progress workout file (TD-021)
        try {
            const { clearPersistedWorkout } = await import('../stores/workoutPersistence');
            clearPersistedWorkout();
        } catch {
            // Persistence module may not be available in all contexts
        }
    } catch (error) {
        console.error('[DB] Error clearing data:', error);
    }
}

export default {
    getDatabase,
    isDatabaseAvailable,
    closeDatabase,
    clearAllData,
};
