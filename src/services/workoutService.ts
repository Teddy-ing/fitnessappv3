/**
 * Workout Service
 * 
 * CRUD operations for workout persistence.
 * Returns empty data when database is not available (Expo Go).
 */

import { getDatabase } from './database';
import { refreshAllGoalProgress } from './goalProgressService';
import { toLocalISOString } from '../utils/localDate';
import {
    Workout,
    WorkoutExercise,
    WorkoutSet,
    WorkoutSection,
    SetType,
    PreviousSetData,
    createWorkout,
    createWorkoutExercise,
    createSet
} from '../models/workout';
import { Exercise, MuscleContribution } from '../models/exercise';
import {
    mapWorkoutRow,
    ExerciseRow,
    SetRow,
    WorkoutRow,
} from './hydration';
import { batchGetAll } from '../utils/batchQuery';
import { Goal } from '../models/goal';

/**
 * Save a completed workout to the database.
 * Returns any goals that were completed as a result of this workout.
 */
export async function saveWorkout(workout: Workout): Promise<Goal[]> {
    const db = await getDatabase();
    if (!db) {
        console.log('[WorkoutService] Database not available - workout not saved (Expo Go mode)');
        return [];
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
                    toLocalISOString(workout.startedAt),
                    workout.completedAt ? toLocalISOString(workout.completedAt) : null,
                    workout.totalDuration,
                    workout.totalVolume,
                    workout.totalSets,
                    JSON.stringify(workout.muscleGroupsWorked),
                    workout.location,
                    workout.note,
                    workout.templateId,
                    workout.dayOfWeek,
                    toLocalISOString(workout.createdAt),
                    toLocalISOString(workout.updatedAt),
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
                            set.completedAt ? toLocalISOString(set.completedAt) : null,
                            set.restDuration,
                        ]
                    );
                }
            }
        });
        console.log('[WorkoutService] Workout saved successfully:', workout.id);

        // Refresh goal progress and return any newly completed goals
        try {
            const completedGoals = await refreshAllGoalProgress();
            return completedGoals;
        } catch (err) {
            console.warn('[WorkoutService] Goal refresh failed:', err);
            return [];
        }
    } catch (error) {
        console.error('[WorkoutService] Failed to save workout:', error);
        throw error;
    }
}

/**
 * Update an existing workout (delete old data, then re-insert).
 * Used when editing a historical workout from the calendar.
 * Returns any goals that were completed as a result of this update.
 */
export async function updateWorkout(workout: Workout): Promise<Goal[]> {
    const db = await getDatabase();
    if (!db) {
        console.log('[WorkoutService] Database not available - workout not updated (Expo Go mode)');
        return [];
    }

    try {
        await db.withTransactionAsync(async () => {
            // TD-023 fix: UPDATE the parent workouts row in place.
            // This preserves FK references from personal_records and any
            // future child tables that reference workouts(id).
            await db.runAsync(
                `UPDATE workouts SET
                    name = ?, status = ?, started_at = ?, completed_at = ?,
                    total_duration = ?, total_volume = ?, total_sets = ?,
                    muscle_groups_worked = ?, location = ?, note = ?,
                    template_id = ?, day_of_week = ?, updated_at = ?
                 WHERE id = ?`,
                [
                    workout.name,
                    workout.status,
                    toLocalISOString(workout.startedAt),
                    workout.completedAt ? toLocalISOString(workout.completedAt) : null,
                    workout.totalDuration,
                    workout.totalVolume,
                    workout.totalSets,
                    JSON.stringify(workout.muscleGroupsWorked),
                    workout.location,
                    workout.note,
                    workout.templateId,
                    workout.dayOfWeek,
                    toLocalISOString(workout.updatedAt),
                    workout.id,
                ],
            );

            // Delete-reinsert children (exercises/sets).
            // This is acceptable because exercise/set IDs are ephemeral
            // and no external tables reference them via FK.
            await db.runAsync(
                `DELETE FROM workout_sets WHERE workout_exercise_id IN (
                    SELECT id FROM workout_exercises WHERE workout_id = ?
                )`,
                [workout.id],
            );
            await db.runAsync(
                `DELETE FROM workout_exercises WHERE workout_id = ?`,
                [workout.id],
            );

            // Re-insert exercises and sets
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
                    ],
                );

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
                            set.completedAt ? toLocalISOString(set.completedAt) : null,
                            set.restDuration,
                        ],
                    );
                }
            }
        });

        console.log('[WorkoutService] Workout updated successfully:', workout.id);

        // Refresh goal progress and return any newly completed goals
        try {
            const completedGoals = await refreshAllGoalProgress();
            return completedGoals;
        } catch (err) {
            console.warn('[WorkoutService] Goal refresh failed:', err);
            return [];
        }
    } catch (error) {
        console.error('[WorkoutService] Failed to update workout:', error);
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
    const workoutRows = await db.getAllAsync<WorkoutRow>(
        `SELECT * FROM workouts 
         ORDER BY completed_at DESC 
         LIMIT ? OFFSET ?`,
        [limit, offset]
    );

    if (workoutRows.length === 0) return [];

    // Get workout IDs for batch query
    const workoutIds = workoutRows.map(w => w.id);

    // Batch load all exercises for these workouts (PP-037: chunked)
    const exerciseRows = await batchGetAll<ExerciseRow & { workout_id: string }>(
        db,
        workoutIds,
        (placeholders, batch) => [
            `SELECT * FROM workout_exercises 
             WHERE workout_id IN (${placeholders}) 
             ORDER BY workout_id, order_index`,
            batch,
        ],
    );

    // Get exercise IDs for batch query
    const exerciseIds = exerciseRows.map(e => e.id);

    // Batch load all sets for these exercises (PP-037: chunked)
    const setRows = await batchGetAll<SetRow & { workout_exercise_id: string }>(
        db,
        exerciseIds,
        (placeholders, batch) => [
            `SELECT * FROM workout_sets 
             WHERE workout_exercise_id IN (${placeholders}) 
             ORDER BY workout_exercise_id, order_index`,
            batch,
        ],
    );

    // Group sets by exercise ID
    const setsByExercise = new Map<string, SetRow[]>();
    for (const set of setRows) {
        const exerciseId = set.workout_exercise_id;
        if (!setsByExercise.has(exerciseId)) {
            setsByExercise.set(exerciseId, []);
        }
        setsByExercise.get(exerciseId)!.push(set);
    }

    // Group exercises by workout ID
    const exercisesByWorkout = new Map<string, ExerciseRow[]>();
    for (const ex of exerciseRows) {
        const workoutId = ex.workout_id;
        if (!exercisesByWorkout.has(workoutId)) {
            exercisesByWorkout.set(workoutId, []);
        }
        exercisesByWorkout.get(workoutId)!.push(ex);
    }

    // Hydrate workouts using shared mapper
    return workoutRows.map(row =>
        mapWorkoutRow(row, exercisesByWorkout.get(row.id) || [], setsByExercise)
    );
}

