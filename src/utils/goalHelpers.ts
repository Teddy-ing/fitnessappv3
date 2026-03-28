/**
 * Goal Helpers
 *
 * Shared utility functions for deriving goal-related state used
 * across multiple features (widgets, measurements, etc.).
 */

import { Goal } from '../models/goal';
import { WeightTrendIntent } from '../models/widget';

/**
 * Derive the bodyweight trend intent from a list of active goals.
 *
 * Looks for an active bodyweight measurement goal and determines
 * whether the user is bulking (target > starting), cutting
 * (target < starting), or has no bodyweight goal (neutral).
 *
 * @param activeGoals - Array of goals (typically from getActiveGoals())
 * @returns WeightTrendIntent: 'bulk' | 'cut' | 'neutral'
 */
export function deriveBodyweightIntent(activeGoals: Goal[]): WeightTrendIntent {
    const bwGoal = activeGoals.find(
        (g) => g.goalType === 'measurement' && g.measurementTypeId === 'bodyweight' && g.status === 'active',
    );

    if (bwGoal && bwGoal.startingValue != null) {
        return bwGoal.targetValue > bwGoal.startingValue ? 'bulk' : 'cut';
    }

    return 'neutral';
}
