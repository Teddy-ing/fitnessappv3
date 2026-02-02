/**
 * Exercise Service
 * 
 * Manages exercise library - both built-in and custom user exercises.
 * Built-in exercises are loaded from seed data, custom exercises are stored in DB.
 */

import { getDatabase } from './database';
import { Exercise, ExerciseCategory, MuscleGroup, Equipment, MuscleContribution, createExercise } from '../models/exercise';
import { SEED_EXERCISES } from '../data/exercises';
import * as Crypto from 'expo-crypto';

// Cache for built-in exercise hidden/favorite states
interface ExerciseOverrides {
    isHidden: boolean;
    isFavorite: boolean;
}

/**
 * Get all exercises (built-in + custom), optionally including hidden
 */
export async function getExercises(includeHidden: boolean = false): Promise<Exercise[]> {
    const db = await getDatabase();

    // Start with built-in exercises
    let exercises = [...SEED_EXERCISES];

    // Get custom exercises from database
    if (db) {
        const customRows = await db.getAllAsync<{
            id: string;
            name: string;
            category: string;
            muscle_groups: string | null;
            equipment: string | null;
            description: string | null;
            instructions: string | null;
            image_path: string | null;
            track_weight: number;
            track_reps: number;
            track_time: number;
            track_distance: number;
            is_custom: number;
            is_hidden: number;
            is_favorite: number;
            notes: string | null;
            created_at: string;
            updated_at: string;
        }>(`SELECT * FROM exercises WHERE is_custom = 1`);

        const customExercises = customRows.map(row => hydrateExercise(row));
        exercises = [...exercises, ...customExercises];

        // Get override states for built-in exercises (hidden/favorite)
        const overrideRows = await db.getAllAsync<{
            id: string;
            is_hidden: number;
            is_favorite: number;
        }>(`SELECT id, is_hidden, is_favorite FROM exercises WHERE is_custom = 0`);

        const overrides = new Map<string, ExerciseOverrides>();
        overrideRows.forEach(row => {
            overrides.set(row.id, {
                isHidden: row.is_hidden === 1,
                isFavorite: row.is_favorite === 1,
            });
        });

        // Apply overrides to built-in exercises
        exercises = exercises.map(ex => {
            if (!ex.isCustom && overrides.has(ex.id)) {
                const override = overrides.get(ex.id)!;
                return { ...ex, isHidden: override.isHidden, isFavorite: override.isFavorite };
            }
            return ex;
        });
    }

    // Filter hidden if requested
    if (!includeHidden) {
        exercises = exercises.filter(ex => !ex.isHidden);
    }

    // Sort: favorites first, then alphabetically
    exercises.sort((a, b) => {
        if (a.isFavorite !== b.isFavorite) return b.isFavorite ? 1 : -1;
        return a.name.localeCompare(b.name);
    });

    return exercises;
}

/**
 * Get a single exercise by ID
 */
export async function getExerciseById(id: string): Promise<Exercise | null> {
    // Check built-in first
    const builtIn = SEED_EXERCISES.find(ex => ex.id === id);
    if (builtIn) {
        // Check for overrides in DB
        const db = await getDatabase();
        if (db) {
            const override = await db.getFirstAsync<{ is_hidden: number; is_favorite: number }>(
                `SELECT is_hidden, is_favorite FROM exercises WHERE id = ?`,
                [id]
            );
            if (override) {
                return { ...builtIn, isHidden: override.is_hidden === 1, isFavorite: override.is_favorite === 1 };
            }
        }
        return builtIn;
    }

    // Check custom exercises
    const db = await getDatabase();
    if (!db) return null;

    const row = await db.getFirstAsync<any>(
        `SELECT * FROM exercises WHERE id = ?`,
        [id]
    );

    return row ? hydrateExercise(row) : null;
}

/**
 * Create a new custom exercise
 */
