/**
 * Template Models
 *
 * Canonical types for workout templates.
 * Templates are reusable workout blueprints that define which exercises
 * to perform and how many sets to do.
 *
 * These are the runtime types used across the app. Service files import
 * from here; UI components import via barrel re-exports.
 */

import { Exercise } from './exercise';

/**
 * A workout template — the shape returned by templateService queries
 * and consumed by all UI components.
 */
export interface Template {
    id: string;
    name: string;
    description: string | null;
    exerciseCount: number;
    exercises: TemplateExercise[];
    lastUsedAt: Date | null;
    useCount: number;
    isFavorite: boolean;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * An exercise within a template, with its default set count.
 */
export interface TemplateExercise {
    id: string;
    exercise: Exercise;
    orderIndex: number;
    defaultSets: number;
    note: string | null;
}
