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
import {
    mapWorkoutRow,
    ExerciseRow,
    SetRow,
    WorkoutRow,
} from './hydration';

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
    const workoutRows = await db.getAllAsync<WorkoutRow>(
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
    const exerciseRows = await db.getAllAsync<ExerciseRow & { workout_id: string }>(
        `SELECT * FROM workout_exercises 
         WHERE workout_id IN (${placeholders}) 
         ORDER BY workout_id, order_index`,
        workoutIds
    );

    // Get exercise IDs for batch query
    const exerciseIds = exerciseRows.map(e => e.id);

    // Batch load all sets for these exercises
    let setRows: (SetRow & { workout_exercise_id: string })[] = [];
    if (exerciseIds.length > 0) {
        const setPlaceholders = exerciseIds.map(() => '?').join(',');
        setRows = await db.getAllAsync<SetRow & { workout_exercise_id: string }>(
            `SELECT * FROM workout_sets 
             WHERE workout_exercise_id IN (${setPlaceholders}) 
             ORDER BY workout_exercise_id, order_index`,
            exerciseIds
        );
    }

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

    // Fetch sets for all exercises in one query
    const exerciseIds = exerciseRows.map(e => e.id);
    const setsByExercise = new Map<string, SetRow[]>();

    if (exerciseIds.length > 0) {
        const placeholders = exerciseIds.map(() => '?').join(',');
        const setRows = await db.getAllAsync<SetRow & { workout_exercise_id: string }>(
            `SELECT * FROM workout_sets 
             WHERE workout_exercise_id IN (${placeholders}) 
             ORDER BY workout_exercise_id, order_index`,
            exerciseIds
        );

        for (const set of setRows) {
            const exId = set.workout_exercise_id;
            if (!setsByExercise.has(exId)) {
                setsByExercise.set(exId, []);
            }
            setsByExercise.get(exId)!.push(set);
        }
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
            [monday.toISOString(), sunday.toISOString()]
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


export default {
    saveWorkout,
    getWorkouts,
    getWorkoutById,
    deleteWorkout,
    getWorkoutCount,
    getWorkoutDatesThisWeek,
};


