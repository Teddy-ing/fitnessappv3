/**
 * Hydration Helpers
 *
 * Pure mapping functions that convert raw database rows into typed models.
 * Used by workoutService and templateService to avoid duplicating
 * row-to-model logic across multiple hydration functions.
 *
 * These functions have NO database access and NO side effects.
 */

import { Exercise } from '../models/exercise';
import {
    Workout,
    WorkoutExercise,
    WorkoutSet,
    WorkoutSection,
} from '../models/workout';

// ============================================================
// Row types (snake_case DB rows)
// ============================================================

/** Raw row from the workout_sets table */
export interface SetRow {
    id: string;
    order_index: number;
    weight: number | null;
    reps: number | null;
    duration: number | null;
    distance: number | null;
    type: string;
    status: string;
    rpe: number | null;
    rir: number | null;
    suggested_weight: number | null;
    suggested_reps: number | null;
    note: string | null;
    completed_at: string | null;
    rest_duration: number | null;
}

/**
 * Raw row from workout_exercises or template_exercises.
 * Both tables share the exercise_* snapshot columns.
 */
export interface ExerciseRow {
    id: string;
    exercise_id: string;
    exercise_name: string;
    exercise_category: string;
    exercise_muscle_groups: string | null;
    exercise_equipment: string | null;
    exercise_track_weight: number;
    exercise_track_reps: number;
    exercise_track_time: number;
    order_index: number;
    superset_group_id?: string | null;
    note?: string | null;
    // template_exercises only:
    default_sets?: number;
}

/** Raw row from the workouts table */
export interface WorkoutRow {
    id: string;
    name: string;
    status: string;
    started_at: string;
    completed_at: string | null;
    total_duration: number | null;
    total_volume: number | null;
    total_sets: number | null;
    muscle_groups_worked: string | null;
    location: string | null;
    note: string | null;
    template_id: string | null;
    day_of_week: number;
    created_at: string;
    updated_at: string;
}

// ============================================================
// Validation Helpers
// ============================================================

/**
 * Safely parse a JSON string, returning fallback on failure.
 * Protects against corrupt or malformed data in the DB.
 */
function safeJsonParse<T>(raw: string | null, fallback: T): T {
    if (!raw) return fallback;
    try {
        return JSON.parse(raw) as T;
    } catch {
        console.warn('[Hydration] Malformed JSON, using fallback:', raw.slice(0, 80));
        return fallback;
    }
}

/** Valid SetType values — used to validate strings from the DB */
const VALID_SET_TYPES = new Set<string>([
    'warmup', 'working', 'drop', 'failure', 'amrap', 'rest_pause', 'super', 'giant',
]);

function validSetType(raw: string): WorkoutSet['type'] {
    return VALID_SET_TYPES.has(raw)
        ? (raw as WorkoutSet['type'])
        : 'working'; // safe default
}

/** Valid SetStatus values */
const VALID_SET_STATUSES = new Set<string>(['pending', 'completed', 'skipped']);

function validSetStatus(raw: string): WorkoutSet['status'] {
    return VALID_SET_STATUSES.has(raw)
        ? (raw as WorkoutSet['status'])
        : 'pending'; // safe default
}

/** Valid WorkoutStatus values */
const VALID_WORKOUT_STATUSES = new Set<string>(['in_progress', 'completed', 'abandoned']);

function validWorkoutStatus(raw: string): Workout['status'] {
    return VALID_WORKOUT_STATUSES.has(raw)
        ? (raw as Workout['status'])
        : 'completed'; // safe default
}

/** Clamp a nullable number to be non-negative (null passes through) */
function clampNonNeg(value: number | null): number | null {
    if (value === null) return null;
    return Math.max(0, value);
}

// ============================================================
// Mapping Functions
// ============================================================

/**
 * Map a workout_sets row to a WorkoutSet model.
 */
