/**
 * Smart Suggestions Service
 *
 * Core prediction engine for Phase 7 personalization.
 * All predictions computed from existing workout data via SQL + JS stats.
 * No ML frameworks — pure weighted linear regression.
 */

import { getDatabase } from './database';
import { batchGetAll } from '../utils/batchQuery';
import type {
    TrainingPhase,
    SetSuggestion,
    ExerciseSuggestion,
    ProgressionNudge,
} from '../models/smartSuggestions';

// ============================================================
// Constants
// ============================================================

const HISTORY_DEPTH = 20;
const MIN_SESSIONS = 3;
const DECAY_FACTOR = 0.85;
const R_SQ_THRESHOLD = 0.3;
const REST_MIN = 30;
const REST_MAX = 600;
const MIN_REST_POINTS = 5;
const SET_COUNT_SESSIONS = 5;
const NUDGE_THRESHOLD = 3;

// ============================================================
// Internal types
// ============================================================

interface HistRow {
    exercise_id: string;
    session_num: number;
    completed_at: string;
    set_index: number;
    weight: number | null;
    reps: number | null;
    type: string;
}

interface SessionData {
    sessionNum: number;
    maxWeight: number;
    maxReps: number;
    sets: { weight: number | null; reps: number | null }[];
}

interface RegResult {
    slope: number;
    intercept: number;
    rSq: number;
}

// ============================================================
// Public API
// ============================================================

/**
 * Get suggestions for a single exercise.
 * Used when adding or replacing a single exercise mid-workout.
 */
export async function getSuggestionsForExercise(
    exerciseId: string,
    trainingPhase: TrainingPhase,
    weightIncrement: number = 5,
): Promise<ExerciseSuggestion> {
    const map = await getSuggestionsForExercises([exerciseId], trainingPhase, weightIncrement);
    return map.get(exerciseId) ?? {
        exerciseId, sets: [], predictedSetCount: 0,
        smartRestDuration: null, progressionNudge: null,
    };
}

/**
 * Batch-fetch suggestions for multiple exercises.
 *
 * PP-089 fix: Uses 4 batch SQL queries with IN(...) instead of
 * 4N per-exercise queries via Promise.all. For a 6-exercise template,
 * this reduces 24 DB round-trips to 4 (or chunked via batchGetAll
 * for >500 exercises).
 */
