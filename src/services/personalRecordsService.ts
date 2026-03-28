/**
 * Personal Records Service
 *
 * Manages personal record tracking, backfilling, and fatigue detection.
 * Extracted from calendarService.ts (TD-011) to keep each service
 * focused on a single domain.
 *
 * - getPersonalRecordDates: dates with PRs in a month (calendar badges)
 * - backfillPersonalRecords: one-time retroactive PR scan
 * - getPRSetIdsForDate: set IDs that are current PRs for a date
 * - getFatigueDates: dates with volume regression (fatigue badges)
 *
 * Conventions:
 * - Uses typed row interfaces (never `any`)
 * - Returns empty Sets when DB is unavailable
 * - Uses getDatabase() pattern from existing services
 */

import { getDatabase } from './database';
import * as Crypto from 'expo-crypto';
import { SESSION_VOLUME } from '../utils/sqlFragments';
import { PRSetIds } from '../models/calendar';

// Re-export for barrel consumers
export type { PRSetIds };

// ============================================================
// Row types (typed DB results)
// ============================================================

/** Raw row for PR date query */
interface PRDateRow {
    pr_date: string;
}

/** Row shape for the backfill query */
interface BackfillSetRow {
    exercise_id: string;
    exercise_name: string;
    workout_id: string;
    set_id: string;
    weight: number;
    reps: number;
    achieved_at: string;
}

/** Row shape for fatigue detection query */
interface FatigueSessionRow {
    exercise_id: string;
    workout_date: string;
    session_volume: number;
}

// ============================================================
// getPersonalRecordDates
// ============================================================

/**
 * Get the set of ISO date strings where personal records were achieved
 * in the given month.
 */
export async function getPersonalRecordDates(
    year: number,
    month: number,
): Promise<Set<string>> {
    const db = await getDatabase();
    if (!db) return new Set();

    try {
        const monthStr = String(month).padStart(2, '0');
        const startDate = `${year}-${monthStr}-01`;
        const nm = month === 12 ? 1 : month + 1;
        const ny = month === 12 ? year + 1 : year;
        const endDate = `${ny}-${String(nm).padStart(2, '0')}-01`;

        const rows = await db.getAllAsync<PRDateRow>(
            `SELECT DISTINCT DATE(achieved_at) AS pr_date
             FROM personal_records
             WHERE is_current = 1
               AND DATE(achieved_at) >= ?
               AND DATE(achieved_at) < ?`,
            [startDate, endDate],
        );

        return new Set(rows.map((r) => r.pr_date));
    } catch (error) {
        console.error('[PersonalRecords] Failed to get PR dates:', error);
        return new Set();
    }
}

// ============================================================
// backfillPersonalRecords
// ============================================================

/**
 * One-time retroactive scan of all completed workout sets.
 * For each exercise, finds max_weight, max_reps, and max_e1rm.
 * Idempotent — skips if `pr_backfill_complete` flag is set.
 */
export async function backfillPersonalRecords(): Promise<void> {
    const db = await getDatabase();
    if (!db) return;

    try {
        // Check if backfill already done
        const flagRow = await db.getFirstAsync<{ pr_backfill_complete: number }>(
            `SELECT pr_backfill_complete FROM user_settings WHERE id = 1`,
        );
        if (flagRow?.pr_backfill_complete === 1) return;

        const rows = await db.getAllAsync<BackfillSetRow>(`
            SELECT
                we.exercise_id,
                we.exercise_name,
                w.id AS workout_id,
                ws.id AS set_id,
                ws.weight,
                ws.reps,
                DATE(w.completed_at) AS achieved_at
            FROM workout_sets ws
            JOIN workout_exercises we ON ws.workout_exercise_id = we.id
            JOIN workouts w ON w.id = we.workout_id
            WHERE w.status = 'completed'
              AND ws.status = 'completed'
              AND ws.weight > 0 AND ws.reps > 0
            ORDER BY we.exercise_id, w.completed_at ASC
        `);

        if (rows.length === 0) {
            await db.runAsync(
                `UPDATE user_settings SET pr_backfill_complete = 1 WHERE id = 1`,
            );
            return;
        }

        // Group by exercise
        const exerciseMap = new Map<string, BackfillSetRow[]>();
        for (const row of rows) {
            if (!exerciseMap.has(row.exercise_id)) {
                exerciseMap.set(row.exercise_id, []);
            }
            exerciseMap.get(row.exercise_id)!.push(row);
        }

        const now = new Date().toISOString();
        const insertSql = `
            INSERT INTO personal_records
            (id, exercise_id, exercise_name, workout_id, set_id, record_type, value, reps, weight, achieved_at, is_current, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
        `;

        // BH-008 fix: Use withTransactionAsync instead of manual BEGIN/COMMIT
        // to ensure proper rollback on failure and consistency with the rest of the codebase.
        await db.withTransactionAsync(async () => {
            for (const [exerciseId, sets] of exerciseMap.entries()) {
                let maxWeightSet = sets[0];
                let maxRepsSet = sets[0];
                let maxE1rmSet = sets[0];
                let maxE1rmValue = 0;

                for (const set of sets) {
                    if (set.weight > maxWeightSet.weight) maxWeightSet = set;
                    if (set.reps > maxRepsSet.reps) maxRepsSet = set;
                    const e1rm = set.weight * (1 + set.reps / 30);
                    if (e1rm > maxE1rmValue) {
                        maxE1rmValue = e1rm;
                        maxE1rmSet = set;
                    }
                }

                await db.runAsync(insertSql, [
                    Crypto.randomUUID(), exerciseId, maxWeightSet.exercise_name,
                    maxWeightSet.workout_id, maxWeightSet.set_id,
                    'max_weight', maxWeightSet.weight,
                    maxWeightSet.reps, maxWeightSet.weight,
                    maxWeightSet.achieved_at, now,
                ]);

                await db.runAsync(insertSql, [
                    Crypto.randomUUID(), exerciseId, maxRepsSet.exercise_name,
                    maxRepsSet.workout_id, maxRepsSet.set_id,
                    'max_reps', maxRepsSet.reps,
                    maxRepsSet.reps, maxRepsSet.weight,
                    maxRepsSet.achieved_at, now,
                ]);

                await db.runAsync(insertSql, [
                    Crypto.randomUUID(), exerciseId, maxE1rmSet.exercise_name,
                    maxE1rmSet.workout_id, maxE1rmSet.set_id,
                    'max_e1rm', Math.round(maxE1rmValue * 10) / 10,
                    maxE1rmSet.reps, maxE1rmSet.weight,
                    maxE1rmSet.achieved_at, now,
                ]);
            }

            await db.runAsync(
                `UPDATE user_settings SET pr_backfill_complete = 1 WHERE id = 1`,
            );
        });

        console.log(
            `[PersonalRecords] PR backfill complete: ${exerciseMap.size} exercises, ${exerciseMap.size * 3} records`,
        );
    } catch (error) {
        console.error('[PersonalRecords] PR backfill failed:', error);
    }
}

