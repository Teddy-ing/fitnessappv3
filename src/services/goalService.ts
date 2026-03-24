/**
 * Goal Service
 *
 * CRUD and progress computation functions for the goals system.
 * Goals track progress toward exercise, measurement, or consistency targets.
 *
 * Conventions:
 * - Uses typed row interfaces (never `any`)
 * - Returns empty arrays / null when DB is unavailable
 * - Uses getDatabase() pattern from existing services
 */

import { getDatabase } from './database';
import { Goal, GoalType, GoalStatus, CreateGoalParams } from '../models/goal';
import { generateId } from '../utils/uuid';

// ============================================================
// Row types (typed DB results)
// ============================================================

interface GoalRow {
    id: string;
    goal_type: string;
    exercise_id: string | null;
    measurement_type_id: string | null;
    target_value: number;
    starting_value: number | null;
    current_best: number | null;
    label: string | null;
    deadline: string | null;
    status: string;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
}

// ============================================================
// Row mappers
// ============================================================

function mapGoalRow(row: GoalRow): Goal {
    return {
        id: row.id,
        goalType: row.goal_type as GoalType,
        exerciseId: row.exercise_id,
        measurementTypeId: row.measurement_type_id,
        targetValue: row.target_value,
        startingValue: row.starting_value,
        currentBest: row.current_best,
        label: row.label,
        deadline: row.deadline,
        status: row.status as GoalStatus,
        completedAt: row.completed_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

// ============================================================
// CRUD Functions
// ============================================================

/**
 * Create a new goal.
 * Snapshots `startingValue` from the provided value (typically current best at creation time).
 */
export async function createGoal(params: CreateGoalParams): Promise<Goal | null> {
    const db = await getDatabase();
    if (!db) return null;

    try {
        const id = generateId();
        const now = new Date().toISOString();

        await db.runAsync(
            `INSERT INTO goals (id, goal_type, exercise_id, measurement_type_id,
                target_value, starting_value, current_best, label, deadline,
                status, completed_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NULL, ?, ?)`,
            [
                id,
                params.goalType,
                params.exerciseId ?? null,
                params.measurementTypeId ?? null,
                params.targetValue,
                params.startingValue ?? null,
                params.startingValue ?? null, // current_best starts at starting_value
                params.label ?? null,
                params.deadline ?? null,
                now,
                now,
            ],
        );

        return {
            id,
            goalType: params.goalType,
            exerciseId: params.exerciseId ?? null,
            measurementTypeId: params.measurementTypeId ?? null,
            targetValue: params.targetValue,
            startingValue: params.startingValue ?? null,
            currentBest: params.startingValue ?? null,
            label: params.label ?? null,
            deadline: params.deadline ?? null,
            status: 'active',
            completedAt: null,
            createdAt: now,
            updatedAt: now,
        };
    } catch (error) {
        console.error('[GoalService] Failed to create goal:', error);
        return null;
    }
}

/**
 * Get all active goals, sorted by deadline proximity (soonest first),
 * then by creation date (oldest first) for open-ended goals.
 */
export async function getActiveGoals(): Promise<Goal[]> {
    const db = await getDatabase();
    if (!db) return [];

    try {
        const rows = await db.getAllAsync<GoalRow>(
            `SELECT * FROM goals
             WHERE status = 'active'
             ORDER BY
                 CASE WHEN deadline IS NULL THEN 1 ELSE 0 END,
                 deadline ASC,
                 created_at ASC`,
        );
        return rows.map(mapGoalRow);
    } catch (error) {
        console.error('[GoalService] Failed to get active goals:', error);
        return [];
    }
}

/**
 * Get all completed goals, sorted by completion date (most recent first).
 */
export async function getCompletedGoals(): Promise<Goal[]> {
    const db = await getDatabase();
    if (!db) return [];

    try {
        const rows = await db.getAllAsync<GoalRow>(
            `SELECT * FROM goals
             WHERE status = 'completed'
             ORDER BY completed_at DESC`,
        );
        return rows.map(mapGoalRow);
    } catch (error) {
        console.error('[GoalService] Failed to get completed goals:', error);
        return [];
    }
}

/**
 * Update editable fields on a goal (target, deadline, label).
 */
export async function updateGoal(
    goalId: string,
    updates: { targetValue?: number; deadline?: string | null; label?: string | null },
): Promise<void> {
    const db = await getDatabase();
    if (!db) return;

    try {
        const setClauses: string[] = [];
        const params: (string | number | null)[] = [];

        if (updates.targetValue !== undefined) {
            setClauses.push('target_value = ?');
            params.push(updates.targetValue);
        }
        if (updates.deadline !== undefined) {
            setClauses.push('deadline = ?');
            params.push(updates.deadline);
        }
        if (updates.label !== undefined) {
            setClauses.push('label = ?');
            params.push(updates.label);
        }

        if (setClauses.length === 0) return;

        setClauses.push('updated_at = ?');
        params.push(new Date().toISOString());
        params.push(goalId);

        await db.runAsync(
            `UPDATE goals SET ${setClauses.join(', ')} WHERE id = ?`,
            params,
        );
    } catch (error) {
        console.error('[GoalService] Failed to update goal:', error);
    }
}

/**
 * Delete a goal permanently.
 */
export async function deleteGoal(goalId: string): Promise<void> {
    const db = await getDatabase();
    if (!db) return;

    try {
        await db.runAsync(`DELETE FROM goals WHERE id = ?`, [goalId]);
    } catch (error) {
        console.error('[GoalService] Failed to delete goal:', error);
    }
}

/**
 * Mark a goal as completed with the final achieved value.
 */
export async function markGoalCompleted(
    goalId: string,
    finalValue: number,
): Promise<void> {
    const db = await getDatabase();
    if (!db) return;

    try {
        const now = new Date().toISOString();
        await db.runAsync(
            `UPDATE goals
             SET status = 'completed',
                 current_best = ?,
                 completed_at = ?,
                 updated_at = ?
             WHERE id = ?`,
            [finalValue, now, now, goalId],
        );
    } catch (error) {
        console.error('[GoalService] Failed to mark goal completed:', error);
    }
}

/**
 * Mark a goal as abandoned (soft-delete).
 */
export async function abandonGoal(goalId: string): Promise<void> {
    const db = await getDatabase();
    if (!db) return;

    try {
        const now = new Date().toISOString();
        await db.runAsync(
            `UPDATE goals SET status = 'abandoned', updated_at = ? WHERE id = ?`,
            [now, goalId],
        );
    } catch (error) {
        console.error('[GoalService] Failed to abandon goal:', error);
    }
}

// ============================================================
// Progress Computation
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
        console.error('[GoalService] Failed to compute current best:', error);
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
         WHERE we.exercise_id = ?
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
             WHERE we.exercise_id = ?
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
         WHERE we.exercise_id = ?
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

/**
 * Refresh current_best for all active goals.
 * Called after every workout save and measurement log.
 */
export async function refreshAllGoalProgress(): Promise<Goal[]> {
    const db = await getDatabase();
    if (!db) return [];

    try {
        const activeGoals = await getActiveGoals();
        const completedGoals: Goal[] = [];

        for (const goal of activeGoals) {
            const currentBest = await computeCurrentBest(goal);
            if (currentBest === null) continue;

            const now = new Date().toISOString();
            await db.runAsync(
                `UPDATE goals SET current_best = ?, updated_at = ? WHERE id = ?`,
                [currentBest, now, goal.id],
            );

            // Check for completion
            if (currentBest >= goal.targetValue) {
                await markGoalCompleted(goal.id, currentBest);
                completedGoals.push({ ...goal, currentBest, status: 'completed' });
            }
        }

        return completedGoals;
    } catch (error) {
        console.error('[GoalService] Failed to refresh goal progress:', error);
        return [];
    }
}

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
        console.error('[GoalService] Failed to get current best for target:', error);
        return null;
    }
}