export async function getSuggestionsForExercises(
    exerciseIds: string[],
    trainingPhase: TrainingPhase,
    weightIncrement: number = 5,
): Promise<Map<string, ExerciseSuggestion>> {
    const result = new Map<string, ExerciseSuggestion>();
    if (exerciseIds.length === 0) return result;

    const db = await getDatabase();
    if (!db) {
        // Populate empty suggestions for all exercises
        for (const id of exerciseIds) {
            result.set(id, {
                exerciseId: id, sets: [], predictedSetCount: 0,
                smartRestDuration: null, progressionNudge: null,
            });
        }
        return result;
    }

    try {
        // ── Query 1: Batch history rows ──
        const histRows = await batchGetAll<HistRow>(
            db, exerciseIds,
            (placeholders, batch) => [
                `WITH ranked AS (
                    SELECT we.exercise_id, w.completed_at,
                        ws.order_index AS set_index, ws.weight, ws.reps, ws.type,
                        DENSE_RANK() OVER (
                            PARTITION BY we.exercise_id
                            ORDER BY w.completed_at DESC
                        ) AS session_num
                    FROM workout_sets ws
                    JOIN workout_exercises we ON ws.workout_exercise_id = we.id
                    JOIN workouts w ON we.workout_id = w.id
                    WHERE we.exercise_id IN (${placeholders})
                      AND w.status = 'completed' AND ws.status = 'completed'
                      AND ws.type = 'working'
                )
                SELECT exercise_id, session_num, completed_at, set_index, weight, reps, type
                FROM ranked WHERE session_num <= ${HISTORY_DEPTH}
                ORDER BY exercise_id, session_num ASC, set_index ASC`,
                batch,
            ],
        );

        // ── Query 2: Batch rest durations ──
        const restRows = await batchGetAll<{ exercise_id: string; rest_duration: number }>(
            db, exerciseIds,
            (placeholders, batch) => [
                `SELECT we.exercise_id, ws.rest_duration
                 FROM workout_sets ws
                 JOIN workout_exercises we ON ws.workout_exercise_id = we.id
                 JOIN workouts w ON we.workout_id = w.id
                 WHERE we.exercise_id IN (${placeholders})
                   AND w.status = 'completed' AND ws.status = 'completed'
                   AND ws.rest_duration IS NOT NULL
                   AND ws.rest_duration >= ${REST_MIN} AND ws.rest_duration <= ${REST_MAX}
                 ORDER BY we.exercise_id, w.completed_at DESC, ws.order_index DESC`,
                batch,
            ],
        );

        // ── Query 3: Batch set counts ──
        const setCountRows = await batchGetAll<{ exercise_id: string; set_count: number }>(
            db, exerciseIds,
            (placeholders, batch) => [
                `WITH recent AS (
                    SELECT we.exercise_id, we.id AS we_id,
                        ROW_NUMBER() OVER (
                            PARTITION BY we.exercise_id
                            ORDER BY w.completed_at DESC
                        ) AS rn
                    FROM workout_exercises we
                    JOIN workouts w ON we.workout_id = w.id
                    WHERE we.exercise_id IN (${placeholders}) AND w.status = 'completed'
                )
                SELECT r.exercise_id, COUNT(*) AS set_count
                FROM workout_sets ws
                JOIN recent r ON ws.workout_exercise_id = r.we_id
                WHERE r.rn <= ${SET_COUNT_SESSIONS}
                  AND ws.type = 'working' AND ws.status = 'completed'
                GROUP BY r.exercise_id, r.we_id`,
                batch,
            ],
        );

        // ── Query 4: Batch nudge data ──
        const nudgeRows = await batchGetAll<{
            exercise_id: string; session_num: number;
            max_weight: number; max_reps: number;
        }>(
            db, exerciseIds,
            (placeholders, batch) => [
                `WITH ranked AS (
                    SELECT we.exercise_id,
                        DENSE_RANK() OVER (
                            PARTITION BY we.exercise_id
                            ORDER BY w.completed_at DESC
                        ) AS session_num,
                        MAX(ws.weight) AS max_weight, MAX(ws.reps) AS max_reps
                    FROM workout_sets ws
                    JOIN workout_exercises we ON ws.workout_exercise_id = we.id
                    JOIN workouts w ON we.workout_id = w.id
                    WHERE we.exercise_id IN (${placeholders}) AND w.status = 'completed'
                      AND ws.status = 'completed' AND ws.type = 'working'
                      AND ws.weight IS NOT NULL AND ws.reps IS NOT NULL
                    GROUP BY we.exercise_id, w.id
                )
                SELECT exercise_id, session_num, max_weight, max_reps
                FROM ranked WHERE session_num <= ${NUDGE_THRESHOLD + 2}
                ORDER BY exercise_id, session_num ASC`,
                batch,
            ],
        );

        // ── Group batch results by exercise_id ──
        const histByExercise = groupRowsByExercise(histRows);
        const restByExercise = groupRowsByExercise(restRows);
        const setCountByExercise = groupRowsByExercise(setCountRows);
        const nudgeByExercise = groupRowsByExercise(nudgeRows);

        // ── Process each exercise ──
        for (const exerciseId of exerciseIds) {
            const empty: ExerciseSuggestion = {
                exerciseId, sets: [], predictedSetCount: 0,
                smartRestDuration: null, progressionNudge: null,
            };

            // History → sessions → predictions
            const exHistRows = histByExercise.get(exerciseId) ?? [];
            if (exHistRows.length === 0) {
                result.set(exerciseId, empty);
                continue;
            }
            const sessions = groupBySession(exHistRows);
            if (sessions.length < MIN_SESSIONS) {
                result.set(exerciseId, empty);
                continue;
            }

            const setSuggestions = predictSets(sessions, trainingPhase, weightIncrement);

            // Rest duration: average of last 50 per exercise, rounded to 15s
            const exRestRows = (restByExercise.get(exerciseId) ?? []).slice(0, 50);
            let smartRestDuration: number | null = null;
            if (exRestRows.length >= MIN_REST_POINTS) {
                const avg = exRestRows.reduce((s, r) => s + r.rest_duration, 0) / exRestRows.length;
                smartRestDuration = Math.round(avg / 15) * 15;
            }

            // Set count: mode of last N sessions
            const exSetCountRows = setCountByExercise.get(exerciseId) ?? [];
            let predictedSetCount: number = 0;
            if (exSetCountRows.length >= 2) {
                predictedSetCount = mode(exSetCountRows.map(r => r.set_count));
            }

            // Nudge detection
            const exNudgeRows = nudgeByExercise.get(exerciseId) ?? [];
            const nudgeSessions: SessionData[] = exNudgeRows.map(r => ({
                sessionNum: r.session_num, maxWeight: r.max_weight,
                maxReps: r.max_reps, sets: [],
            }));
            const progressionNudge = detectNudge(nudgeSessions, weightIncrement);

            result.set(exerciseId, {
                exerciseId, sets: setSuggestions,
                predictedSetCount, smartRestDuration, progressionNudge,
            });
        }
    } catch (error) {
        console.error('[SmartSuggestions] Batch fetch failed:', error);
        // Populate empty suggestions for any exercises that failed
        for (const id of exerciseIds) {
            if (!result.has(id)) {
                result.set(id, {
                    exerciseId: id, sets: [], predictedSetCount: 0,
                    smartRestDuration: null, progressionNudge: null,
                });
            }
        }
    }

    return result;
}

