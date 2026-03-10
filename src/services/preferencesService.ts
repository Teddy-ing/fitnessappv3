/**
 * Preferences Service
 *
 * Typed read/write access to the `user_settings` table.
 * This table is a single-row store (id = 1) that replaces the old
 * EAV `user_preferences` key-value table.
 *
 * All settings are loaded/saved in one query — no per-key round-trips.
 */

import { getDatabase } from './database';

// ============================================================
// Types
// ============================================================

/** Row shape matching the user_settings table columns */
export interface UserSettings {
    activeSplitId: string | null;
    currentTemplateIndex: number;
    lastWorkoutDate: string | null;
    weightUnit: string;
    distanceUnit: string;
    theme: string;
    defaultRestTime: number;
    autoStartRestTimer: boolean;
    restTimerVibration: boolean;
    defaultSetsPerExercise: number;
    hasCompletedOnboarding: boolean;
}

/** Raw row from the user_settings table (snake_case, integers for booleans) */
interface UserSettingsRow {
    id: number;
    active_split_id: string | null;
    current_template_index: number;
    last_workout_date: string | null;
    weight_unit: string;
    distance_unit: string;
    theme: string;
    default_rest_time: number;
    auto_start_rest_timer: number;
    rest_timer_vibration: number;
    default_sets_per_exercise: number;
    has_completed_onboarding: number;
}

/** Default settings — used if the row doesn't exist yet */
const DEFAULTS: UserSettings = {
    activeSplitId: null,
    currentTemplateIndex: 0,
    lastWorkoutDate: null,
    weightUnit: 'lbs',
    distanceUnit: 'mi',
    theme: 'dark',
    defaultRestTime: 90,
    autoStartRestTimer: true,
    restTimerVibration: true,
    defaultSetsPerExercise: 3,
    hasCompletedOnboarding: false,
};

// ============================================================
// Read
// ============================================================

/**
 * Load all user settings in a single query.
 * Returns typed defaults if the row is missing.
 */
export async function getSettings(): Promise<UserSettings> {
    const db = await getDatabase();
    if (!db) return { ...DEFAULTS };

    const row = await db.getFirstAsync<UserSettingsRow>(
        `SELECT * FROM user_settings WHERE id = 1`,
    );

    if (!row) return { ...DEFAULTS };

    return {
        activeSplitId: row.active_split_id,
        currentTemplateIndex: row.current_template_index,
        lastWorkoutDate: row.last_workout_date,
        weightUnit: row.weight_unit,
        distanceUnit: row.distance_unit,
        theme: row.theme,
        defaultRestTime: row.default_rest_time,
        autoStartRestTimer: row.auto_start_rest_timer === 1,
        restTimerVibration: row.rest_timer_vibration === 1,
        defaultSetsPerExercise: row.default_sets_per_exercise,
        hasCompletedOnboarding: row.has_completed_onboarding === 1,
    };
}

// ============================================================
// Write
// ============================================================

/**
 * Update one or more settings. Only the provided fields are written;
 * everything else is left untouched.
 *
 * Usage:
 *   await updateSettings({ activeSplitId: 'split-123' });
 *   await updateSettings({ weightUnit: 'kg', distanceUnit: 'km' });
 */
export async function updateSettings(
    updates: Partial<UserSettings>,
): Promise<void> {
    const db = await getDatabase();
    if (!db) return;

    // Map camelCase keys → snake_case columns, converting booleans to integers
    const columnMap: Record<keyof UserSettings, string> = {
        activeSplitId: 'active_split_id',
        currentTemplateIndex: 'current_template_index',
        lastWorkoutDate: 'last_workout_date',
        weightUnit: 'weight_unit',
        distanceUnit: 'distance_unit',
        theme: 'theme',
        defaultRestTime: 'default_rest_time',
        autoStartRestTimer: 'auto_start_rest_timer',
        restTimerVibration: 'rest_timer_vibration',
        defaultSetsPerExercise: 'default_sets_per_exercise',
        hasCompletedOnboarding: 'has_completed_onboarding',
    };

    const setClauses: string[] = [];
    const values: (string | number | null)[] = [];

    for (const [key, value] of Object.entries(updates)) {
        const column = columnMap[key as keyof UserSettings];
        if (!column) continue;

        setClauses.push(`${column} = ?`);

        // Convert booleans to integers for SQLite
        if (typeof value === 'boolean') {
            values.push(value ? 1 : 0);
        } else {
            values.push(value as string | number | null);
        }
    }

    if (setClauses.length === 0) return;

    await db.runAsync(
        `UPDATE user_settings SET ${setClauses.join(', ')} WHERE id = 1`,
        values,
    );
}