export function mapSetRow(row: SetRow): WorkoutSet {
    return {
        id: row.id,
        orderIndex: row.order_index,
        weight: clampNonNeg(row.weight),
        reps: clampNonNeg(row.reps),
        duration: clampNonNeg(row.duration),
        distance: clampNonNeg(row.distance),
        type: validSetType(row.type),
        status: validSetStatus(row.status),
        rpe: row.rpe,
        rir: row.rir,
        suggestedWeight: clampNonNeg(row.suggested_weight),
        suggestedReps: clampNonNeg(row.suggested_reps),
        note: row.note,
        completedAt: row.completed_at ? new Date(row.completed_at) : null,
        restDuration: clampNonNeg(row.rest_duration),
    };
}

/**
 * Reconstruct an Exercise snapshot from a workout_exercises or
 * template_exercises row.
 *
 * These rows store a point-in-time snapshot of the exercise's core fields
 * (name, category, muscle groups, equipment, track flags). Fields that
 * belong to the exercise *library entry* — not the snapshot — are set to
 * sensible defaults:
 *
 * - trackDistance: false (not stored on snapshot rows)
 * - isCustom / isHidden / isFavorite: false (library-level state)
 * - createdAt / updatedAt: epoch (placeholder — these are NOT real dates;
 *   we use epoch rather than `new Date()` so analytics can detect and
 *   exclude placeholder values instead of silently treating "now" as
 *   the exercise creation date)
 */
const SNAPSHOT_EPOCH = new Date(0);

export function mapExerciseRow(row: ExerciseRow): Exercise {
    return {
        id: row.exercise_id,
        name: row.exercise_name,
        category: row.exercise_category as Exercise['category'],
        muscleGroups: safeJsonParse(row.exercise_muscle_groups, []),
        equipment: safeJsonParse(row.exercise_equipment, []),
        trackWeight: row.exercise_track_weight === 1,
        trackReps: row.exercise_track_reps === 1,
        trackTime: row.exercise_track_time === 1,
        // Not stored on snapshot rows — library-level defaults
        trackDistance: false,
        isCustom: false,
        isHidden: false,
        isFavorite: false,
        createdAt: SNAPSHOT_EPOCH,
        updatedAt: SNAPSHOT_EPOCH,
    };
}

/**
 * Assemble a full Workout from pre-resolved data.
 *
 * Callers are responsible for fetching exercise rows and set rows
 * from the DB (either per-workout or batch), then passing them in.
 * This keeps the mapping logic pure and avoids N+1 queries.
 */
export function mapWorkoutRow(
    row: WorkoutRow,
    exerciseRows: ExerciseRow[],
    setsByExerciseId: Map<string, SetRow[]>,
): Workout {
    const exercises: WorkoutExercise[] = exerciseRows.map((exRow) => {
        const setRows = setsByExerciseId.get(exRow.id) || [];

        return {
            id: exRow.id,
            exerciseId: exRow.exercise_id,
            exercise: mapExerciseRow(exRow),
            orderIndex: exRow.order_index,
            sets: setRows.map(mapSetRow),
            supersetGroupId: exRow.superset_group_id ?? null,
            note: exRow.note ?? null,
        };
    });

    const mainSection: WorkoutSection = {
        id: row.id + '_main',
        type: 'main',
        exercises,
        startedAt: new Date(row.started_at),
        completedAt: row.completed_at ? new Date(row.completed_at) : null,
    };

    return {
        id: row.id,
        name: row.name,
        status: validWorkoutStatus(row.status),
        warmup: null,
        main: mainSection,
        cooldown: null,
        startedAt: new Date(row.started_at),
        completedAt: row.completed_at ? new Date(row.completed_at) : null,
        totalDuration: clampNonNeg(row.total_duration),
        location: row.location,
        note: row.note,
        templateId: row.template_id,
        totalVolume: clampNonNeg(row.total_volume),
        totalSets: clampNonNeg(row.total_sets),
        muscleGroupsWorked: safeJsonParse(row.muscle_groups_worked, []),
        dayOfWeek: row.day_of_week,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}

