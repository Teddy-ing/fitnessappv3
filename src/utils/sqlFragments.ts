/**
 * Shared SQL Fragments (TD-024)
 *
 * Canonical SQL expression strings for formulas used across multiple services.
 * Import these constants instead of copy-pasting formulas inline.
 *
 * WHY: The Epley 1RM and volume formulas were duplicated across analyticsService,
 * calendarService, and goalProgressService. If the formula ever changes (e.g.,
 * switching from Epley to Brzycki), all services update automatically.
 *
 * USAGE: Embed these in template literals:
 *   `SELECT ${SQL.ESTIMATED_1RM} AS value FROM ...`
 *   `SELECT ${SQL.SESSION_VOLUME} AS session_volume FROM ...`
 */

// ============================================================
// Workout status filter
// ============================================================

/**
 * Standard WHERE clause fragment for filtering to completed workouts.
 * Assumes the workouts table is aliased as `w`.
 */
export const COMPLETED_WORKOUT_FILTER = `w.status = 'completed'`;

/**
 * Standard WHERE clause fragment for filtering to completed sets.
 * Assumes the workout_sets table is aliased as `ws`.
 */
export const COMPLETED_SET_FILTER = `ws.status = 'completed'`;

// ============================================================
// Epley estimated 1RM formula
// ============================================================

/**
 * Epley formula for estimated 1-rep max.
 * Returns: estimated 1RM for a single set row.
 * Assumes `ws.weight` and `ws.reps` are available columns.
 *
 * Formula: weight × (1 + reps / 30)
 * Reference: https://en.wikipedia.org/wiki/One-repetition_maximum#Epley_formula
 */
export const EPLEY_1RM = `ws.weight * (1.0 + ws.reps / 30.0)`;

/**
 * MAX of the Epley formula across all sets.
 * Use this when you want the best estimated 1RM from a group of sets.
 */
export const MAX_EPLEY_1RM = `MAX(${EPLEY_1RM})`;

// ============================================================
// Volume formula
// ============================================================

/**
 * Volume for a single set: weight × reps.
 * Assumes `ws.weight` and `ws.reps` are available columns.
 */
export const SET_VOLUME = `ws.weight * ws.reps`;

/**
 * Total session volume: SUM(weight × reps) across all sets.
 * Use inside a GROUP BY to get per-session or per-exercise volume.
 */
export const SESSION_VOLUME = `SUM(${SET_VOLUME})`;

/**
 * Coalesced session volume (returns 0 instead of NULL for empty groups).
 */
export const SESSION_VOLUME_COALESCE = `COALESCE(${SESSION_VOLUME}, 0)`;
