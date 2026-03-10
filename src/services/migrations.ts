/**
 * Database Migration System
 * 
 * Versioned, forward-only migrations using SQLite's PRAGMA user_version.
 * Each migration has a version number, a descriptive name, and an `up` function.
 * 
 * Rules:
 * - Never modify an existing migration after it has shipped.
 * - Always append new migrations at the end with the next version number.
 * - Migrations must be idempotent where possible (e.g., CREATE TABLE IF NOT EXISTS).
 * - When adding columns, always check PRAGMA table_info first to avoid crashes
 *   on devices that already have the column from a prior code path.
 */

import * as SQLite from 'expo-sqlite';

// ============================================================
// Types
// ============================================================

interface Migration {
    /** Sequential version number. Must be unique and ascending. */
    version: number;
    /** Human-readable name for logging (e.g., "add_is_favorite_columns"). */
    name: string;
    /** Forward migration function. Throw on failure — never swallow errors. */
    up: (db: SQLite.SQLiteDatabase) => Promise<void>;
}

// ============================================================
// Helper: check if a column exists on a table
// ============================================================

interface TableColumnInfo {
    cid: number;
    name: string;
    type: string;
    notnull: number;
    dflt_value: string | null;
    pk: number;
}

/**
 * Returns true if `columnName` exists on `tableName`.
 * Uses PRAGMA table_info which returns one row per column.
 */
async function columnExists(
    db: SQLite.SQLiteDatabase,
    tableName: string,
    columnName: string,
): Promise<boolean> {
    const columns = await db.getAllAsync<TableColumnInfo>(
        `PRAGMA table_info(${tableName});`,
    );
    return columns.some((col) => col.name === columnName);
}

// ============================================================
// Migration Registry
// ============================================================