// ============================================================
// getFatigueDates
// ============================================================

/**
 * Detect days where exercise volume regressed compared to the
 * 4-session trailing average. If any exercise on a given day had
 * volume ≤80% of its trailing average, that date is flagged.
 */
export async function getFatigueDates(
    year: number,
    month: number,
): Promise<Set<string>> {
    const db = await getDatabase();
    if (!db) return new Set();

    try {
        const monthStr = String(month).padStart(2, '0');
        const startDate = `${year}-${monthStr}-01`;
        const nm = month === 12 ? 1 : month + 1;
        const ny = month === 12 ? year + 1 : year;
        const endDate = `${ny}-${String(nm).padStart(2, '0')}-01`;

        // PP-018 fix: Limit lookback to 3 months before the target month.
        // The trailing average only needs 4 prior sessions per exercise,
        // so 3 months is generous while avoiding a full-history scan.
        const lookbackMonth = month - 3 <= 0 ? month - 3 + 12 : month - 3;
        const lookbackYear = month - 3 <= 0 ? year - 1 : year;
        const lookbackDate = `${lookbackYear}-${String(lookbackMonth).padStart(2, '0')}-01`;

        // Get per-exercise, per-session volume within the lookback window
        const rows = await db.getAllAsync<FatigueSessionRow>(`
            SELECT
                we.exercise_id,
                DATE(w.completed_at) AS workout_date,
                ${SESSION_VOLUME} AS session_volume
            FROM workout_sets ws
            JOIN workout_exercises we ON ws.workout_exercise_id = we.id
            JOIN workouts w ON w.id = we.workout_id
            WHERE w.status = 'completed'
              AND ws.status = 'completed'
              AND ws.weight > 0 AND ws.reps > 0
              AND DATE(w.completed_at) >= ?
              AND DATE(w.completed_at) < ?
            GROUP BY we.exercise_id, DATE(w.completed_at)
            ORDER BY we.exercise_id, w.completed_at ASC
        `, [lookbackDate, endDate]);

        if (rows.length === 0) return new Set();

        // Group by exercise
        const exerciseHistory = new Map<string, FatigueSessionRow[]>();
        for (const row of rows) {
            if (!exerciseHistory.has(row.exercise_id)) {
                exerciseHistory.set(row.exercise_id, []);
            }
            exerciseHistory.get(row.exercise_id)!.push(row);
        }

        const fatigueDates = new Set<string>();

        // For each exercise, check sessions within the target month
        for (const [, sessions] of exerciseHistory.entries()) {
            for (let i = 0; i < sessions.length; i++) {
                const session = sessions[i];

                // Only flag dates within the target month
                if (session.workout_date < startDate || session.workout_date >= endDate) {
                    continue;
                }

                // Need at least 4 prior sessions for a trailing average
                if (i < 4) continue;

                // Compute 4-session trailing average (sessions i-4 to i-1)
                let trailingSum = 0;
                for (let j = i - 4; j < i; j++) {
                    trailingSum += sessions[j].session_volume;
                }
                const trailingAvg = trailingSum / 4;

                // Flag if volume dropped to ≤80% of trailing average
                if (trailingAvg > 0 && session.session_volume <= trailingAvg * 0.8) {
                    fatigueDates.add(session.workout_date);
                }
            }
        }

        return fatigueDates;
    } catch (error) {
        console.error('[PersonalRecords] getFatigueDates failed:', error);
        return new Set();
    }
}

// ============================================================
// Personal Record Set IDs
// ============================================================

/**
 * Fetch the set IDs that are current personal records for a specific date.
 * Used by DailyWorkoutModal to show PR badges on individual sets.
 */
export async function getPRSetIdsForDate(date: string): Promise<PRSetIds> {
    const db = await getDatabase();
    if (!db) return new Set();

    try {
        const rows = await db.getAllAsync<{ set_id: string }>(
            `SELECT set_id FROM personal_records
             WHERE DATE(achieved_at) = ? AND is_current = 1`,
            [date],
        );
        return new Set(rows.map((r) => r.set_id));
    } catch {
        return new Set();
    }
}
