/**
 * Template Service
 * 
 * CRUD operations for workout templates.
 * Returns empty data when database is not available (Expo Go).
 */

import * as Crypto from 'expo-crypto';
import { getDatabase } from './database';
import {
    Workout,
    WorkoutExercise,
    WorkoutSection,
    createWorkout,
    createWorkoutExercise,
    createSet
} from '../models/workout';
import { Exercise } from '../models/exercise';

/**
 * Template type for the UI
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

export interface TemplateExercise {
    id: string;
    exercise: Exercise;
    orderIndex: number;
    defaultSets: number;
    note: string | null;
}

/**
 * Create a template from a completed workout
 */
export async function createTemplateFromWorkout(
    workout: Workout,
    name: string,
    description?: string
): Promise<Template | null> {
    const db = await getDatabase();
    if (!db) {
        console.log('Database not available - template not saved (Expo Go mode)');
        return null;
    }

    const templateId = Crypto.randomUUID();
    const now = new Date();

    await db.withTransactionAsync(async () => {
        // Insert template
        await db.runAsync(
            `INSERT INTO templates (id, name, description, last_used_at, use_count, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [templateId, name, description ?? null, null, 0, now.toISOString(), now.toISOString()]
        );

        // Insert template exercises
        for (const workoutExercise of workout.main.exercises) {
            const exerciseId = Crypto.randomUUID();
            await db.runAsync(
                `INSERT INTO template_exercises (
                    id, template_id, exercise_id, exercise_name, exercise_category,
                    exercise_muscle_groups, exercise_equipment, exercise_track_weight,
                    exercise_track_reps, exercise_track_time, order_index, default_sets, note
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    exerciseId,
                    templateId,
                    workoutExercise.exerciseId,
                    workoutExercise.exercise.name,
                    workoutExercise.exercise.category,
                    JSON.stringify(workoutExercise.exercise.muscleGroups),
                    JSON.stringify(workoutExercise.exercise.equipment),
                    workoutExercise.exercise.trackWeight ? 1 : 0,
                    workoutExercise.exercise.trackReps ? 1 : 0,
                    workoutExercise.exercise.trackTime ? 1 : 0,
                    workoutExercise.orderIndex,
                    workoutExercise.sets.length,
                    workoutExercise.note,
                ]
            );
        }
    });

    // Return the created template
    return {
        id: templateId,
        name,
        description: description ?? null,
        exerciseCount: workout.main.exercises.length,
        exercises: workout.main.exercises.map((we, index) => ({
            id: Crypto.randomUUID(),
            exercise: we.exercise,
            orderIndex: index,
            defaultSets: we.sets.length,
            note: we.note,
        })),
        lastUsedAt: null,
        useCount: 0,
        isFavorite: false,
        createdAt: now,
        updatedAt: now,
    };
}

/**
 * Get all templates
 */
export async function getTemplates(): Promise<Template[]> {
    const db = await getDatabase();
    if (!db) return [];

    const templateRows = await db.getAllAsync<any>(
        `SELECT * FROM templates ORDER BY last_used_at DESC NULLS LAST, created_at DESC`
    );

    const templates: Template[] = [];

    for (const row of templateRows) {
        const template = await hydrateTemplate(row);
        templates.push(template);
    }

    return templates;
}

/**
 * Get a single template by ID
 */
export async function getTemplateById(id: string): Promise<Template | null> {
    const db = await getDatabase();
    if (!db) return null;

    const row = await db.getFirstAsync<any>(
        `SELECT * FROM templates WHERE id = ?`,
        [id]
    );

    if (!row) return null;

    return hydrateTemplate(row);
}

/**
 * Delete a template
 */
export async function deleteTemplate(id: string): Promise<void> {
    const db = await getDatabase();
    if (!db) return;

    await db.runAsync(`DELETE FROM templates WHERE id = ?`, [id]);
}

/**
 * Find a template that matches the workout's exercises (by exercise IDs, order-independent)
 * Used to avoid prompting to save a template when exercises are identical
 */
