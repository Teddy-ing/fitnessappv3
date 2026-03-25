/**
 * Preferences Model
 *
 * Canonical type for user settings.
 * Matches the typed user_settings table (single-row store, id = 1).
 */

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
    calendarStartDay: string;
    calendarHeatmapMetric: string;
    prBackfillComplete: boolean;
    visibleMeasurements: string[];
    relativeStrengthExercise: string | null;
}
