/**
 * Goal Progress Service
 *
 * Progress computation and batch-refresh logic for the goals system.
 * Extracted from goalService.ts (TD-017) to keep CRUD and progress concerns separate.
 *
 * Conventions:
 * - Uses typed row interfaces (never `any`)
 * - Returns null when DB is unavailable
 * - Uses getDatabase() pattern from existing services
 */

import { getDatabase } from './database';
import { Goal, GoalType } from '../models/goal';
import { getActiveGoals, markGoalCompleted } from './goalService';

// ============================================================
// Single-Goal Progress Computation
// ============================================================

/**
 * Compute the current best value for a goal based on its type.
 * Dispatches to the correct SQL query for each goal_type.
 */
export async function computeCurrentBest(goal: Goal): Promise<number | null> {
    const db = await getDatabase();
    if (!db) return null;

    try {
        switch (goal.goalType) {
            case 'exercise_1rm':
                return await computeExercise1RM(goal.exerciseId!);
            case 'exercise_volume':
                return await computeExerciseVolume(goal.exerciseId!);
            case 'exercise_reps':
                return await computeExerciseMaxReps(goal.exerciseId!);
            case 'measurement':
                return await computeMeasurementBest(goal);
            case 'consistency':
                return await computeConsistencyCount(goal.createdAt);
            default:
                return null;
        }
    } catch (error) {
        console.error('[GoalProgressService] Failed to compute current best:', error);
        return null;
    }
}

/**
 * Estimated 1RM: MAX(weight × (1 + reps/30)) across all working sets for an exercise.
 */
async function computeExercise1RM(exerciseId: string): Promise<number | null> {
    const db = await getDatabase();
    if (!db) return null;

    const row = await db.getFirstAsync<{ best: number | null }>(
        `SELECT MAX(ws.weight * (1.0 + ws.reps / 30.0)) AS best
         FROM workout_sets ws
         JOIN workout_exercises we ON ws.workout_exercise_id = we.id
         JOIN workouts w ON w.id = we.workout_id
         WHERE we.exercise_id = ?
           AND w.status = 'completed'
           AND ws.type = 'working'
           AND ws.weight IS NOT NULL
           AND ws.reps IS NOT NULL`,
        [exerciseId],
    );

    return row?.best ?? null;
}

/**
 * Max Volume: MAX(SUM(weight × reps)) per workout session for an exercise.
 */
async function computeExerciseVolume(exerciseId: string): Promise<number | null> {
    const db = await getDatabase();
    if (!db) return null;

    const row = await db.getFirstAsync<{ best: number | null }>(
        `SELECT MAX(session_volume) AS best
         FROM (
             SELECT SUM(ws.weight * ws.reps) AS session_volume
             FROM workout_sets ws
             JOIN workout_exercises we ON ws.workout_exercise_id = we.id
             JOIN workouts w ON w.id = we.workout_id
             WHERE we.exercise_id = ?
               AND w.status = 'completed'
               AND ws.weight IS NOT NULL
               AND ws.reps IS NOT NULL
             GROUP BY we.workout_id
         )`,
        [exerciseId],
    );

    return row?.best ?? null;
}

/**
 * Max Reps: MAX(reps) across all working sets for an exercise.
 */
async function computeExerciseMaxReps(exerciseId: string): Promise<number | null> {
    const db = await getDatabase();
    if (!db) return null;

    const row = await db.getFirstAsync<{ best: number | null }>(
        `SELECT MAX(ws.reps) AS best
         FROM workout_sets ws
         JOIN workout_exercises we ON ws.workout_exercise_id = we.id
         JOIN workouts w ON w.id = we.workout_id
         WHERE we.exercise_id = ?
           AND w.status = 'completed'
           AND ws.type = 'working'
           AND ws.reps IS NOT NULL`,
        [exerciseId],
    );

    return row?.best ?? null;
}

/**
 * Measurement best: direction-aware (loss vs gain) based on starting vs target value.
 */
async function computeMeasurementBest(goal: Goal): Promise<number | null> {
    const db = await getDatabase();
    if (!db) return null;

    // Determine direction: if target < starting, user wants to decrease
    const isLossGoal = goal.startingValue != null && goal.targetValue < goal.startingValue;

    const aggFunction = isLossGoal ? 'MIN' : 'MAX';

    const row = await db.getFirstAsync<{ best: number | null }>(
        `SELECT ${aggFunction}(value) AS best
         FROM measurements
         WHERE measurement_type_id = ?`,
        [goal.measurementTypeId!],
    );

    return row?.best ?? null;
}

/**
 * Consistency: COUNT of workouts completed since goal creation.
 */
