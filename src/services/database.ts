/**
 * Database Service
 * 
 * Handles SQLite database initialization and schema management.
 * Uses expo-sqlite for persistent local storage.
 */

import * as SQLite from 'expo-sqlite';

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

        console.log('[DB] Initializing schema...');
        await initializeSchema(database);

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
 * Initialize database schema
 */
async function initializeSchema(database: SQLite.SQLiteDatabase): Promise<void> {
    // Enable WAL mode and foreign keys
    await database.execAsync(`PRAGMA journal_mode = WAL;`);
    await database.execAsync(`PRAGMA foreign_keys = ON;`);

    // Create workouts table
    await database.execAsync(`
        CREATE TABLE IF NOT EXISTS workouts (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'completed',
            started_at TEXT NOT NULL,
            completed_at TEXT,
            total_duration INTEGER,
            total_volume REAL,
            total_sets INTEGER,
            muscle_groups_worked TEXT,
            location TEXT,
            note TEXT,
            template_id TEXT,
            day_of_week INTEGER,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
    `);

    // Create workout_exercises table
    await database.execAsync(`
        CREATE TABLE IF NOT EXISTS workout_exercises (
            id TEXT PRIMARY KEY,
            workout_id TEXT NOT NULL,
            exercise_id TEXT NOT NULL,
            exercise_name TEXT NOT NULL,
            exercise_category TEXT NOT NULL,
            exercise_muscle_groups TEXT,
            exercise_equipment TEXT,
            exercise_track_weight INTEGER DEFAULT 1,
            exercise_track_reps INTEGER DEFAULT 1,
            exercise_track_time INTEGER DEFAULT 0,
            order_index INTEGER NOT NULL,
            superset_group_id TEXT,
            note TEXT,
            FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE
        );
    `);

    // Create workout_sets table
    await database.execAsync(`
        CREATE TABLE IF NOT EXISTS workout_sets (
            id TEXT PRIMARY KEY,
            workout_exercise_id TEXT NOT NULL,
            order_index INTEGER NOT NULL,
            weight REAL,
            reps INTEGER,
            duration INTEGER,
            distance REAL,
            type TEXT NOT NULL DEFAULT 'working',
            status TEXT NOT NULL DEFAULT 'completed',
            rpe REAL,
            rir INTEGER,
            suggested_weight REAL,
            suggested_reps INTEGER,
            note TEXT,
            completed_at TEXT,
            rest_duration INTEGER,
            FOREIGN KEY (workout_exercise_id) REFERENCES workout_exercises(id) ON DELETE CASCADE
        );
    `);

    // Create templates table
    await database.execAsync(`
        CREATE TABLE IF NOT EXISTS templates (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            last_used_at TEXT,
            use_count INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
    `);

    // Create template_exercises table
    await database.execAsync(`
        CREATE TABLE IF NOT EXISTS template_exercises (
            id TEXT PRIMARY KEY,
            template_id TEXT NOT NULL,
            exercise_id TEXT NOT NULL,
            exercise_name TEXT NOT NULL,
            exercise_category TEXT NOT NULL,
            exercise_muscle_groups TEXT,
            exercise_equipment TEXT,
            exercise_track_weight INTEGER DEFAULT 1,
            exercise_track_reps INTEGER DEFAULT 1,
            exercise_track_time INTEGER DEFAULT 0,
            order_index INTEGER NOT NULL,
            default_sets INTEGER DEFAULT 3,
            note TEXT,
            FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
        );
    `);

    // Create splits table
    await database.execAsync(`
        CREATE TABLE IF NOT EXISTS splits (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            is_built_in INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
    `);

    // Create splits_templates junction table (ordered list of templates in a split)
    await database.execAsync(`
        CREATE TABLE IF NOT EXISTS splits_templates (
            id TEXT PRIMARY KEY,
            split_id TEXT NOT NULL,
            template_id TEXT NOT NULL,
            order_index INTEGER NOT NULL,
            FOREIGN KEY (split_id) REFERENCES splits(id) ON DELETE CASCADE,
            FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
        );
    `);

    // Create splits_schedule table (supports rest days + templates)
    await database.execAsync(`
        CREATE TABLE IF NOT EXISTS splits_schedule (
            id TEXT PRIMARY KEY,
            split_id TEXT NOT NULL,
            order_index INTEGER NOT NULL,
            item_type TEXT NOT NULL,
            template_id TEXT,
            FOREIGN KEY (split_id) REFERENCES splits(id) ON DELETE CASCADE
        );
    `);

    // Create user_preferences table (stores active split, etc.)
    await database.execAsync(`
        CREATE TABLE IF NOT EXISTS user_preferences (
            key TEXT PRIMARY KEY,
            value TEXT
        );
    `);

    // Create indexes
    await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_workouts_completed_at ON workouts(completed_at);`);
    await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON workout_exercises(workout_id);`);
    await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise_id ON workout_sets(workout_exercise_id);`);
    await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_template_exercises_template_id ON template_exercises(template_id);`);
    await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_splits_templates_split_id ON splits_templates(split_id);`);
    await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_splits_schedule_split_id ON splits_schedule(split_id);`);
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
