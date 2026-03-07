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
 * Clear all data (for development/testing)
 */
export async function clearAllData(): Promise<void> {
    const database = await getDatabase();
    if (!database) return;

    try {
        await database.execAsync(`DELETE FROM workout_sets;`);
        await database.execAsync(`DELETE FROM workout_exercises;`);
        await database.execAsync(`DELETE FROM workouts;`);
        await database.execAsync(`DELETE FROM template_exercises;`);
        await database.execAsync(`DELETE FROM templates;`);
        await database.execAsync(`DELETE FROM splits_templates;`);
        await database.execAsync(`DELETE FROM splits_schedule;`);
        await database.execAsync(`DELETE FROM splits;`);
        await database.execAsync(`DELETE FROM user_preferences;`);
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