async function computeConsistencyCount(goalCreatedAt: string): Promise<number | null> {
    const db = await getDatabase();
    if (!db) return null;

    const row = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) AS count
         FROM workouts
         WHERE completed_at >= ?`,
        [goalCreatedAt],
    );

    return row?.count ?? 0;
}

// ============================================================
// Batch Progress Refresh
// ============================================================

/**
 * Refresh current_best for all active goals.
 * Called after every workout save and measurement log.
 *
 * PP-031 fix: batched SQL queries grouped by goal_type instead of
 * sequential per-goal computeCurrentBest + UPDATE round-trips.
 */
export async function refreshAllGoalProgress(): Promise<Goal[]> {
    const db = await getDatabase();
    if (!db) return [];

    try {
        const activeGoals = await getActiveGoals();
        if (activeGoals.length === 0) return [];

        // Group goals by type for batch queries
        const exerciseGoals1RM = activeGoals.filter((g) => g.goalType === 'exercise_1rm');
        const exerciseGoalsVolume = activeGoals.filter((g) => g.goalType === 'exercise_volume');
        const exerciseGoalsReps = activeGoals.filter((g) => g.goalType === 'exercise_reps');
        const measurementGoals = activeGoals.filter((g) => g.goalType === 'measurement');
        const consistencyGoals = activeGoals.filter((g) => g.goalType === 'consistency');

        // Map: goalId → currentBest
        const bestValues = new Map<string, number>();

        // Batch: exercise 1RM goals
        if (exerciseGoals1RM.length > 0) {
            const ids = exerciseGoals1RM.map((g) => g.exerciseId!);
            const placeholders = ids.map(() => '?').join(',');
            const rows = await db.getAllAsync<{ exercise_id: string; best: number | null }>(
                `SELECT we.exercise_id,
                        MAX(ws.weight * (1.0 + ws.reps / 30.0)) AS best
                 FROM workout_sets ws
                 JOIN workout_exercises we ON ws.workout_exercise_id = we.id
                 JOIN workouts w ON w.id = we.workout_id
                 WHERE we.exercise_id IN (${placeholders})
                   AND w.status = 'completed'
                   AND ws.type = 'working'
                   AND ws.weight IS NOT NULL
                   AND ws.reps IS NOT NULL
                 GROUP BY we.exercise_id`,
                ids,
            );
            const resultMap = new Map(rows.map((r) => [r.exercise_id, r.best]));
            for (const goal of exerciseGoals1RM) {
                const best = resultMap.get(goal.exerciseId!) ?? null;
                if (best !== null) bestValues.set(goal.id, best);
            }
        }

        // Batch: exercise volume goals
        if (exerciseGoalsVolume.length > 0) {
            const ids = exerciseGoalsVolume.map((g) => g.exerciseId!);
            const placeholders = ids.map(() => '?').join(',');
            const rows = await db.getAllAsync<{ exercise_id: string; best: number | null }>(
                `SELECT exercise_id, MAX(session_volume) AS best
                 FROM (
                     SELECT we.exercise_id,
                            SUM(ws.weight * ws.reps) AS session_volume
                     FROM workout_sets ws
                     JOIN workout_exercises we ON ws.workout_exercise_id = we.id
                     JOIN workouts w ON w.id = we.workout_id
                     WHERE we.exercise_id IN (${placeholders})
                       AND w.status = 'completed'
                       AND ws.weight IS NOT NULL
                       AND ws.reps IS NOT NULL
                     GROUP BY we.workout_id, we.exercise_id
                 )
                 GROUP BY exercise_id`,
                ids,
            );
            const resultMap = new Map(rows.map((r) => [r.exercise_id, r.best]));
            for (const goal of exerciseGoalsVolume) {
                const best = resultMap.get(goal.exerciseId!) ?? null;
                if (best !== null) bestValues.set(goal.id, best);
            }
        }

        // Batch: exercise max reps goals
        if (exerciseGoalsReps.length > 0) {
            const ids = exerciseGoalsReps.map((g) => g.exerciseId!);
            const placeholders = ids.map(() => '?').join(',');
            const rows = await db.getAllAsync<{ exercise_id: string; best: number | null }>(
                `SELECT we.exercise_id,
                        MAX(ws.reps) AS best
                 FROM workout_sets ws
                 JOIN workout_exercises we ON ws.workout_exercise_id = we.id
                 JOIN workouts w ON w.id = we.workout_id
                 WHERE we.exercise_id IN (${placeholders})
                   AND w.status = 'completed'
                   AND ws.type = 'working'
                   AND ws.reps IS NOT NULL
                 GROUP BY we.exercise_id`,
                ids,
            );
            const resultMap = new Map(rows.map((r) => [r.exercise_id, r.best]));
            for (const goal of exerciseGoalsReps) {
                const best = resultMap.get(goal.exerciseId!) ?? null;
                if (best !== null) bestValues.set(goal.id, best);
            }
        }

        // Batch: measurement goals
        if (measurementGoals.length > 0) {
            // Split into loss vs gain goals for MIN/MAX aggregation
            const lossGoals = measurementGoals.filter(
                (g) => g.startingValue != null && g.targetValue < g.startingValue,
            );
            const gainGoals = measurementGoals.filter(
                (g) => !(g.startingValue != null && g.targetValue < g.startingValue),
            );

            if (gainGoals.length > 0) {
                const ids = gainGoals.map((g) => g.measurementTypeId!);
                const placeholders = ids.map(() => '?').join(',');
                const rows = await db.getAllAsync<{ measurement_type_id: string; best: number | null }>(
                    `SELECT measurement_type_id, MAX(value) AS best
                     FROM measurements
                     WHERE measurement_type_id IN (${placeholders})
                     GROUP BY measurement_type_id`,
                    ids,
                );
                const resultMap = new Map(rows.map((r) => [r.measurement_type_id, r.best]));
                for (const goal of gainGoals) {
                    const best = resultMap.get(goal.measurementTypeId!) ?? null;
                    if (best !== null) bestValues.set(goal.id, best);
                }
            }

            if (lossGoals.length > 0) {
                const ids = lossGoals.map((g) => g.measurementTypeId!);
                const placeholders = ids.map(() => '?').join(',');
                const rows = await db.getAllAsync<{ measurement_type_id: string; best: number | null }>(
                    `SELECT measurement_type_id, MIN(value) AS best
                     FROM measurements
                     WHERE measurement_type_id IN (${placeholders})
                     GROUP BY measurement_type_id`,
                    ids,
                );
                const resultMap = new Map(rows.map((r) => [r.measurement_type_id, r.best]));
                for (const goal of lossGoals) {
                    const best = resultMap.get(goal.measurementTypeId!) ?? null;
                    if (best !== null) bestValues.set(goal.id, best);
                }
            }
        }

        // Batch: consistency goals (single query)
        if (consistencyGoals.length > 0) {
            // Each consistency goal counts workouts since its creation date.
            // We need the oldest creation date to bound the query.
            const oldestCreatedAt = consistencyGoals.reduce(
                (oldest, g) => (g.createdAt < oldest ? g.createdAt : oldest),
                consistencyGoals[0].createdAt,
            );

            const rows = await db.getAllAsync<{ completed_at: string }>(
                `SELECT completed_at FROM workouts WHERE completed_at >= ? ORDER BY completed_at ASC`,
                [oldestCreatedAt],
            );

            // Count workouts per goal based on each goal's createdAt
            for (const goal of consistencyGoals) {
                const count = rows.filter((r) => r.completed_at >= goal.createdAt).length;
                bestValues.set(goal.id, count);
            }
        }

        // Batch UPDATE all current_best values + detect completions
        const now = new Date().toISOString();
        const completedGoals: Goal[] = [];

        for (const goal of activeGoals) {
            const currentBest = bestValues.get(goal.id);
            if (currentBest === undefined) continue;

            await db.runAsync(
                `UPDATE goals SET current_best = ?, updated_at = ? WHERE id = ?`,
                [currentBest, now, goal.id],
            );

            // Check for completion (direction-aware for loss goals)
            const isLossGoal = goal.startingValue != null && goal.targetValue < goal.startingValue;
            const isComplete = isLossGoal
                ? currentBest <= goal.targetValue
                : currentBest >= goal.targetValue;

            if (isComplete) {
                await markGoalCompleted(goal.id, currentBest);
                completedGoals.push({ ...goal, currentBest, status: 'completed' });
            }
        }

        return completedGoals;
    } catch (error) {
        console.error('[GoalProgressService] Failed to refresh goal progress:', error);
        return [];
    }
}

// ============================================================
// Creation-time Lookup
// ============================================================

/**
 * Get the current best value for a specific exercise/metric combination.
 * Used during goal creation to show the user their starting point.
 */
export async function getCurrentBestForTarget(
    goalType: GoalType,
    exerciseId?: string,
    measurementTypeId?: string,
): Promise<number | null> {
    const db = await getDatabase();
    if (!db) return null;

    try {
        switch (goalType) {
            case 'exercise_1rm':
                return exerciseId ? await computeExercise1RM(exerciseId) : null;
            case 'exercise_volume':
                return exerciseId ? await computeExerciseVolume(exerciseId) : null;
            case 'exercise_reps':
                return exerciseId ? await computeExerciseMaxReps(exerciseId) : null;
            case 'measurement': {
                if (!measurementTypeId) return null;
                const row = await db.getFirstAsync<{ value: number | null }>(
                    `SELECT value FROM measurements
                     WHERE measurement_type_id = ?
                     ORDER BY recorded_at DESC, created_at DESC
                     LIMIT 1`,
                    [measurementTypeId],
                );
                return row?.value ?? null;
            }
            case 'consistency':
                return 0; // Always starts at 0
            default:
                return null;
        }
    } catch (error) {
        console.error('[GoalProgressService] Failed to get current best for target:', error);
        return null;
    }
}