export async function createCustomExercise(
    name: string,
    category: ExerciseCategory,
    primaryMuscles: MuscleGroup[],
    equipment: Equipment[],
    options?: {
        description?: string;
        imagePath?: string;
        trackWeight?: boolean;
        trackReps?: boolean;
        trackTime?: boolean;
        trackDistance?: boolean;
    }
): Promise<Exercise | null> {
    const db = await getDatabase();
    if (!db) return null;

    const id = Crypto.randomUUID();
    const now = new Date();

    const muscleGroups: MuscleContribution[] = primaryMuscles.map(muscle => ({
        muscle,
        contribution: Math.floor(100 / primaryMuscles.length),
        isPrimary: true,
    }));

    const trackWeight = options?.trackWeight ?? (category === 'strength');
    const trackReps = options?.trackReps ?? (category !== 'cardio');
    const trackTime = options?.trackTime ?? (category === 'stretch' || category === 'isometric' || category === 'cardio');
    const trackDistance = options?.trackDistance ?? (category === 'cardio');

    await db.runAsync(
        `INSERT INTO exercises (
            id, name, category, muscle_groups, equipment, description, image_path,
            track_weight, track_reps, track_time, track_distance,
            is_custom, is_hidden, is_favorite, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0, ?, ?)`,
        [
            id, name, category,
            JSON.stringify(muscleGroups),
            JSON.stringify(equipment),
            options?.description ?? null,
            options?.imagePath ?? null,
            trackWeight ? 1 : 0,
            trackReps ? 1 : 0,
            trackTime ? 1 : 0,
            trackDistance ? 1 : 0,
            now.toISOString(),
            now.toISOString(),
        ]
    );

    return getExerciseById(id);
}

/**
 * Update a custom exercise
 */
export async function updateExercise(
    id: string,
    updates: Partial<{
        name: string;
        category: ExerciseCategory;
        muscleGroups: MuscleContribution[];
        equipment: Equipment[];
        description: string;
        imagePath: string;
        trackWeight: boolean;
        trackReps: boolean;
        trackTime: boolean;
        trackDistance: boolean;
    }>
): Promise<Exercise | null> {
    const db = await getDatabase();
    if (!db) return null;

    const existing = await getExerciseById(id);
    if (!existing || !existing.isCustom) return null; // Can't update built-in

    const now = new Date();

    await db.runAsync(
        `UPDATE exercises SET
            name = COALESCE(?, name),
            category = COALESCE(?, category),
            muscle_groups = COALESCE(?, muscle_groups),
            equipment = COALESCE(?, equipment),
            description = COALESCE(?, description),
            image_path = COALESCE(?, image_path),
            track_weight = COALESCE(?, track_weight),
            track_reps = COALESCE(?, track_reps),
            track_time = COALESCE(?, track_time),
            track_distance = COALESCE(?, track_distance),
            updated_at = ?
        WHERE id = ?`,
        [
            updates.name ?? null,
            updates.category ?? null,
            updates.muscleGroups ? JSON.stringify(updates.muscleGroups) : null,
            updates.equipment ? JSON.stringify(updates.equipment) : null,
            updates.description ?? null,
            updates.imagePath ?? null,
            updates.trackWeight !== undefined ? (updates.trackWeight ? 1 : 0) : null,
            updates.trackReps !== undefined ? (updates.trackReps ? 1 : 0) : null,
            updates.trackTime !== undefined ? (updates.trackTime ? 1 : 0) : null,
            updates.trackDistance !== undefined ? (updates.trackDistance ? 1 : 0) : null,
            now.toISOString(),
            id,
        ]
    );

    return getExerciseById(id);
}

/**
 * Delete a custom exercise
 */
export async function deleteExercise(id: string): Promise<boolean> {
    const db = await getDatabase();
    if (!db) return false;

    const existing = await getExerciseById(id);
    if (!existing || !existing.isCustom) return false; // Can't delete built-in

    await db.runAsync(`DELETE FROM exercises WHERE id = ?`, [id]);
    return true;
}

/**
 * Toggle hidden state of an exercise (works for both built-in and custom)
 */