/**
 * Get a single workout by ID
 */
export async function getWorkoutById(id: string): Promise<Workout | null> {
    const db = await getDatabase();
    if (!db) return null;

    const row = await db.getFirstAsync<WorkoutRow>(
        `SELECT * FROM workouts WHERE id = ?`,
        [id]
    );

    if (!row) return null;

    // Fetch exercises for this workout
    const exerciseRows = await db.getAllAsync<ExerciseRow>(
        `SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY order_index`,
        [row.id]
    );

    // Fetch sets for all exercises in one query (PP-037: chunked)
    const exerciseIds = exerciseRows.map(e => e.id);
    const setsByExercise = new Map<string, SetRow[]>();

    const setRows = await batchGetAll<SetRow & { workout_exercise_id: string }>(
        db,
        exerciseIds,
        (placeholders, batch) => [
            `SELECT * FROM workout_sets 
             WHERE workout_exercise_id IN (${placeholders}) 
             ORDER BY workout_exercise_id, order_index`,
            batch,
        ],
    );

    for (const set of setRows) {
        const exId = set.workout_exercise_id;
        if (!setsByExercise.has(exId)) {
            setsByExercise.set(exId, []);
        }
        setsByExercise.get(exId)!.push(set);
    }

    return mapWorkoutRow(row, exerciseRows, setsByExercise);
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
 * Get dates of completed workouts for the current week (Monday–Sunday)
 * Used by the WeeklyTracker component to show which days had workouts
 */
export async function getWorkoutDatesThisWeek(): Promise<Date[]> {
    const db = await getDatabase();
    if (!db) return [];

    // Calculate start of week (Monday) and end of week (Sunday)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    try {
        const rows = await db.getAllAsync<{ completed_at: string }>(
            `SELECT DISTINCT DATE(completed_at) as completed_at FROM workouts 
             WHERE completed_at >= ? AND completed_at <= ?
             ORDER BY completed_at`,
            [toLocalISOString(monday), toLocalISOString(sunday)]
        );

        // Parse YYYY-MM-DD strings as local dates (not UTC) to avoid day-shift
        return rows.map(row => {
            const [year, month, day] = row.completed_at.split('-').map(Number);
            return new Date(year, month - 1, day); // month is 0-indexed
        });
    } catch (error) {
        console.error('[WorkoutService] Failed to get weekly workout dates:', error);
        return [];
    }
}


/**
 * Re-exported from models/workout for backward compatibility.
 * New consumers should import from '../models/workout' directly.
 */
export type { PreviousSetData } from '../models/workout';

/**
 * Fetch sets from the most recent completed workout containing the given exerciseId.
 * Returns an empty array if no prior workout exists for this exercise.
 */
export async function getPreviousSetsForExercise(
    exerciseId: string
): Promise<PreviousSetData[]> {
    const db = await getDatabase();
    if (!db) return [];

    try {
        const rows = await db.getAllAsync<{
            weight: number | null;
            reps: number | null;
            type: string;
            order_index: number;
        }>(
            `SELECT ws.weight, ws.reps, ws.type, ws.order_index
             FROM workout_sets ws
             WHERE ws.workout_exercise_id = (
               SELECT we.id
               FROM workout_exercises we
               JOIN workouts w ON we.workout_id = w.id
               WHERE we.exercise_id = ?
                 AND w.status = 'completed'
               ORDER BY w.completed_at DESC
               LIMIT 1
             )
             ORDER BY ws.order_index`,
            [exerciseId]
        );

        return rows.map(r => ({
            weight: r.weight,
            reps: r.reps,
            type: r.type as SetType,
        }));
    } catch (error) {
        console.error('[WorkoutService] Failed to get previous sets:', error);
        return [];
    }
}

/**
 * Batch-fetch previous sets for multiple exercises at once.
 * Returns a Map keyed by exerciseId.
 */
export async function getPreviousSetsForExercises(
    exerciseIds: string[]
): Promise<Map<string, PreviousSetData[]>> {
    const result = new Map<string, PreviousSetData[]>();
    // Fetch in parallel for all exercises
    await Promise.all(
        exerciseIds.map(async (id) => {
            const sets = await getPreviousSetsForExercise(id);
            result.set(id, sets);
        })
    );
    return result;
}

export default {
    saveWorkout,
    updateWorkout,
    getWorkouts,
    getWorkoutById,
    deleteWorkout,
    getWorkoutCount,
    getWorkoutDatesThisWeek,
    getPreviousSetsForExercise,
    getPreviousSetsForExercises,
};