/**
 * Get learned rest duration for an exercise.
 * Average of last 50 sets, filtering outliers, rounded to nearest 15s.
 */
export async function getSmartRestDuration(
    exerciseId: string,
): Promise<number | null> {
    const db = await getDatabase();
    if (!db) return null;

    try {
        const rows = await db.getAllAsync<{ rest_duration: number }>(
            `SELECT ws.rest_duration
             FROM workout_sets ws
             JOIN workout_exercises we ON ws.workout_exercise_id = we.id
             JOIN workouts w ON we.workout_id = w.id
             WHERE we.exercise_id = ?
               AND w.status = 'completed' AND ws.status = 'completed'
               AND ws.rest_duration IS NOT NULL
               AND ws.rest_duration >= ? AND ws.rest_duration <= ?
             ORDER BY w.completed_at DESC, ws.order_index DESC
             LIMIT 50`,
            [exerciseId, REST_MIN, REST_MAX],
        );

        if (rows.length < MIN_REST_POINTS) return null;
        const avg = rows.reduce((s, r) => s + r.rest_duration, 0) / rows.length;
        return Math.round(avg / 15) * 15;
    } catch (error) {
        console.error('[SmartSuggestions] Rest duration failed:', error);
        return null;
    }
}

/**
 * Get predicted set count (mode of last N sessions).
 */
export async function getPredictedSetCount(
    exerciseId: string,
): Promise<number | null> {
    const db = await getDatabase();
    if (!db) return null;

    try {
        const rows = await db.getAllAsync<{ set_count: number }>(
            `WITH recent AS (
                SELECT we.id AS we_id,
                    ROW_NUMBER() OVER (ORDER BY w.completed_at DESC) AS rn
                FROM workout_exercises we
                JOIN workouts w ON we.workout_id = w.id
                WHERE we.exercise_id = ? AND w.status = 'completed'
            )
            SELECT COUNT(*) AS set_count
            FROM workout_sets ws
            JOIN recent r ON ws.workout_exercise_id = r.we_id
            WHERE r.rn <= ? AND ws.type = 'working' AND ws.status = 'completed'
            GROUP BY r.we_id`,
            [exerciseId, SET_COUNT_SESSIONS],
        );

        if (rows.length < 2) return null;
        return mode(rows.map(r => r.set_count));
    } catch (error) {
        console.error('[SmartSuggestions] Set count failed:', error);
        return null;
    }
}