export async function findMatchingTemplate(workout: Workout): Promise<Template | null> {
    const templates = await getTemplates();
    if (templates.length === 0) return null;

    // Get exercise IDs from workout (sorted for comparison)
    const workoutExerciseIds = workout.main.exercises
        .map(we => we.exerciseId)
        .sort();

    // Find a template with exactly the same exercises
    for (const template of templates) {
        const templateExerciseIds = template.exercises
            .map(te => te.exercise.id)
            .sort();

        // Check if same length and same IDs
        if (workoutExerciseIds.length === templateExerciseIds.length &&
            workoutExerciseIds.every((id, idx) => id === templateExerciseIds[idx])) {
            return template;
        }
    }

    return null;
}

/**
 * Find a template by exact name (case-insensitive)
 */
export async function findTemplateByName(name: string): Promise<Template | null> {
    const db = await getDatabase();
    if (!db) return null;

    const row = await db.getFirstAsync<any>(
        `SELECT * FROM templates WHERE LOWER(name) = LOWER(?)`,
        [name.trim()]
    );

    if (!row) return null;
    return hydrateTemplate(row);
}

/**
 * Find ALL templates with a given name (case-insensitive)
 * Used when multiple templates can have the same name
 */
export async function findTemplatesByName(name: string): Promise<Template[]> {
    const db = await getDatabase();
    if (!db) return [];

    const rows = await db.getAllAsync<any>(
        `SELECT * FROM templates WHERE LOWER(name) = LOWER(?)`,
        [name.trim()]
    );

    const templates: Template[] = [];
    for (const row of rows) {
        templates.push(await hydrateTemplate(row));
    }
    return templates;
}

/**
 * Overwrite an existing template with new exercises from a workout
 * Preserves the template ID so it stays in any splits that reference it
 */
export async function overwriteTemplate(
    existingTemplateId: string,
    workout: Workout,
    name: string,
    description?: string
): Promise<Template | null> {
    const db = await getDatabase();
    if (!db) return null;

    const now = new Date();

    await db.withTransactionAsync(async () => {
        // Update template metadata
        await db.runAsync(
            `UPDATE templates SET name = ?, description = ?, updated_at = ? WHERE id = ?`,
            [name, description ?? null, now.toISOString(), existingTemplateId]
        );

        // Delete old exercises
        await db.runAsync(
            `DELETE FROM template_exercises WHERE template_id = ?`,
            [existingTemplateId]
        );

        // Insert new exercises from workout
        for (const workoutExercise of workout.main.exercises) {
            const exerciseId = Crypto.randomUUID();
            await db.runAsync(
                `INSERT INTO template_exercises (
                    id, template_id, exercise_id, exercise_name, exercise_category,
                    exercise_muscle_groups, exercise_equipment, exercise_track_weight,
                    exercise_track_reps, exercise_track_time, order_index, default_sets, note
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    exerciseId,
                    existingTemplateId,
                    workoutExercise.exerciseId,
                    workoutExercise.exercise.name,
                    workoutExercise.exercise.category,
                    JSON.stringify(workoutExercise.exercise.muscleGroups),
                    JSON.stringify(workoutExercise.exercise.equipment),
                    workoutExercise.exercise.trackWeight ? 1 : 0,
                    workoutExercise.exercise.trackReps ? 1 : 0,
                    workoutExercise.exercise.trackTime ? 1 : 0,
                    workoutExercise.orderIndex,
                    workoutExercise.sets.length,
                    workoutExercise.note,
                ]
            );
        }
    });

    // Return updated template
    return getTemplateById(existingTemplateId);
}

/**
 * Update a template's name and exercises directly
 * Used by the template edit screen
 */
export async function updateTemplate(
    templateId: string,
    name: string,
    exercises: Array<{ exercise: Exercise; defaultSets: number }>
): Promise<Template | null> {
    const db = await getDatabase();
    if (!db) return null;

    const now = new Date();

    await db.withTransactionAsync(async () => {
        // Update template metadata
        await db.runAsync(
            `UPDATE templates SET name = ?, updated_at = ? WHERE id = ?`,
            [name, now.toISOString(), templateId]
        );

        // Delete old exercises
        await db.runAsync(
            `DELETE FROM template_exercises WHERE template_id = ?`,
            [templateId]
        );

        // Insert new exercises
        for (let i = 0; i < exercises.length; i++) {
            const { exercise, defaultSets } = exercises[i];
            const exerciseId = Crypto.randomUUID();
            await db.runAsync(
                `INSERT INTO template_exercises (
                    id, template_id, exercise_id, exercise_name, exercise_category,
                    exercise_muscle_groups, exercise_equipment, exercise_track_weight,
                    exercise_track_reps, exercise_track_time, order_index, default_sets, note
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    exerciseId,
                    templateId,
                    exercise.id,
                    exercise.name,
                    exercise.category,
                    JSON.stringify(exercise.muscleGroups),
                    JSON.stringify(exercise.equipment),
                    exercise.trackWeight ? 1 : 0,
                    exercise.trackReps ? 1 : 0,
                    exercise.trackTime ? 1 : 0,
                    i,
                    defaultSets,
                    null,
                ]
            );
        }
    });

    // Return updated template
    return getTemplateById(templateId);
}

