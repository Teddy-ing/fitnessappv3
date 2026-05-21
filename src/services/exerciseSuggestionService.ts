/**
 * Exercise Suggestion Service
 *
 * Recommends exercises based on co-occurrence analysis (what exercises
 * appear together in the same workouts) and frequency ranking.
 *
 * Used in ExercisePicker to show a "Suggested" section at the top
 * of the exercise list when Smart Suggestions is enabled.
 */

import { getDatabase } from './database';
import type { Exercise } from '../models/exercise';

// ============================================================
// Constants
// ============================================================

/** Max suggestions to return */
const MAX_SUGGESTIONS = 5;

// ============================================================
// Types
// ============================================================

interface CoOccurrenceRow {
    exercise_id: string;
    exercise_name: string;
    co_count: number;
}

interface FrequencyRow {
    exercise_id: string;
    exercise_name: string;
    freq: number;
}

// ============================================================
// Public API
// ============================================================

/**
 * Get suggested exercises based on what's already in the workout.
 *
 * Strategy:
 * - 'add': co-occurrence ranking — exercises commonly done in the same workouts
 *   as the currently added exercises
 * - 'replace': same as 'add' but also boosts same-muscle-group exercises
 *
 * @param context       'add' (adding a new exercise) or 'replace' (replacing one)
 * @param currentExerciseIds  IDs of exercises already in the workout
 * @returns Suggested exercises, max MAX_SUGGESTIONS, excluding already added
 */
export async function getSuggestedExercises(
    context: 'add' | 'replace',
    currentExerciseIds: string[],
): Promise<Exercise[]> {
    const db = await getDatabase();
    if (!db || currentExerciseIds.length === 0) return [];

    try {
        if (currentExerciseIds.length === 0) return [];

        // Build placeholders for the IN clause
        const placeholders = currentExerciseIds.map(() => '?').join(',');

        // ── Co-occurrence: exercises that appear in the same workouts ──
        const coRows = await db.getAllAsync<CoOccurrenceRow>(
            `WITH current_workouts AS (
                SELECT DISTINCT workout_id
                FROM workout_exercises
                WHERE exercise_id IN (${placeholders})
            )
            SELECT
                we.exercise_id,
                we.exercise_name,
                COUNT(DISTINCT we.workout_id) AS co_count
            FROM workout_exercises we
            JOIN current_workouts cw ON we.workout_id = cw.workout_id
            JOIN workouts w ON we.workout_id = w.id
            WHERE we.exercise_id NOT IN (${placeholders})
              AND w.status = 'completed'
            GROUP BY we.exercise_id
            ORDER BY co_count DESC
            LIMIT ?`,
            [...currentExerciseIds, ...currentExerciseIds, MAX_SUGGESTIONS * 2],
        );

        if (coRows.length === 0) {
            // Fallback: frequency-based (most used exercises not in current workout)
            return getFrequencySuggestions(currentExerciseIds);
        }

        // Hydrate exercise objects
        const exerciseIds = coRows.slice(0, MAX_SUGGESTIONS).map(r => r.exercise_id);
        return hydrateExercises(exerciseIds);
    } catch (error) {
        console.error('[ExerciseSuggestion] Failed to get suggestions:', error);
        return [];
    }
}

// ============================================================
// Fallback: Frequency-based suggestions
// ============================================================

/**
 * Get the user's most frequently used exercises, excluding those already
 * in the workout. Used as a fallback when co-occurrence data is insufficient.
 */
async function getFrequencySuggestions(
    excludeIds: string[],
): Promise<Exercise[]> {
    const db = await getDatabase();
    if (!db) return [];

    try {
        const placeholders = excludeIds.map(() => '?').join(',');

        const rows = await db.getAllAsync<FrequencyRow>(
            `SELECT
                we.exercise_id,
                we.exercise_name,
                COUNT(DISTINCT we.workout_id) AS freq
             FROM workout_exercises we
             JOIN workouts w ON we.workout_id = w.id
             WHERE we.exercise_id NOT IN (${placeholders})
               AND w.status = 'completed'
             GROUP BY we.exercise_id
             ORDER BY freq DESC
             LIMIT ?`,
            [...excludeIds, MAX_SUGGESTIONS],
        );

        if (rows.length === 0) return [];

        return hydrateExercises(rows.map(r => r.exercise_id));
    } catch (error) {
        console.error('[ExerciseSuggestion] Frequency fallback failed:', error);
        return [];
    }
}

// ============================================================
// Hydration
// ============================================================

/**
 * Look up full Exercise objects by their IDs.
 * Returns exercises in the same order as the input IDs.
 */
async function hydrateExercises(exerciseIds: string[]): Promise<Exercise[]> {
    const db = await getDatabase();
    if (!db || exerciseIds.length === 0) return [];

    try {
        const placeholders = exerciseIds.map(() => '?').join(',');
        const rows = await db.getAllAsync<{
            id: string;
            name: string;
            category: string;
            muscle_groups: string | null;
            equipment: string | null;
            track_weight: number;
            track_reps: number;
            track_time: number;
            track_distance: number;
            is_custom: number;
            is_hidden: number;
            is_favorite: number;
            created_at: string;
            updated_at: string;
        }>(
            `SELECT * FROM exercises WHERE id IN (${placeholders}) AND is_hidden = 0`,
            exerciseIds,
        );

        // Parse into Exercise model objects
        const exercises: Exercise[] = rows.map(row => ({
            id: row.id,
            name: row.name,
            category: row.category as Exercise['category'],
            muscleGroups: safeJsonParse(row.muscle_groups, []),
            equipment: safeJsonParse(row.equipment, []),
            trackWeight: row.track_weight === 1,
            trackReps: row.track_reps === 1,
            trackTime: row.track_time === 1,
            trackDistance: row.track_distance === 1,
            isCustom: row.is_custom === 1,
            isHidden: row.is_hidden === 1,
            isFavorite: row.is_favorite === 1,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        }));

        // Preserve input order
        const byId = new Map(exercises.map(e => [e.id, e]));
        return exerciseIds
            .map(id => byId.get(id))
            .filter((e): e is Exercise => e !== undefined);
    } catch (error) {
        console.error('[ExerciseSuggestion] Hydration failed:', error);
        return [];
    }
}

// ============================================================
// Utility
// ============================================================

function safeJsonParse<T>(raw: string | null, fallback: T): T {
    if (!raw) return fallback;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}
