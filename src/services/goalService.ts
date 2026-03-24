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


