/**
 * Goal Shared Utilities
 *
 * Shared helpers used across GoalCard, CompletedGoalCard, and GoalDetailModal.
 * Extracted to eliminate duplication (TD-018, TD-019).
 */

import type { Goal } from '../../models';
import type { GoalDisplayInfo } from './GoalCard';

// ============================================================
// Progress Calculation
// ============================================================

/**
 * Direction-aware progress percentage.
 * Handles both "increase" goals (e.g., lift more) and "decrease" goals (e.g., lose weight).
 */
export function getProgressPercent(goal: Goal): number {
    if (!goal.currentBest || !goal.targetValue) return 0;

    // Direction-aware for loss goals (e.g., weight loss)
    const isLossGoal = goal.startingValue != null && goal.targetValue < goal.startingValue;
    if (isLossGoal) {
        const totalDistance = goal.startingValue! - goal.targetValue;
        if (totalDistance <= 0) return 0;
        const progressMade = goal.startingValue! - goal.currentBest;
        return Math.min(100, Math.max(0, Math.round((progressMade / totalDistance) * 100)));
    }

    return Math.min(100, Math.round((goal.currentBest / goal.targetValue) * 100));
}

// ============================================================
// Formatting
// ============================================================

/**
 * Format an ISO date string to locale-friendly display.
 * e.g., "Mar 24, 2026"
 */
export function formatDate(isoStr: string): string {
    return new Date(isoStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

/**
 * Format goal title from goal data and display info.
 * e.g., "Barbell Squat 1RM: 315 lbs" or "30 Workouts"
 */
export function formatTitle(goal: Goal, info: GoalDisplayInfo): string {
    if (goal.goalType === 'consistency') {
        return `${goal.targetValue} Workouts`;
    }
    const suffix = info.metricLabel ? ` ${info.metricLabel}` : '';
    return `${info.name}${suffix}: ${goal.targetValue} ${info.unit}`;
}
