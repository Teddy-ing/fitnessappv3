/**
 * Exercise Models
 * 
 * These represent the exercise library - the catalog of available exercises
 * that users can add to their workouts.
 */

/**
 * Primary muscle groups
 */
export type MuscleGroup =
    | 'chest'
    | 'back'
    | 'shoulders'
    | 'biceps'
    | 'triceps'
    | 'forearms'
    | 'core'
    | 'quads'
    | 'hamstrings'
    | 'glutes'
    | 'calves'
    | 'traps'
    | 'lats'
    | 'neck'
    | 'hip_flexors'
    | 'adductors'
    | 'abductors'
    | 'full_body';

/**
 * Equipment types
 */
export type Equipment =
    | 'barbell'
    | 'dumbbell'
    | 'kettlebell'
    | 'cable'
    | 'machine'
    | 'smith_machine'
    | 'bodyweight'
    | 'resistance_band'
    | 'ez_bar'
    | 'trap_bar'
    | 'pull_up_bar'
    | 'dip_bars'
    | 'bench'
    | 'foam_roller'
    | 'yoga_mat'
    | 'other'
    | 'none';

/**
 * Exercise categories
 */
export type ExerciseCategory =
    | 'strength'      // Traditional weight training
    | 'cardio'        // Cardio exercises
    | 'stretch'       // Static stretches (time-based)
    | 'mobility'      // Dynamic mobility work
    | 'warmup'        // Warmup movements
    | 'plyometric'    // Explosive movements
    | 'isometric';    // Holds (planks, wall sits)

/**
 * Muscle group contribution to an exercise
 * Allows weighted distribution (e.g., bench press: chest 60%, triceps 25%, shoulders 15%)
 */
export interface MuscleContribution {
    muscle: MuscleGroup;
    contribution: number; // 0-100, should sum to 100 for an exercise
    isPrimary: boolean;   // Is this a primary mover?
}

/**
 * Exercise definition - the template for an exercise
 * This is from the exercise library, not a specific instance in a workout
 */
export interface Exercise {
    id: string;
    name: string;
    category: ExerciseCategory;
    muscleGroups: MuscleContribution[];
    equipment: Equipment[];

    // Optional metadata
    description?: string;
    instructions?: string[];
    imageUrl?: string;
    videoUrl?: string;

    // Tracking configuration
    trackWeight: boolean;     // Should we track weight?
    trackReps: boolean;       // Should we track reps?
    trackTime: boolean;       // Should we track time/duration?
    trackDistance: boolean;   // Should we track distance?

    // User customization
    isCustom: boolean;        // User-created exercise?
    isHidden: boolean;        // Hidden from exercise picker?
    isFavorite: boolean;      // Favorited for quick access?

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Helper to create a default exercise
 */
export function createExercise(partial: Partial<Exercise> & { name: string }): Exercise {
    const now = new Date();
    return {
        id: crypto.randomUUID(),
        category: 'strength',
        muscleGroups: [],
        equipment: ['none'],
        trackWeight: true,
        trackReps: true,
        trackTime: false,
        trackDistance: false,
        isCustom: false,
        isHidden: false,
        isFavorite: false,
        createdAt: now,
        updatedAt: now,
        ...partial,  // Spread last to allow overrides
    };
}

