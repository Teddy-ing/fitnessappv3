/**
 * Template Models
 * 
 * Templates are reusable workout blueprints.
 * Users can create templates from past workouts or build them from scratch.
 */

import { Exercise, ExerciseCategory } from './exercise';
import { SetType, WorkoutSectionType } from './workout';

/**
 * A set within a template (target values, not actual logged values)
 */
export interface TemplateSet {
    id: string;
    orderIndex: number;

    // Target values (what we aim for)
    targetWeight: number | null;    // Can be null for "use last weight"
    targetReps: number | null;      // Target rep count
    targetDuration: number | null;  // For timed exercises
    targetRpe: number | null;       // Target RPE

    // Set configuration
    type: SetType;

    // Rep range (alternative to fixed target)
    minReps: number | null;
    maxReps: number | null;

    // Use last workout's values?
    useLastWeight: boolean;
    useLastReps: boolean;
}

/**
 * An exercise within a template
 */
export interface TemplateExercise {
    id: string;
    exerciseId: string;
    exercise: Exercise;       // Denormalized for convenience
    orderIndex: number;

    sets: TemplateSet[];

    // Superset grouping
    supersetGroupId: string | null;

    // Rest time configuration
    restBetweenSets: number | null;  // Default rest time in seconds

    // Notes/instructions for this exercise
    note: string | null;
}

/**
 * A section within a template
 */
export interface TemplateSection {
    id: string;
    type: WorkoutSectionType;
    exercises: TemplateExercise[];
}

/**
 * Template categories for organization
 */
export type TemplateCategory =
    | 'push'
    | 'pull'
    | 'legs'
    | 'upper'
    | 'lower'
    | 'full_body'
    | 'chest'
    | 'back'
    | 'shoulders'
    | 'arms'
    | 'core'
    | 'cardio'
    | 'mobility'
    | 'custom';

/**
 * A workout template
 */
export interface Template {
    id: string;
    name: string;
    description: string | null;

    // Organization
    category: TemplateCategory;
    tags: string[];

    // Sections
    warmup: TemplateSection | null;
    main: TemplateSection;
    cooldown: TemplateSection | null;

    // Template metadata
    estimatedDuration: number | null;  // Estimated minutes
    difficulty: 'beginner' | 'intermediate' | 'advanced' | null;

    // Source
    isBuiltIn: boolean;        // Shipped with app
    isCustom: boolean;         // User created
    sourceWorkoutId: string | null;  // Created from this workout

    // User preferences
    isFavorite: boolean;
    lastUsedAt: Date | null;
    timesUsed: number;

    // Scheduling (for suggested workouts feature)
    preferredDays: number[];   // 0-6, days this is typically done

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Helper to create a new template
 */
export function createTemplate(name: string): Template {
    const now = new Date();
    const mainSection: TemplateSection = {
        id: crypto.randomUUID(),
        type: 'main',
        exercises: [],
    };

    return {
        id: crypto.randomUUID(),
        name,
        description: null,
        category: 'custom',
        tags: [],
        warmup: null,
        main: mainSection,
        cooldown: null,
        estimatedDuration: null,
        difficulty: null,
        isBuiltIn: false,
        isCustom: true,
        sourceWorkoutId: null,
        isFavorite: false,
        lastUsedAt: null,
        timesUsed: 0,
        preferredDays: [],
        createdAt: now,
        updatedAt: now,
    };
}

/**
 * Helper to create a template set
 */
export function createTemplateSet(
    orderIndex: number,
    type: SetType = 'working'
): TemplateSet {
    return {
        id: crypto.randomUUID(),
        orderIndex,
        targetWeight: null,
        targetReps: null,
        targetDuration: null,
        targetRpe: null,
        type,
        minReps: null,
        maxReps: null,
        useLastWeight: true,  // Default to using last workout's weight
        useLastReps: false,
    };
}

/**
 * Famous/popular templates that could be included
 */
export type BuiltInTemplate =
    | 'ppl_push'          // Push Pull Legs - Push
    | 'ppl_pull'          // Push Pull Legs - Pull
    | 'ppl_legs'          // Push Pull Legs - Legs
    | 'upper_lower_upper' // Upper/Lower split
    | 'upper_lower_lower'
    | 'full_body_a'       // Full body A/B
    | 'full_body_b'
    | 'bro_chest'         // Bro split days
    | 'bro_back'
    | 'bro_shoulders'
    | 'bro_arms'
    | 'bro_legs'
    | 'starting_strength' // Popular programs
    | 'stronglifts_a'
    | 'stronglifts_b'
    | '531_main'          // 5/3/1
    | 'gzclp'             // GZCLP
    | 'quick_warmup'      // Utility templates
    | 'full_stretch';
