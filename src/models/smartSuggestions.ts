/**
 * Smart Suggestions Model
 *
 * Canonical types for the Phase 7 personalization engine.
 * All predictions are computed on-device from workout history.
 */

// ============================================================
// Training Phase
// ============================================================

/** Training phase affects prediction behavior */
export type TrainingPhase = 'bulk' | 'cut' | 'maintain' | 'recovery';

/** Human-readable labels for display */
export const TRAINING_PHASE_LABELS: Record<TrainingPhase, string> = {
    bulk: 'Bulk',
    cut: 'Cut',
    maintain: 'Maintain',
    recovery: 'Recovery',
};

// ============================================================
// Set-Level Suggestions
// ============================================================

/** Per-set suggestion data */
export interface SetSuggestion {
    suggestedWeight: number | null;
    suggestedReps: number | null;
    confidence: 'high' | 'medium' | 'low' | 'none';
    source: 'direct' | 'cross_exercise' | 'repeat_last';
}

// ============================================================
// Exercise-Level Suggestions
// ============================================================

/** Per-exercise suggestion bundle (computed once, cached in store) */
export interface ExerciseSuggestion {
    exerciseId: string;
    sets: SetSuggestion[];
    predictedSetCount: number;        // Feature 4: set count prediction
    smartRestDuration: number | null;  // Feature 2: learned rest time
    progressionNudge: ProgressionNudge | null; // Feature 5
}

/** Progressive overload nudge data */
export interface ProgressionNudge {
    currentWeight: number;
    currentReps: number;
    consecutiveSessions: number;
    suggestedWeight: number;
}

// ============================================================
// Strength Profile (stored as JSON on user_settings)
// ============================================================

/** Per-muscle-group strength estimate */
export interface MuscleStrengthProfile {
    muscleGroup: string;
    estimated1RM: number;      // Best estimated 1RM across all exercises for this muscle
    growthRatePerWeek: number;  // lbs/week from regression
    isPlateaued: boolean;       // < 1% growth over 6 weeks
    lastUpdated: string;        // ISO date
}

/** Full strength profile (stored as JSON on user_settings) */
export interface StrengthProfile {
    muscles: MuscleStrengthProfile[];
    computedAt: string;  // ISO datetime
}