/**
 * Get progression nudge for an exercise.
 */
export async function getProgressionNudge(
    exerciseId: string,
    weightIncrement: number = 5,
): Promise<ProgressionNudge | null> {
    const db = await getDatabase();
    if (!db) return null;

    try {
        const rows = await db.getAllAsync<{
            session_num: number; max_weight: number; max_reps: number;
        }>(
            `WITH ranked AS (
                SELECT DENSE_RANK() OVER (ORDER BY w.completed_at DESC) AS session_num,
                    MAX(ws.weight) AS max_weight, MAX(ws.reps) AS max_reps
                FROM workout_sets ws
                JOIN workout_exercises we ON ws.workout_exercise_id = we.id
                JOIN workouts w ON we.workout_id = w.id
                WHERE we.exercise_id = ? AND w.status = 'completed'
                  AND ws.status = 'completed' AND ws.type = 'working'
                  AND ws.weight IS NOT NULL AND ws.reps IS NOT NULL
                GROUP BY w.id ORDER BY w.completed_at DESC
            )
            SELECT session_num, max_weight, max_reps FROM ranked
            WHERE session_num <= ? ORDER BY session_num ASC`,
            [exerciseId, NUDGE_THRESHOLD + 2],
        );

        const sessions: SessionData[] = rows.map(r => ({
            sessionNum: r.session_num, maxWeight: r.max_weight,
            maxReps: r.max_reps, sets: [],
        }));
        return detectNudge(sessions, weightIncrement);
    } catch (error) {
        console.error('[SmartSuggestions] Nudge failed:', error);
        return null;
    }
}

// ============================================================
// Regression Engine
// ============================================================

/**
 * Exponential-decay weighted linear regression.
 * Recent points weighted more: weight_i = decayFactor^(n-1-i).
 */
function weightedLinearRegression(
    data: { x: number; y: number }[],
): RegResult {
    const n = data.length;
    if (n < 2) return { slope: 0, intercept: data[0]?.y ?? 0, rSq: 0 };

    const weights = data.map((_, i) => Math.pow(DECAY_FACTOR, n - 1 - i));
    const totalW = weights.reduce((a, b) => a + b, 0);

    let sumWx = 0, sumWy = 0;
    for (let i = 0; i < n; i++) {
        sumWx += weights[i] * data[i].x;
        sumWy += weights[i] * data[i].y;
    }
    const mx = sumWx / totalW, my = sumWy / totalW;

    let covXY = 0, varX = 0, varY = 0;
    for (let i = 0; i < n; i++) {
        const dx = data[i].x - mx, dy = data[i].y - my;
        covXY += weights[i] * dx * dy;
        varX += weights[i] * dx * dx;
        varY += weights[i] * dy * dy;
    }

    if (varX === 0) return { slope: 0, intercept: my, rSq: 0 };

    const slope = covXY / varX;
    const intercept = my - slope * mx;
    const rSq = varY === 0 ? 0 : (covXY * covXY) / (varX * varY);

    return { slope, intercept, rSq };
}

// ============================================================
// Prediction Logic
// ============================================================