/**
 * Start a new workout from a template
 */
export async function startWorkoutFromTemplate(templateId: string): Promise<Workout | null> {
    const template = await getTemplateById(templateId);
    if (!template) return null;

    const db = await getDatabase();
    const now = new Date();

    // Update template usage stats (only if db available)
    if (db) {
        await db.runAsync(
            `UPDATE templates SET last_used_at = ?, use_count = use_count + 1, updated_at = ? WHERE id = ?`,
            [now.toISOString(), now.toISOString(), templateId]
        );
    }

    // Create a new workout
    const workout = createWorkout(template.name);
    workout.templateId = templateId;

    // Add exercises from template
    for (const templateExercise of template.exercises) {
        const workoutExercise = createWorkoutExercise(
            templateExercise.exercise,
            templateExercise.orderIndex,
            templateExercise.defaultSets
        );
        workoutExercise.note = templateExercise.note;
        workout.main.exercises.push(workoutExercise);
    }

    return workout;
}

/**
 * Hydrate a template from database row
 */
async function hydrateTemplate(row: any): Promise<Template> {
    const db = await getDatabase();
    if (!db) throw new Error('Database not available');

    // Get exercises for this template
    const exerciseRows = await db.getAllAsync<any>(
        `SELECT * FROM template_exercises WHERE template_id = ? ORDER BY order_index`,
        [row.id]
    );

    const exercises: TemplateExercise[] = exerciseRows.map(exRow => ({
        id: exRow.id,
        exercise: {
            id: exRow.exercise_id,
            name: exRow.exercise_name,
            category: exRow.exercise_category,
            muscleGroups: JSON.parse(exRow.exercise_muscle_groups || '[]'),
            equipment: JSON.parse(exRow.exercise_equipment || '[]'),
            trackWeight: exRow.exercise_track_weight === 1,
            trackReps: exRow.exercise_track_reps === 1,
            trackTime: exRow.exercise_track_time === 1,
            trackDistance: false,
            isCustom: false,
            isHidden: false,
            isFavorite: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        orderIndex: exRow.order_index,
        defaultSets: exRow.default_sets,
        note: exRow.note,
    }));

    return {
        id: row.id,
        name: row.name,
        description: row.description,
        exerciseCount: exercises.length,
        exercises,
        lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : null,
        useCount: row.use_count,
        isFavorite: row.is_favorite === 1,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}

/**
 * Toggle the favorite status of a template
 */
export async function toggleTemplateFavorite(templateId: string): Promise<boolean> {
    const db = await getDatabase();
    if (!db) return false;

    await db.runAsync(
        `UPDATE templates SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END WHERE id = ?`,
        [templateId]
    );

    const result = await db.getFirstAsync<{ is_favorite: number }>(
        `SELECT is_favorite FROM templates WHERE id = ?`,
        [templateId]
    );
    return result?.is_favorite === 1;
}

export default {
    createTemplateFromWorkout,
    getTemplates,
    getTemplateById,
    deleteTemplate,
    findMatchingTemplate,
    findTemplateByName,
    findTemplatesByName,
    overwriteTemplate,
    updateTemplate,
    toggleTemplateFavorite,
    startWorkoutFromTemplate,
};
