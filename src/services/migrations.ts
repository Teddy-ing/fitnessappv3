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

    // ----------------------------------------------------------
    // v4: Calendar settings columns + completed_at index
    // ----------------------------------------------------------
    {
        version: 4,
        name: 'calendar_settings_and_index',
        up: async (db) => {
            // Calendar-specific settings on user_settings
            const hasStartDay = await columnExists(db, 'user_settings', 'calendar_start_day');
            if (!hasStartDay) {
                await db.execAsync(
                    `ALTER TABLE user_settings ADD COLUMN calendar_start_day TEXT DEFAULT 'sunday';`,
                );
            }

            const hasMetric = await columnExists(db, 'user_settings', 'calendar_heatmap_metric');
            if (!hasMetric) {
                await db.execAsync(
                    `ALTER TABLE user_settings ADD COLUMN calendar_heatmap_metric TEXT DEFAULT 'volume';`,
                );
            }

            // Performance index for calendar month queries
            await db.execAsync(
                `CREATE INDEX IF NOT EXISTS idx_workouts_completed_at ON workouts(completed_at);`,
            );
        },
    },

    // ----------------------------------------------------------
    // v5: Personal records table + backfill flag
    // ----------------------------------------------------------
    {
        version: 5,
        name: 'personal_records_table',
        up: async (db) => {
            // Materialized PR table — populated by backfill, updated on workout save
            await db.execAsync(`
                CREATE TABLE IF NOT EXISTS personal_records (
                    id TEXT PRIMARY KEY,
                    exercise_id TEXT NOT NULL,
                    exercise_name TEXT NOT NULL,
                    workout_id TEXT NOT NULL,
                    set_id TEXT NOT NULL,
                    record_type TEXT NOT NULL,
                    value REAL NOT NULL,
                    reps INTEGER,
                    weight REAL,
                    achieved_at TEXT NOT NULL,
                    is_current INTEGER DEFAULT 1,
                    created_at TEXT NOT NULL
                );
            `);

            await db.execAsync(`
                CREATE INDEX IF NOT EXISTS idx_pr_exercise ON personal_records(exercise_id);
                CREATE INDEX IF NOT EXISTS idx_pr_date ON personal_records(achieved_at);
                CREATE INDEX IF NOT EXISTS idx_pr_type ON personal_records(record_type, is_current);
            `);

            // Flag to gate one-time backfill
            const hasFlag = await columnExists(db, 'user_settings', 'pr_backfill_complete');
            if (!hasFlag) {
                await db.execAsync(
                    `ALTER TABLE user_settings ADD COLUMN pr_backfill_complete INTEGER DEFAULT 0;`,
                );
            }
        },
    },
    // ----------------------------------------------------------
    // v6: Measurements system — types catalog, log, photos
    // ----------------------------------------------------------
    {
        version: 6,
        name: 'measurements_and_photos',
        up: async (db) => {
            // Measurement type catalog (available metrics)
            await db.execAsync(`
                CREATE TABLE IF NOT EXISTS measurement_types (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    category TEXT NOT NULL,
                    unit_imperial TEXT NOT NULL,
                    unit_metric TEXT NOT NULL,
                    default_visible INTEGER DEFAULT 0,
                    order_index INTEGER NOT NULL
                );
            `);

            // Measurement log entries (user-recorded values)
            await db.execAsync(`
                CREATE TABLE IF NOT EXISTS measurements (
                    id TEXT PRIMARY KEY,
                    measurement_type_id TEXT NOT NULL,
                    value REAL NOT NULL,
                    recorded_at TEXT NOT NULL,
                    note TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (measurement_type_id) REFERENCES measurement_types(id)
                );
            `);

            // Progress photos
            await db.execAsync(`
                CREATE TABLE IF NOT EXISTS progress_photos (
                    id TEXT PRIMARY KEY,
                    file_path TEXT NOT NULL,
                    recorded_at TEXT NOT NULL,
                    bodyweight REAL,
                    note TEXT,
                    created_at TEXT NOT NULL
                );
            `);

            // Indexes
            await db.execAsync(`
                CREATE INDEX IF NOT EXISTS idx_measurements_type_date
                    ON measurements(measurement_type_id, recorded_at);
                CREATE INDEX IF NOT EXISTS idx_measurements_recorded_at
                    ON measurements(recorded_at);
                CREATE INDEX IF NOT EXISTS idx_progress_photos_recorded_at
                    ON progress_photos(recorded_at);
            `);

            // Seed default measurement types
            await db.execAsync(`
                INSERT OR IGNORE INTO measurement_types (id, name, category, unit_imperial, unit_metric, default_visible, order_index) VALUES
                    ('bodyweight',    'Bodyweight',     'core',  'lbs', 'kg', 1, 1),
                    ('body_fat',      'Body Fat %',     'core',  '%',   '%',  1, 2),
                    ('waist',         'Waist',          'torso', 'in',  'cm', 1, 3),
                    ('chest',         'Chest',          'torso', 'in',  'cm', 1, 4),
                    ('shoulders',     'Shoulders',      'torso', 'in',  'cm', 0, 5),
                    ('hips',          'Hips',           'torso', 'in',  'cm', 0, 6),
                    ('left_bicep',    'Left Bicep',     'arms',  'in',  'cm', 0, 7),
                    ('right_bicep',   'Right Bicep',    'arms',  'in',  'cm', 0, 8),
                    ('left_forearm',  'Left Forearm',   'arms',  'in',  'cm', 0, 9),
                    ('right_forearm', 'Right Forearm',  'arms',  'in',  'cm', 0, 10),
                    ('left_thigh',    'Left Thigh',     'legs',  'in',  'cm', 0, 11),
                    ('right_thigh',   'Right Thigh',    'legs',  'in',  'cm', 0, 12),
                    ('left_calf',     'Left Calf',      'legs',  'in',  'cm', 0, 13),
                    ('right_calf',    'Right Calf',     'legs',  'in',  'cm', 0, 14),
                    ('neck',          'Neck',           'other', 'in',  'cm', 0, 15);
            `);

            // User settings columns for measurement preferences
            const hasVisible = await columnExists(db, 'user_settings', 'visible_measurements');
            if (!hasVisible) {
                await db.execAsync(
                    `ALTER TABLE user_settings ADD COLUMN visible_measurements TEXT DEFAULT '["bodyweight","body_fat","waist","chest"]';`,
                );
            }

            const hasRelStrength = await columnExists(db, 'user_settings', 'relative_strength_exercise');
            if (!hasRelStrength) {
                await db.execAsync(
                    `ALTER TABLE user_settings ADD COLUMN relative_strength_exercise TEXT;`,
                );
            }
        },
    },

    // ----------------------------------------------------------
    // v7: Goals tracking system
    // ----------------------------------------------------------
    {
        version: 7,
        name: 'goals_table',
        up: async (db) => {
            await db.execAsync(`
                CREATE TABLE IF NOT EXISTS goals (
                    id TEXT PRIMARY KEY,
                    goal_type TEXT NOT NULL,
                    exercise_id TEXT,
                    measurement_type_id TEXT,
                    target_value REAL NOT NULL,
                    starting_value REAL,
                    current_best REAL,
                    label TEXT,
                    deadline TEXT,
                    status TEXT NOT NULL DEFAULT 'active',
                    completed_at TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
            `);

            await db.execAsync(`
                CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
                CREATE INDEX IF NOT EXISTS idx_goals_exercise_id ON goals(exercise_id);
            `);
        },
    },

    // ----------------------------------------------------------
    // v8: Widget system — config column on user_settings
    // ----------------------------------------------------------
    {
        version: 8,
        name: 'widget_config_column',
        up: async (db) => {
            const hasCol = await columnExists(db, 'user_settings', 'widget_config');
            if (!hasCol) {
                // Default: Streak Badge (square) + Weekly Wrap-Up (square) + Bodyweight Sparkline (rectangle)
                const defaultWidgets = JSON.stringify([
                    { id: 'default-streak', type: 'streak_badge', size: 'square' },
                    { id: 'default-weekly', type: 'weekly_wrapup', size: 'square' },
                    { id: 'default-bodyweight', type: 'bodyweight_sparkline', size: 'rectangle' },
                ]);
                await db.execAsync(
                    `ALTER TABLE user_settings ADD COLUMN widget_config TEXT DEFAULT '${defaultWidgets}';`,
                );

                // Seed existing row with defaults
                await db.runAsync(
                    `UPDATE user_settings SET widget_config = ? WHERE id = 1 AND widget_config IS NULL`,
                    [defaultWidgets],
                );
            }
        },
    },

    // ----------------------------------------------------------
    // v9: Show RPE column toggle
    // ----------------------------------------------------------
    {
        version: 9,
        name: 'show_rpe_column',
        up: async (db) => {
            const hasCol = await columnExists(db, 'user_settings', 'show_rpe');
            if (!hasCol) {
                await db.execAsync(
                    `ALTER TABLE user_settings ADD COLUMN show_rpe INTEGER DEFAULT 0;`,
                );
            }
        },
    },

    // ----------------------------------------------------------
    // v10: Workout screen settings (RIR, Plate Calc, Warmups, Previous)
    // ----------------------------------------------------------
    {
        version: 10,
        name: 'workout_screen_settings',
        up: async (db) => {
            const hasRir = await columnExists(db, 'user_settings', 'show_rir');
            if (!hasRir) {
                await db.execAsync(
                    `ALTER TABLE user_settings ADD COLUMN show_rir INTEGER DEFAULT 0;`,
                );
            }

            const hasPlateCalc = await columnExists(db, 'user_settings', 'show_plate_calc');
            if (!hasPlateCalc) {
                await db.execAsync(
                    `ALTER TABLE user_settings ADD COLUMN show_plate_calc INTEGER DEFAULT 1;`,
                );
            }

            const hasWarmups = await columnExists(db, 'user_settings', 'default_warmup_sets');
            if (!hasWarmups) {
                await db.execAsync(
                    `ALTER TABLE user_settings ADD COLUMN default_warmup_sets INTEGER DEFAULT 2;`,
                );
            }

            const hasPrevious = await columnExists(db, 'user_settings', 'show_previous');
            if (!hasPrevious) {
                await db.execAsync(
                    `ALTER TABLE user_settings ADD COLUMN show_previous INTEGER DEFAULT 1;`,
                );
            }
        },
    },

    // ----------------------------------------------------------
    // v11: Persistent exercise notes (original single-note schema)
    // ----------------------------------------------------------
    {
        version: 11,
        name: 'exercise_notes_table',
        up: async (db) => {
            await db.execAsync(`
                CREATE TABLE IF NOT EXISTS exercise_notes (
                    exercise_id TEXT PRIMARY KEY,
                    note TEXT NOT NULL,
                    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
                );
            `);
        },
    },

    // ----------------------------------------------------------
    // v12: Multi-note exercise notes (drop + recreate)
    // ----------------------------------------------------------
    {
        version: 12,
        name: 'exercise_notes_multi',
        up: async (db) => {
            // Drop single-note table from v11 and recreate with multi-note schema
            await db.execAsync(`DROP TABLE IF EXISTS exercise_notes;`);
            await db.execAsync(`
                CREATE TABLE IF NOT EXISTS exercise_notes (
                    id TEXT PRIMARY KEY,
                    exercise_id TEXT NOT NULL,
                    note TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT (datetime('now'))
                );
            `);
            await db.execAsync(`
                CREATE INDEX IF NOT EXISTS idx_exercise_notes_exercise_id
                    ON exercise_notes(exercise_id);
            `);
        },
    },
    // ----------------------------------------------------------
    // v13: Settings expansion — new general + workout settings
    // ----------------------------------------------------------
    {
        version: 13,
        name: 'settings_expansion',
        up: async (db) => {
            // measurement_unit: in (inches) or cm (centimeters) for body measurements
            const hasMeasurementUnit = await columnExists(db, 'user_settings', 'measurement_unit');
            if (!hasMeasurementUnit) {
                await db.execAsync(
                    `ALTER TABLE user_settings ADD COLUMN measurement_unit TEXT DEFAULT 'in';`,
                );
            }

            // keep_awake: prevent screen lock during active workout
            const hasKeepAwake = await columnExists(db, 'user_settings', 'keep_awake');
            if (!hasKeepAwake) {
                await db.execAsync(
                    `ALTER TABLE user_settings ADD COLUMN keep_awake INTEGER DEFAULT 1;`,
                );
            }

            // show_exercise_media: toggle exercise icons in ExercisePicker
            const hasShowMedia = await columnExists(db, 'user_settings', 'show_exercise_media');
            if (!hasShowMedia) {
                await db.execAsync(
                    `ALTER TABLE user_settings ADD COLUMN show_exercise_media INTEGER DEFAULT 1;`,
                );
            }

            // show_exercise_instructions: toggle instructions on Exercise Details About tab
            const hasShowInstructions = await columnExists(db, 'user_settings', 'show_exercise_instructions');
            if (!hasShowInstructions) {
                await db.execAsync(
                    `ALTER TABLE user_settings ADD COLUMN show_exercise_instructions INTEGER DEFAULT 1;`,
                );
            }

            // smart_suggestions: ML prediction toggle (future, default disabled)
            const hasSmartSuggestions = await columnExists(db, 'user_settings', 'smart_suggestions');
            if (!hasSmartSuggestions) {
                await db.execAsync(
                    `ALTER TABLE user_settings ADD COLUMN smart_suggestions INTEGER DEFAULT 0;`,
                );
            }

            // default_weight_increment: step size for weight +/− buttons in keyboard
            const hasWeightIncrement = await columnExists(db, 'user_settings', 'default_weight_increment');
            if (!hasWeightIncrement) {
                await db.execAsync(
                    `ALTER TABLE user_settings ADD COLUMN default_weight_increment REAL DEFAULT 5;`,
                );
            }
        },
    },

    // ----------------------------------------------------------
    // v14: Missing index on workout_exercises(exercise_id) — PP-076
    // ----------------------------------------------------------
    {
        version: 14,
        name: 'idx_workout_exercises_exercise_id',
        up: async (db) => {
            // PP-076: getPreviousSetsForExercise queries by exercise_id but
            // the v1 schema only indexed workout_id. At 6000–8000 rows this
            // degrades visibly.
            await db.execAsync(
                `CREATE INDEX IF NOT EXISTS idx_workout_exercises_exercise_id ON workout_exercises(exercise_id);`,
            );
        },
    },

    // ----------------------------------------------------------
    // v15: Cloud backup configuration table (Phase 6 groundwork)
    // ----------------------------------------------------------
    {
        version: 15,
        name: 'cloud_backup_config',
        up: async (db) => {
            await db.execAsync(`
                CREATE TABLE IF NOT EXISTS cloud_backup_config (
                    id INTEGER PRIMARY KEY DEFAULT 1,
                    provider TEXT,
                    account_identifier TEXT,
                    auto_backup_enabled INTEGER DEFAULT 0,
                    last_backup_at TEXT,
                    last_backup_status TEXT DEFAULT 'none'
                );
            `);
        },
    },

    // ----------------------------------------------------------
    // v16: Superset support in templates
    // ----------------------------------------------------------
    {
        version: 16,
        name: 'template_superset_group_id',
        up: async (db) => {
            const hasCol = await columnExists(db, 'template_exercises', 'superset_group_id');
            if (!hasCol) {
                await db.execAsync(
                    `ALTER TABLE template_exercises ADD COLUMN superset_group_id TEXT;`,
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
