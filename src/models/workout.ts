/**
 * Workout Models
 * 
 * These represent actual workout sessions - what the user logs.
 * Workouts contain sections (warmup, main, cooldown) which contain exercise instances.
 */

import { Exercise, ExerciseCategory } from './exercise';

/**
 * Set types for different training styles
 */
export type SetType =
    | 'warmup'      // Warmup set (lighter weight, not counted in volume)
    | 'working'     // Normal working set
    | 'drop'        // Drop set (immediate weight reduction)
    | 'failure'     // Set taken to failure
    | 'amrap'       // As Many Reps As Possible
    | 'rest_pause'  // Rest-pause set
    | 'super'       // Part of a superset
    | 'giant';      // Part of a giant set

/**
 * Status of a set during logging
 */
export type SetStatus =
    | 'pending'     // Not yet completed
    | 'completed'   // Marked as done
    | 'skipped';    // Skipped this set

/**
 * A single set within an exercise instance
 */
export interface WorkoutSet {
    id: string;
    orderIndex: number;     // Position in the exercise

    // Core metrics (nullable - not all sets track all metrics)
    weight: number | null;      // Weight in user's preferred unit
    reps: number | null;        // Number of reps
    duration: number | null;    // Duration in seconds (for stretches, planks)
    distance: number | null;    // Distance in user's preferred unit

    // Set metadata
    type: SetType;
    status: SetStatus;

    // RPE/RIR tracking (optional, user preference)
    rpe: number | null;         // Rate of Perceived Exertion (1-10)
    rir: number | null;         // Reps in Reserve (0-5+)

    // For ML learning - what was suggested vs actual
    suggestedWeight: number | null;
    suggestedReps: number | null;

    // Notes
    note: string | null;

    // Timing
    completedAt: Date | null;
    restDuration: number | null;  // Rest taken after this set (seconds)
}

/**
 * An exercise instance within a workout
 * This is a specific occurrence of an exercise with its sets
 */
export interface WorkoutExercise {
    id: string;
    exerciseId: string;       // Reference to Exercise definition
    exercise: Exercise;       // Denormalized for convenience
    orderIndex: number;       // Position in the section

    sets: WorkoutSet[];

    // Superset grouping (null if not in a superset)
    supersetGroupId: string | null;

    // Exercise-level notes
    note: string | null;
}

/**
 * Workout section types
 */
export type WorkoutSectionType =
    | 'warmup'      // Pre-workout warmup
    | 'main'        // Main workout
    | 'cooldown';   // Post-workout stretching/cooldown

/**
 * A section within a workout (warmup, main, cooldown)
 */
export interface WorkoutSection {
    id: string;
    type: WorkoutSectionType;
    exercises: WorkoutExercise[];

    // Section timing
    startedAt: Date | null;
    completedAt: Date | null;
}

/**
 * Workout status
 */
export type WorkoutStatus =
    | 'in_progress'   // Currently being logged
    | 'completed'     // Finished and saved
    | 'abandoned';    // Started but not finished

/**
 * A complete workout session
 */
export interface Workout {
    id: string;

    // Basic info
    name: string;               // User-editable name
    status: WorkoutStatus;

    // Sections (all optional - user can use any combination)
    warmup: WorkoutSection | null;
    main: WorkoutSection;
    cooldown: WorkoutSection | null;

    // Timing
    startedAt: Date;
    completedAt: Date | null;
    totalDuration: number | null;  // Total duration in seconds

    // Location/context (optional)
    location: string | null;       // Gym name, home, etc.

    // Overall notes
    note: string | null;

    // For template creation
    templateId: string | null;     // Created from this template

    // Calculated stats (can be recomputed)
    totalVolume: number | null;    // Total weight × reps
    totalSets: number | null;
    muscleGroupsWorked: string[];  // List of muscle groups hit

    // ML features
    dayOfWeek: number;             // 0-6, for pattern learning

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Helper to create a new workout
 */
export function createWorkout(name?: string): Workout {
    const now = new Date();
    const mainSection: WorkoutSection = {
        id: crypto.randomUUID(),
        type: 'main',
        exercises: [],
        startedAt: null,
        completedAt: null,
    };

    return {
        id: crypto.randomUUID(),
        name: name ?? `Workout ${now.toLocaleDateString()}`,
        status: 'in_progress',
        warmup: null,
        main: mainSection,
        cooldown: null,
        startedAt: now,
        completedAt: null,
        totalDuration: null,
        location: null,
        note: null,
        templateId: null,
        totalVolume: null,
        totalSets: null,
        muscleGroupsWorked: [],
        dayOfWeek: now.getDay(),
        createdAt: now,
        updatedAt: now,
    };
}

/**
 * Helper to create a new set
 */
export function createSet(orderIndex: number, type: SetType = 'working'): WorkoutSet {
    return {
        id: crypto.randomUUID(),
        orderIndex,
        weight: null,
        reps: null,
        duration: null,
        distance: null,
        type,
        status: 'pending',
        rpe: null,
        rir: null,
        suggestedWeight: null,
        suggestedReps: null,
        note: null,
        completedAt: null,
        restDuration: null,
    };
}

/**
 * Helper to create a workout exercise instance
 */
export function createWorkoutExercise(
    exercise: Exercise,
    orderIndex: number,
    initialSets: number = 3
): WorkoutExercise {
    const sets: WorkoutSet[] = Array.from({ length: initialSets }, (_, i) =>
        createSet(i, i === 0 && exercise.category === 'strength' ? 'warmup' : 'working')
    );

    return {
        id: crypto.randomUUID(),
        exerciseId: exercise.id,
        exercise,
        orderIndex,
        sets,
        supersetGroupId: null,
        note: null,
    };
}
