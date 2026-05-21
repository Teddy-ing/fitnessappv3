/**
 * Smart Suggestions Service
 *
 * Core prediction engine for Phase 7 personalization.
 * All predictions computed from existing workout data via SQL + JS stats.
 * No ML frameworks — pure weighted linear regression.
 */

import { getDatabase } from './database';
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
 */
export async function getSuggestionsForExercise(
    exerciseId: string,
    trainingPhase: TrainingPhase,
    weightIncrement: number = 5,
): Promise<ExerciseSuggestion> {
    const empty: ExerciseSuggestion = {
        exerciseId, sets: [], predictedSetCount: 0,
        smartRestDuration: null, progressionNudge: null,
    };

    const db = await getDatabase();
    if (!db) return empty;

    try {
        const rows = await db.getAllAsync<HistRow>(
            `WITH ranked AS (
                SELECT we.exercise_id, w.completed_at,
                    ws.order_index AS set_index, ws.weight, ws.reps, ws.type,
                    DENSE_RANK() OVER (ORDER BY w.completed_at DESC) AS session_num
                FROM workout_sets ws
                JOIN workout_exercises we ON ws.workout_exercise_id = we.id
                JOIN workouts w ON we.workout_id = w.id
                WHERE we.exercise_id = ?
                  AND w.status = 'completed' AND ws.status = 'completed'
                  AND ws.type = 'working'
            )
            SELECT session_num, completed_at, set_index, weight, reps, type
            FROM ranked WHERE session_num <= ?
            ORDER BY session_num ASC, set_index ASC`,
            [exerciseId, HISTORY_DEPTH],
        );

        if (rows.length === 0) return empty;

        const sessions = groupBySession(rows);
        if (sessions.length < MIN_SESSIONS) return empty;

        const setSuggestions = predictSets(sessions, trainingPhase, weightIncrement);
        const predictedSetCount = await getPredictedSetCount(exerciseId);
        const smartRestDuration = await getSmartRestDuration(exerciseId);
        const progressionNudge = detectNudge(sessions, weightIncrement);

        return {
            exerciseId, sets: setSuggestions,
            predictedSetCount: predictedSetCount ?? 0,
            smartRestDuration, progressionNudge,
        };
    } catch (error) {
        console.error('[SmartSuggestions] Failed:', error);
        return empty;
    }
}

/**
 * Batch-fetch suggestions for multiple exercises.
 */
export async function getSuggestionsForExercises(
    exerciseIds: string[],
    trainingPhase: TrainingPhase,
    weightIncrement: number = 5,
): Promise<Map<string, ExerciseSuggestion>> {
    const result = new Map<string, ExerciseSuggestion>();
    if (exerciseIds.length === 0) return result;

    const promises = exerciseIds.map(async (id) => {
        const s = await getSuggestionsForExercise(id, trainingPhase, weightIncrement);
        result.set(id, s);
    });
    await Promise.all(promises);
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
