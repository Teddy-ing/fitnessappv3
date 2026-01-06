/**
 * Database Service
 * 
 * Handles SQLite database initialization and schema management.
 * Uses expo-sqlite for persistent local storage.
 */

import * as SQLite from 'expo-sqlite';

// Singleton database instance
let db: SQLite.SQLiteDatabase | null = null;

/**
 * Get or create the database instance
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (!db) {
        db = await SQLite.openDatabaseAsync('workout_app.db');
        await initializeSchema();
    }
    return db;
}

/**
 * Initialize database schema
 */
async function initializeSchema(): Promise<void> {
    if (!db) return;

    // Create tables in a transaction
    await db.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;

        -- Workouts table
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

        -- Workout exercises table
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

        -- Workout sets table
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

        -- Templates table
        CREATE TABLE IF NOT EXISTS templates (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            last_used_at TEXT,
            use_count INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        -- Template exercises table
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

        -- Create indexes for common queries
        CREATE INDEX IF NOT EXISTS idx_workouts_completed_at ON workouts(completed_at);
        CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON workout_exercises(workout_id);
        CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise_id ON workout_sets(workout_exercise_id);
        CREATE INDEX IF NOT EXISTS idx_template_exercises_template_id ON template_exercises(template_id);
    `);
}

/**
 * Close the database connection
 */
export async function closeDatabase(): Promise<void> {
    if (db) {
        await db.closeAsync();
        db = null;
    }
}

/**
 * Clear all data (for development/testing)
 */
export async function clearAllData(): Promise<void> {
    const database = await getDatabase();
    await database.execAsync(`
        DELETE FROM workout_sets;
        DELETE FROM workout_exercises;
        DELETE FROM workouts;
        DELETE FROM template_exercises;
        DELETE FROM templates;
    `);
}

export default {
    getDatabase,
    closeDatabase,
    clearAllData,
};
