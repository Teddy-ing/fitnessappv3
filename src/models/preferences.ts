/**
 * Preferences Model
 *
 * Canonical type for user settings.
 * Matches the typed user_settings table (single-row store, id = 1).
 */

import { WidgetConfig } from './widget';
import type { TrainingPhase, StrengthProfile } from './smartSuggestions';

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
    widgetConfig: WidgetConfig[];
    showRpe: boolean;
    showRir: boolean;
    showPlateCalc: boolean;
    defaultWarmupSets: number;
    showPrevious: boolean;
    measurementUnit: string;
    keepAwakeDuringWorkout: boolean;
    showExerciseMedia: boolean;
    showExerciseInstructions: boolean;
    smartSuggestions: boolean;
    defaultWeightIncrement: number;

    // Phase 7: Smart Personalization
    trainingPhase: TrainingPhase;
    strengthProfile: StrengthProfile | null;
    showProgressionNudges: boolean;
}