const MIGRATIONS: Migration[] = [
    // ----------------------------------------------------------
    // v1: Baseline schema — all tables and indexes
    // ----------------------------------------------------------
    {
        version: 1,
        name: 'baseline_schema',
        up: async (db) => {
            // Workouts
            await db.execAsync(`
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

            // Workout exercises
            await db.execAsync(`
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

            // Workout sets
            await db.execAsync(`
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

            // Templates
            await db.execAsync(`
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

            // Template exercises
            await db.execAsync(`
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

            // Splits
            await db.execAsync(`
                CREATE TABLE IF NOT EXISTS splits (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    is_built_in INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
            `);

            // Splits-templates junction
            await db.execAsync(`
                CREATE TABLE IF NOT EXISTS splits_templates (
                    id TEXT PRIMARY KEY,
                    split_id TEXT NOT NULL,
                    template_id TEXT NOT NULL,
                    order_index INTEGER NOT NULL,
                    FOREIGN KEY (split_id) REFERENCES splits(id) ON DELETE CASCADE,
                    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
                );
            `);

            // Splits schedule (supports rest days + templates)
            await db.execAsync(`
                CREATE TABLE IF NOT EXISTS splits_schedule (
                    id TEXT PRIMARY KEY,
                    split_id TEXT NOT NULL,
                    order_index INTEGER NOT NULL,
                    item_type TEXT NOT NULL,
                    template_id TEXT,
                    FOREIGN KEY (split_id) REFERENCES splits(id) ON DELETE CASCADE
                );
            `);

            // Exercises (custom + user modifications to built-in)
            await db.execAsync(`
                CREATE TABLE IF NOT EXISTS exercises (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    category TEXT NOT NULL DEFAULT 'strength',
                    muscle_groups TEXT,
                    equipment TEXT,
                    description TEXT,
                    instructions TEXT,
                    image_path TEXT,
                    track_weight INTEGER DEFAULT 1,
                    track_reps INTEGER DEFAULT 1,
                    track_time INTEGER DEFAULT 0,
                    track_distance INTEGER DEFAULT 0,
                    is_custom INTEGER DEFAULT 1,
                    is_hidden INTEGER DEFAULT 0,
                    is_favorite INTEGER DEFAULT 0,
                    notes TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
            `);

            // User preferences
            await db.execAsync(`
                CREATE TABLE IF NOT EXISTS user_preferences (
                    key TEXT PRIMARY KEY,
                    value TEXT
                );
            `);

            // Indexes
            await db.execAsync(`
                CREATE INDEX IF NOT EXISTS idx_workouts_started_at ON workouts(started_at);
                CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON workout_exercises(workout_id);
                CREATE INDEX IF NOT EXISTS idx_workout_sets_workout_exercise_id ON workout_sets(workout_exercise_id);
                CREATE INDEX IF NOT EXISTS idx_template_exercises_template_id ON template_exercises(template_id);
                CREATE INDEX IF NOT EXISTS idx_splits_templates_split_id ON splits_templates(split_id);
                CREATE INDEX IF NOT EXISTS idx_splits_schedule_split_id ON splits_schedule(split_id);
            `);
        },
    },

    // ----------------------------------------------------------
    // v2: Add is_favorite columns to templates and splits
    // ----------------------------------------------------------
    {
        version: 2,
        name: 'add_is_favorite_columns',
        up: async (db) => {
            // Check before altering — existing users may already have these
            // columns from the old try/catch migration path.
            const templateHasFav = await columnExists(db, 'templates', 'is_favorite');
            if (!templateHasFav) {
                await db.execAsync(
                    `ALTER TABLE templates ADD COLUMN is_favorite INTEGER DEFAULT 0;`,
                );
            }

            const splitHasFav = await columnExists(db, 'splits', 'is_favorite');
            if (!splitHasFav) {
                await db.execAsync(
                    `ALTER TABLE splits ADD COLUMN is_favorite INTEGER DEFAULT 0;`,
                );
            }
        },
    },

    // ----------------------------------------------------------
    // v3: Replace EAV user_preferences with typed user_settings
    // ----------------------------------------------------------
    {
        version: 3,
        name: 'typed_user_settings',
        up: async (db) => {
            // Create the typed single-row table
            await db.execAsync(`
                CREATE TABLE IF NOT EXISTS user_settings (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    active_split_id TEXT,
                    current_template_index INTEGER DEFAULT 0,
                    last_workout_date TEXT,
                    weight_unit TEXT DEFAULT 'lbs',
                    distance_unit TEXT DEFAULT 'mi',
                    theme TEXT DEFAULT 'dark',
                    default_rest_time INTEGER DEFAULT 90,
                    auto_start_rest_timer INTEGER DEFAULT 1,
                    rest_timer_vibration INTEGER DEFAULT 1,
                    default_sets_per_exercise INTEGER DEFAULT 3,
                    has_completed_onboarding INTEGER DEFAULT 0
                );
            `);

            // Seed the single row
            await db.execAsync(`INSERT OR IGNORE INTO user_settings (id) VALUES (1);`);

            // Migrate existing EAV data (if any) into the new row
            const activeSplit = await db.getFirstAsync<{ value: string }>(
                `SELECT value FROM user_preferences WHERE key = 'active_split_id'`,
            );
            const templateIndex = await db.getFirstAsync<{ value: string }>(
                `SELECT value FROM user_preferences WHERE key = 'current_template_index'`,
            );
            const lastDate = await db.getFirstAsync<{ value: string }>(
                `SELECT value FROM user_preferences WHERE key = 'last_workout_date'`,
            );

            if (activeSplit?.value) {
                await db.runAsync(
                    `UPDATE user_settings SET active_split_id = ? WHERE id = 1`,
                    [activeSplit.value],
                );
            }
            if (templateIndex?.value) {
                await db.runAsync(
                    `UPDATE user_settings SET current_template_index = ? WHERE id = 1`,
                    [parseInt(templateIndex.value, 10) || 0],
                );
            }
            if (lastDate?.value) {
                await db.runAsync(
                    `UPDATE user_settings SET last_workout_date = ? WHERE id = 1`,
                    [lastDate.value],
                );
            }
        },
    },
];

// ============================================================
// Migration Runner
// ============================================================

interface UserVersionRow {
    user_version: number;
}

/**
 * Run all pending migrations against the database.
 * Reads PRAGMA user_version to determine what has already run,
 * then executes each pending migration's `up` function in order.
 *
 * Each migration runs inside a transaction so that a failure mid-way
 * through a multi-statement migration rolls back all partial changes.
 * The version stamp is set inside the transaction — it only persists
 * on commit.
 *
 * Throws on failure — callers should let this propagate to
 * trigger the existing dbInitFailed error path.
 */
export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
    // Read current schema version
    const versionResult = await db.getFirstAsync<UserVersionRow>(
        'PRAGMA user_version;',
    );
    const currentVersion = versionResult?.user_version ?? 0;

    // Filter to only pending migrations
    const pending = MIGRATIONS.filter((m) => m.version > currentVersion);

    if (pending.length === 0) {
        console.log(`[DB] Schema up to date (v${currentVersion})`);
        return;
    }

    console.log(
        `[DB] Schema at v${currentVersion}, applying ${pending.length} migration(s)...`,
    );

    for (const migration of pending) {
        console.log(`[DB] Running migration v${migration.version}: ${migration.name}`);

        try {
            await db.execAsync('BEGIN;');
            await migration.up(db);
            // Stamp version inside the transaction — only persists on commit
            await db.execAsync(`PRAGMA user_version = ${migration.version};`);
            await db.execAsync('COMMIT;');
        } catch (error) {
            // Roll back partial changes so the DB is never left half-migrated
            try {
                await db.execAsync('ROLLBACK;');
            } catch (rollbackError) {
                console.error(`[DB] Rollback also failed:`, rollbackError);
            }
            console.error(
                `[DB] Migration v${migration.version} (${migration.name}) FAILED:`,
                error,
            );
            throw error; // Do NOT swallow — let dbInitFailed path handle it
        }
    }

    const finalVersion = pending[pending.length - 1].version;
    console.log(`[DB] All migrations complete — now at v${finalVersion}`);
}
