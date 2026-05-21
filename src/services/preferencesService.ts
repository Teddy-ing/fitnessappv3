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
import { safeJsonParse } from './hydration';
import { UserSettings } from '../models/preferences';
import type { StrengthProfile } from '../models/smartSuggestions';
import { WidgetConfig, DEFAULT_WIDGETS } from '../models/widget';

// Re-export for barrel consumers
export type { UserSettings };

// ============================================================
// Types (internal)
// ============================================================

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
    calendar_start_day: string;
    calendar_heatmap_metric: string;
    pr_backfill_complete: number;
    visible_measurements: string | null;
    relative_strength_exercise: string | null;
    widget_config: string | null;
    show_rpe: number;
    show_rir: number;
    show_plate_calc: number;
    default_warmup_sets: number;
    show_previous: number;
    measurement_unit: string;
    keep_awake: number;
    show_exercise_media: number;
    show_exercise_instructions: number;
    smart_suggestions: number;
    default_weight_increment: number;
    training_phase: string;
    strength_profile: string | null;
    show_progression_nudges: number;
    prefill_previous: number;
}

/** Default settings — used if the row doesn't exist yet */
const DEFAULT_VISIBLE_MEASUREMENTS = ['bodyweight', 'body_fat', 'waist', 'chest'];

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
    calendarStartDay: 'sunday',
    calendarHeatmapMetric: 'volume',
    prBackfillComplete: false,
    visibleMeasurements: DEFAULT_VISIBLE_MEASUREMENTS,
    relativeStrengthExercise: null,
    widgetConfig: DEFAULT_WIDGETS,
    showRpe: false,
    showRir: false,
    showPlateCalc: true,
    defaultWarmupSets: 2,
    showPrevious: true,
    measurementUnit: 'in',
    keepAwakeDuringWorkout: true,
    showExerciseMedia: true,
    showExerciseInstructions: true,
    smartSuggestions: false,
    defaultWeightIncrement: 5,
    trainingPhase: 'maintain',
    strengthProfile: null,
    showProgressionNudges: false,
    prefillPrevious: true,
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
        calendarStartDay: row.calendar_start_day ?? 'sunday',
        calendarHeatmapMetric: row.calendar_heatmap_metric ?? 'volume',
        prBackfillComplete: row.pr_backfill_complete === 1,
        visibleMeasurements: safeJsonParse<string[]>(
            row.visible_measurements,
            DEFAULT_VISIBLE_MEASUREMENTS,
        ),
        relativeStrengthExercise: row.relative_strength_exercise ?? null,
        widgetConfig: safeJsonParse<WidgetConfig[]>(
            row.widget_config,
            DEFAULT_WIDGETS,
        ),
        showRpe: row.show_rpe === 1,
        showRir: row.show_rir === 1,
        showPlateCalc: row.show_plate_calc === 1,
        defaultWarmupSets: row.default_warmup_sets ?? 2,
        showPrevious: row.show_previous === 1,
        measurementUnit: row.measurement_unit ?? 'in',
        keepAwakeDuringWorkout: row.keep_awake === 1,
        showExerciseMedia: row.show_exercise_media === 1,
        showExerciseInstructions: row.show_exercise_instructions === 1,
        smartSuggestions: row.smart_suggestions === 1,
        defaultWeightIncrement: row.default_weight_increment ?? 5,
        trainingPhase: (row.training_phase as UserSettings['trainingPhase']) ?? 'maintain',
        strengthProfile: safeJsonParse<StrengthProfile | null>(
            row.strength_profile,
            null,
        ),
        showProgressionNudges: row.show_progression_nudges === 1,
        prefillPrevious: (row.prefill_previous ?? 1) === 1,
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
        calendarStartDay: 'calendar_start_day',
        calendarHeatmapMetric: 'calendar_heatmap_metric',
        prBackfillComplete: 'pr_backfill_complete',
        visibleMeasurements: 'visible_measurements',
        relativeStrengthExercise: 'relative_strength_exercise',
        widgetConfig: 'widget_config',
        showRpe: 'show_rpe',
        showRir: 'show_rir',
        showPlateCalc: 'show_plate_calc',
        defaultWarmupSets: 'default_warmup_sets',
        showPrevious: 'show_previous',
        measurementUnit: 'measurement_unit',
        keepAwakeDuringWorkout: 'keep_awake',
        showExerciseMedia: 'show_exercise_media',
        showExerciseInstructions: 'show_exercise_instructions',
        smartSuggestions: 'smart_suggestions',
        defaultWeightIncrement: 'default_weight_increment',
        trainingPhase: 'training_phase',
        strengthProfile: 'strength_profile',
        showProgressionNudges: 'show_progression_nudges',
        prefillPrevious: 'prefill_previous',
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
        } else if (Array.isArray(value)) {
            // JSON arrays (e.g., visibleMeasurements) → stringify
            values.push(JSON.stringify(value));
        } else if (typeof value === 'object' && value !== null) {
            // JSON objects (e.g., strengthProfile) → stringify
            values.push(JSON.stringify(value));
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
