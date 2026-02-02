/**
 * Workout Service
 * 
 * CRUD operations for workout persistence.
 * Returns empty data when database is not available (Expo Go).
 */

import { getDatabase } from './database';
import {
    Workout,
    WorkoutExercise,
    WorkoutSet,
    WorkoutSection,
    createWorkout,
    createWorkoutExercise,
    createSet
} from '../models/workout';
import { Exercise, MuscleContribution } from '../models/exercise';

/**
 * Save a completed workout to the database
 */
export async function saveWorkout(workout: Workout): Promise<void> {
    const db = await getDatabase();
    if (!db) {
        console.log('[WorkoutService] Database not available - workout not saved (Expo Go mode)');
        return;
    }

    try {
        // Start a transaction
        await db.withTransactionAsync(async () => {
            // Insert workout
            await db.runAsync(
                `INSERT INTO workouts (
                    id, name, status, started_at, completed_at, total_duration,
                    total_volume, total_sets, muscle_groups_worked, location,
                    note, template_id, day_of_week, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    workout.id,
                    workout.name,
                    workout.status,
                    workout.startedAt.toISOString(),
                    workout.completedAt?.toISOString() ?? null,
                    workout.totalDuration,
                    workout.totalVolume,
                    workout.totalSets,
                    JSON.stringify(workout.muscleGroupsWorked),
                    workout.location,
                    workout.note,
                    workout.templateId,
                    workout.dayOfWeek,
                    workout.createdAt.toISOString(),
                    workout.updatedAt.toISOString(),
                ]
            );

            // Insert exercises
            for (const exercise of workout.main.exercises) {
                await db.runAsync(
                    `INSERT INTO workout_exercises (
                        id, workout_id, exercise_id, exercise_name, exercise_category,
                        exercise_muscle_groups, exercise_equipment, exercise_track_weight,
                        exercise_track_reps, exercise_track_time, order_index,
                        superset_group_id, note
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        exercise.id,
                        workout.id,
                        exercise.exerciseId,
                        exercise.exercise.name,
                        exercise.exercise.category,
                        JSON.stringify(exercise.exercise.muscleGroups),
                        JSON.stringify(exercise.exercise.equipment),
                        exercise.exercise.trackWeight ? 1 : 0,
                        exercise.exercise.trackReps ? 1 : 0,
                        exercise.exercise.trackTime ? 1 : 0,
                        exercise.orderIndex,
                        exercise.supersetGroupId,
                        exercise.note,
                    ]
                );

                // Insert sets
                for (const set of exercise.sets) {
                    await db.runAsync(
                        `INSERT INTO workout_sets (
                            id, workout_exercise_id, order_index, weight, reps,
                            duration, distance, type, status, rpe, rir,
                            suggested_weight, suggested_reps, note, completed_at, rest_duration
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            set.id,
                            exercise.id,
                            set.orderIndex,
                            set.weight,
                            set.reps,
                            set.duration,
                            set.distance,
                            set.type,
                            set.status,
                            set.rpe,
                            set.rir,
                            set.suggestedWeight,
                            set.suggestedReps,
                            set.note,
                            set.completedAt?.toISOString() ?? null,
                            set.restDuration,
                        ]
                    );
                }
            }
        });
        console.log('[WorkoutService] Workout saved successfully:', workout.id);
    } catch (error) {
        console.error('[WorkoutService] Failed to save workout:', error);
        throw error;
    }
}

/**
 * Get recent workouts with pagination
 * Uses optimized batch queries to avoid N+1 pattern
 */
export async function getWorkouts(limit: number = 20, offset: number = 0): Promise<Workout[]> {
    const db = await getDatabase();
    if (!db) return [];

    // Get workouts
    const workoutRows = await db.getAllAsync<any>(
        `SELECT * FROM workouts 
         ORDER BY completed_at DESC 
         LIMIT ? OFFSET ?`,
        [limit, offset]
    );

    if (workoutRows.length === 0) return [];

    // Get workout IDs for batch query
    const workoutIds = workoutRows.map(w => w.id);
    const placeholders = workoutIds.map(() => '?').join(',');

    // Batch load all exercises for these workouts
    const exerciseRows = await db.getAllAsync<any>(
        `SELECT * FROM workout_exercises 
         WHERE workout_id IN (${placeholders}) 
         ORDER BY workout_id, order_index`,
        workoutIds
    );

    // Get exercise IDs for batch query
    const exerciseIds = exerciseRows.map(e => e.id);

    // Batch load all sets for these exercises
    let setRows: any[] = [];
    if (exerciseIds.length > 0) {
        const setPlaceholders = exerciseIds.map(() => '?').join(',');
        setRows = await db.getAllAsync<any>(
            `SELECT * FROM workout_sets 
             WHERE workout_exercise_id IN (${setPlaceholders}) 
             ORDER BY workout_exercise_id, order_index`,
            exerciseIds
        );
    }

    // Group sets by exercise ID
    const setsByExercise = new Map<string, any[]>();
    for (const set of setRows) {
        const exerciseId = set.workout_exercise_id;
        if (!setsByExercise.has(exerciseId)) {
            setsByExercise.set(exerciseId, []);
        }
        setsByExercise.get(exerciseId)!.push(set);
    }

    // Group exercises by workout ID
    const exercisesByWorkout = new Map<string, any[]>();
    for (const ex of exerciseRows) {
        const workoutId = ex.workout_id;
        if (!exercisesByWorkout.has(workoutId)) {
            exercisesByWorkout.set(workoutId, []);
        }
        exercisesByWorkout.get(workoutId)!.push(ex);
    }

    // Hydrate workouts
    return workoutRows.map(row => hydrateWorkoutFromData(row, exercisesByWorkout, setsByExercise));
}

/**
 * Get a single workout by ID
 */
export async function getWorkoutById(id: string): Promise<Workout | null> {
    const db = await getDatabase();
    if (!db) return null;

    const row = await db.getFirstAsync<any>(
        `SELECT * FROM workouts WHERE id = ?`,
        [id]
    );

    if (!row) return null;

    return hydrateWorkout(row);
}

/**
 * Delete a workout
 */
export async function deleteWorkout(id: string): Promise<void> {
    const db = await getDatabase();
    if (!db) return;

    await db.runAsync(`DELETE FROM workouts WHERE id = ?`, [id]);
}

/**
 * Get workout count
 */
export async function getWorkoutCount(): Promise<number> {
    const db = await getDatabase();
    if (!db) return 0;

    const result = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM workouts`
    );
    return result?.count ?? 0;
}

/**
 * Hydrate a workout from database row
 */
async function hydrateWorkout(row: any): Promise<Workout> {
    const db = await getDatabase();
    if (!db) throw new Error('Database not available');

    // Get exercises for this workout
    const exerciseRows = await db.getAllAsync<any>(
        `SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY order_index`,
        [row.id]
    );

    const exercises: WorkoutExercise[] = [];

    for (const exRow of exerciseRows) {
        // Get sets for this exercise
        const setRows = await db.getAllAsync<any>(
            `SELECT * FROM workout_sets WHERE workout_exercise_id = ? ORDER BY order_index`,
            [exRow.id]
        );

        const sets: WorkoutSet[] = setRows.map(setRow => ({
            id: setRow.id,
            orderIndex: setRow.order_index,
            weight: setRow.weight,
            reps: setRow.reps,
            duration: setRow.duration,
            distance: setRow.distance,
            type: setRow.type,
            status: setRow.status,
            rpe: setRow.rpe,
            rir: setRow.rir,
            suggestedWeight: setRow.suggested_weight,
            suggestedReps: setRow.suggested_reps,
            note: setRow.note,
            completedAt: setRow.completed_at ? new Date(setRow.completed_at) : null,
            restDuration: setRow.rest_duration,
        }));

        // Reconstruct exercise object
        const exercise: Exercise = {
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
        };

        exercises.push({
            id: exRow.id,
            exerciseId: exRow.exercise_id,
            exercise,
            orderIndex: exRow.order_index,
            sets,
            supersetGroupId: exRow.superset_group_id,
            note: exRow.note,
        });
    }

    // Build main section
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
        status: row.status,
        warmup: null,
        main: mainSection,
        cooldown: null,
        startedAt: new Date(row.started_at),
        completedAt: row.completed_at ? new Date(row.completed_at) : null,
        totalDuration: row.total_duration,
        location: row.location,
        note: row.note,
        templateId: row.template_id,
        totalVolume: row.total_volume,
        totalSets: row.total_sets,
        muscleGroupsWorked: JSON.parse(row.muscle_groups_worked || '[]'),
        dayOfWeek: row.day_of_week,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}

/**
 * Hydrate a workout from pre-fetched data (optimized, no additional queries)
 */
function hydrateWorkoutFromData(
    row: any,
    exercisesByWorkout: Map<string, any[]>,
    setsByExercise: Map<string, any[]>
): Workout {
    const exerciseRows = exercisesByWorkout.get(row.id) || [];

    const exercises: WorkoutExercise[] = exerciseRows.map(exRow => {
        const setRows = setsByExercise.get(exRow.id) || [];

        const sets: WorkoutSet[] = setRows.map(setRow => ({
            id: setRow.id,
            orderIndex: setRow.order_index,
            weight: setRow.weight,
            reps: setRow.reps,
            duration: setRow.duration,
            distance: setRow.distance,
            type: setRow.type,
            status: setRow.status,
            rpe: setRow.rpe,
            rir: setRow.rir,
            suggestedWeight: setRow.suggested_weight,
            suggestedReps: setRow.suggested_reps,
            note: setRow.note,
            completedAt: setRow.completed_at ? new Date(setRow.completed_at) : null,
            restDuration: setRow.rest_duration,
        }));

        const exercise: Exercise = {
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
        };

        return {
            id: exRow.id,
            exerciseId: exRow.exercise_id,
            exercise,
            orderIndex: exRow.order_index,
            sets,
            supersetGroupId: exRow.superset_group_id,
            note: exRow.note,
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
        status: row.status,
        warmup: null,
        main: mainSection,
        cooldown: null,
        startedAt: new Date(row.started_at),
        completedAt: row.completed_at ? new Date(row.completed_at) : null,
        totalDuration: row.total_duration,
        location: row.location,
        note: row.note,
        templateId: row.template_id,
        totalVolume: row.total_volume,
        totalSets: row.total_sets,
        muscleGroupsWorked: JSON.parse(row.muscle_groups_worked || '[]'),
        dayOfWeek: row.day_of_week,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}

export default {
    saveWorkout,
    getWorkouts,
    getWorkoutById,
    deleteWorkout,
    getWorkoutCount,
};