function predictSets(
    sessions: SessionData[],
    trainingPhase: TrainingPhase,
    weightIncrement: number,
): SetSuggestion[] {
    if (sessions.length < MIN_SESSIONS) return [];

    const weightData = sessions.map((s, i) => ({ x: i, y: s.maxWeight }));
    const reg = weightedLinearRegression(weightData);
    const nextIdx = sessions.length;

    const recentMax = Math.max(...sessions.slice(-3).map(s => s.maxWeight));
    let predicted: number;
    let confidence: SetSuggestion['confidence'];
    let source: SetSuggestion['source'];

    if (reg.rSq >= R_SQ_THRESHOLD) {
        predicted = reg.intercept + reg.slope * nextIdx;
        confidence = reg.rSq >= 0.7 ? 'high' : 'medium';
        source = 'direct';

        switch (trainingPhase) {
            case 'cut':
                predicted = Math.min(predicted, recentMax);
                break;
            case 'recovery':
                predicted = Math.min(predicted, recentMax * 0.95);
                confidence = 'low';
                break;
            case 'maintain':
                predicted = recentMax + (predicted - recentMax) * 0.5;
                break;
            case 'bulk':
                break;
        }
        predicted = Math.min(predicted, recentMax + weightIncrement);
    } else {
        predicted = recentMax;
        confidence = 'low';
        source = 'repeat_last';
    }

    predicted = Math.round(predicted / weightIncrement) * weightIncrement;
    if (predicted <= 0) predicted = weightIncrement;

    const predictedReps = calcPredictedReps(sessions, predicted);
    const lastSession = sessions[sessions.length - 1];

    return lastSession.sets.map(() => ({
        suggestedWeight: predicted,
        suggestedReps: predictedReps,
        confidence,
        source,
    }));
}

function calcPredictedReps(sessions: SessionData[], targetWeight: number): number | null {
    const tol = targetWeight * 0.05;
    let wSum = 0, wTotal = 0;
    const n = sessions.length;

    for (let si = 0; si < n; si++) {
        const sw = Math.pow(DECAY_FACTOR, n - 1 - si);
        for (const set of sessions[si].sets) {
            if (set.weight !== null && set.reps !== null &&
                set.weight >= targetWeight - tol && set.weight <= targetWeight + tol) {
                wSum += sw * set.reps;
                wTotal += sw;
            }
        }
    }
    return wTotal === 0 ? null : Math.round(wSum / wTotal);
}

function detectNudge(sessions: SessionData[], weightIncrement: number): ProgressionNudge | null {
    if (sessions.length < NUDGE_THRESHOLD) return null;

    const recent = sessions.slice(-NUDGE_THRESHOLD);
    const w = recent[0].maxWeight, r = recent[0].maxReps;
    if (w <= 0 || r <= 0) return null;

    if (!recent.every(s => s.maxWeight === w && s.maxReps >= r)) return null;

    let count = 0;
    for (let i = sessions.length - 1; i >= 0; i--) {
        if (sessions[i].maxWeight === w && sessions[i].maxReps >= r) count++;
        else break;
    }

    return {
        currentWeight: w, currentReps: r,
        consecutiveSessions: count,
        suggestedWeight: w + weightIncrement,
    };
}

// ============================================================
// Helpers
// ============================================================

/**
 * Group any row array with an exercise_id field into a Map keyed by exercise ID.
 * Used for batch query result grouping (PP-089).
 */
function groupRowsByExercise<T extends { exercise_id: string }>(
    rows: T[],
): Map<string, T[]> {
    const map = new Map<string, T[]>();
    for (const row of rows) {
        const arr = map.get(row.exercise_id);
        if (arr) {
            arr.push(row);
        } else {
            map.set(row.exercise_id, [row]);
        }
    }
    return map;
}

function groupBySession(rows: HistRow[]): SessionData[] {
    const map = new Map<number, SessionData>();

    for (const row of rows) {
        if (!map.has(row.session_num)) {
            map.set(row.session_num, {
                sessionNum: row.session_num, maxWeight: 0, maxReps: 0, sets: [],
            });
        }
        const s = map.get(row.session_num)!;
        s.sets.push({ weight: row.weight, reps: row.reps });
        if (row.weight !== null && row.weight > s.maxWeight) s.maxWeight = row.weight;
        if (row.reps !== null && row.reps > s.maxReps) s.maxReps = row.reps;
    }

    // Sort oldest → newest for regression x-axis
    return Array.from(map.values()).sort((a, b) => b.sessionNum - a.sessionNum);
}

function mode(values: number[]): number {
    const freq = new Map<number, number>();
    let maxC = 0, m = values[0];
    for (const v of values) {
        const c = (freq.get(v) ?? 0) + 1;
        freq.set(v, c);
        if (c > maxC) { maxC = c; m = v; }
    }
    return m;
}