export async function toggleExerciseHidden(id: string): Promise<boolean> {
    const db = await getDatabase();
    if (!db) return false;

    const existing = await getExerciseById(id);
    if (!existing) return false;

    if (existing.isCustom) {
        // Custom exercise - update directly
        await db.runAsync(
            `UPDATE exercises SET is_hidden = ? WHERE id = ?`,
            [existing.isHidden ? 0 : 1, id]
        );
    } else {
        // Built-in exercise - create/update override row
        const overrideExists = await db.getFirstAsync(
            `SELECT id FROM exercises WHERE id = ?`,
            [id]
        );

        if (overrideExists) {
            await db.runAsync(
                `UPDATE exercises SET is_hidden = ? WHERE id = ?`,
                [existing.isHidden ? 0 : 1, id]
            );
        } else {
            const now = new Date().toISOString();
            await db.runAsync(
                `INSERT INTO exercises (id, name, category, is_custom, is_hidden, is_favorite, created_at, updated_at)
                VALUES (?, ?, ?, 0, 1, 0, ?, ?)`,
                [id, existing.name, existing.category, now, now]
            );
        }
    }

    return !existing.isHidden;
}

/**
 * Toggle favorite state of an exercise (works for both built-in and custom)
 */
export async function toggleExerciseFavorite(id: string): Promise<boolean> {
    const db = await getDatabase();
    if (!db) return false;

    const existing = await getExerciseById(id);
    if (!existing) return false;

    if (existing.isCustom) {
        // Custom exercise - update directly
        await db.runAsync(
            `UPDATE exercises SET is_favorite = ? WHERE id = ?`,
            [existing.isFavorite ? 0 : 1, id]
        );
    } else {
        // Built-in exercise - create/update override row
        const overrideExists = await db.getFirstAsync(
            `SELECT id FROM exercises WHERE id = ?`,
            [id]
        );

        if (overrideExists) {
            await db.runAsync(
                `UPDATE exercises SET is_favorite = ? WHERE id = ?`,
                [existing.isFavorite ? 0 : 1, id]
            );
        } else {
            const now = new Date().toISOString();
            await db.runAsync(
                `INSERT INTO exercises (id, name, category, is_custom, is_hidden, is_favorite, created_at, updated_at)
                VALUES (?, ?, ?, 0, 0, 1, ?, ?)`,
                [id, existing.name, existing.category, now, now]
            );
        }
    }

    return !existing.isFavorite;
}

/**
 * Get exercises by category
 */
export async function getExercisesByCategory(
    category: ExerciseCategory,
    includeHidden: boolean = false
): Promise<Exercise[]> {
    const all = await getExercises(includeHidden);
    return all.filter(ex => ex.category === category);
}

/**
 * Search exercises by name
 */
export async function searchExercises(
    query: string,
    includeHidden: boolean = false
): Promise<Exercise[]> {
    const all = await getExercises(includeHidden);
    const lowerQuery = query.toLowerCase();
    return all.filter(ex => ex.name.toLowerCase().includes(lowerQuery));
}

// Helper to hydrate an exercise from DB row
function hydrateExercise(row: any): Exercise {
    return {
        id: row.id,
        name: row.name,
        category: row.category as ExerciseCategory,
        muscleGroups: row.muscle_groups ? JSON.parse(row.muscle_groups) : [],
        equipment: row.equipment ? JSON.parse(row.equipment) : ['none'],
        description: row.description,
        instructions: row.instructions ? JSON.parse(row.instructions) : undefined,
        imageUrl: row.image_path,
        trackWeight: row.track_weight === 1,
        trackReps: row.track_reps === 1,
        trackTime: row.track_time === 1,
        trackDistance: row.track_distance === 1,
        isCustom: row.is_custom === 1,
        isHidden: row.is_hidden === 1,
        isFavorite: row.is_favorite === 1,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}

export default {
    getExercises,
    getExerciseById,
    createCustomExercise,
    updateExercise,
    deleteExercise,
    toggleExerciseHidden,
    toggleExerciseFavorite,
    getExercisesByCategory,
    searchExercises,
};
