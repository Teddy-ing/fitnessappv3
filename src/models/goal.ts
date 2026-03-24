/**
 * Goal Models
 *
 * Canonical types for the goal tracking system.
 * Goals track progress toward exercise, measurement, or consistency targets.
 */

// ============================================================
// Goal Type & Status
// ============================================================

export type GoalType =
    | 'exercise_1rm'
    | 'exercise_volume'
    | 'exercise_reps'
    | 'measurement'
    | 'consistency';

export type GoalStatus = 'active' | 'completed' | 'abandoned';

// ============================================================
// Goal (canonical model)
// ============================================================

export interface Goal {
    id: string;
    goalType: GoalType;
    exerciseId: string | null;          // NULL for measurement/consistency goals
    measurementTypeId: string | null;   // NULL for exercise/consistency goals
    targetValue: number;
    startingValue: number | null;       // Snapshot of current best at creation time
    currentBest: number | null;         // Cached, updated on each workout/measurement save
    label: string | null;               // Optional custom motivational label
    deadline: string | null;            // ISO date string, NULL if open-ended
    status: GoalStatus;
    completedAt: string | null;         // ISO date when target was reached
    createdAt: string;
    updatedAt: string;
}

// ============================================================
// Goal Creation Params
// ============================================================

export interface CreateGoalParams {
    goalType: GoalType;
    exerciseId?: string;
    measurementTypeId?: string;
    targetValue: number;
    startingValue?: number;
    label?: string;
    deadline?: string;
}
