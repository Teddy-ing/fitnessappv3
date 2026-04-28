/**
 * Import Parser Types
 *
 * Shared types for competitor CSV import parsers.
 * All parsers produce these standardized intermediate types,
 * which are then fed into the competitorImportService for
 * batch insertion into the database.
 */

// ============================================================
// Source Identification
// ============================================================

export type CompetitorSource = 'hevy' | 'strong' | 'fitnotes';

// ============================================================
// Parsed Data Types
// ============================================================

export interface ParsedSet {
    setNumber: number;
    weight: number | null;       // Always stored in canonical lbs
    reps: number | null;
    duration: number | null;     // seconds, for timed exercises
    type: 'working' | 'warmup'; // Best-effort mapping
    rpe: number | null;
}

export interface ParsedExercise {
    originalName: string;        // Name as it appears in the CSV
    mappedExerciseId: string | null;  // Matched to our exercise DB
    sets: ParsedSet[];
}

export interface ParsedWorkout {
    date: string;                // ISO date
    name: string;                // Workout name (if available)
    duration: number | null;     // seconds
    exercises: ParsedExercise[];
    notes: string | null;
}

/** For Hevy and FitNotes measurement file imports */
export interface ParsedMeasurement {
    date: string;                // ISO date
    type: string;                // measurement_type id: 'bodyweight' | 'body_fat' | 'neck' | etc.
    value: number;
    unit: string;                // 'lbs' | '%' | 'in' | etc.
}

// ============================================================
// Import Summary & Mapping
// ============================================================

export interface ExerciseMapping {
    originalName: string;
    suggestedMatch: { id: string; name: string } | null;  // Best fuzzy match
    suggestedMatches: { id: string; name: string; confidence: number }[];  // Top 3
    confidence: number;          // 0–100
    action: 'map' | 'create' | 'skip';  // User decides
    resolvedExerciseId: string | null;   // Set after user resolution
    // Custom exercise metadata (set during mapping if action === 'create')
    customMuscleGroup?: string;
    customEquipment?: string;
}

export interface ImportSummary {
    source: CompetitorSource;
    totalWorkouts: number;
    totalSets: number;
    totalExercises: number;
    totalMeasurements: number;
    mappedExercises: number;     // Auto-matched + user-mapped
    unmappedExercises: number;   // Require user action
    skippedExercises: number;
    warnings: string[];          // Non-fatal issues (skipped rows, etc.)
}

export interface ImportResult {
    workoutsInserted: number;
    setsInserted: number;
    exercisesCreated: number;
    measurementsInserted: number;
}

// ============================================================
// Parser Interface
// ============================================================

export interface ParseResult {
    workouts: ParsedWorkout[];
    measurements: ParsedMeasurement[];
    warnings: string[];
}
