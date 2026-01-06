/**
 * Template Service
 * 
 * CRUD operations for workout templates.
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
): Promise<Template> {
    const db = await getDatabase();
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
        createdAt: now,
        updatedAt: now,
    };
}

/**
 * Get all templates
 */
export async function getTemplates(): Promise<Template[]> {
    const db = await getDatabase();

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
    await db.runAsync(`DELETE FROM templates WHERE id = ?`, [id]);
}

/**
 * Start a new workout from a template
 */
export async function startWorkoutFromTemplate(templateId: string): Promise<Workout | null> {
    const template = await getTemplateById(templateId);
    if (!template) return null;

    const db = await getDatabase();
    const now = new Date();

    // Update template usage stats
    await db.runAsync(
        `UPDATE templates SET last_used_at = ?, use_count = use_count + 1, updated_at = ? WHERE id = ?`,
        [now.toISOString(), now.toISOString(), templateId]
    );

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
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}

export default {
    createTemplateFromWorkout,
    getTemplates,
    getTemplateById,
    deleteTemplate,
    startWorkoutFromTemplate,
};
