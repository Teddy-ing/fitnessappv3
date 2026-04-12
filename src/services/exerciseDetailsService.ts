/**
 * Exercise Details Service
 *
 * Data access for the Exercise Details screen:
 * - Persistent exercise notes (CRUD on exercise_notes table)
 * - Session history (paginated query for History tab)
 *
 * Follows conventions:
 * - Uses getDatabase() pattern
 * - Returns typed results (never `any`)
 * - Returns empty/null when DB unavailable
 * - Services do not reach into stores (Guardrail #9)
 */

import { getDatabase } from './database';
import { ExerciseSession, ExerciseSessionSet, ExerciseNote } from '../models/exerciseDetails';
import type { SetType } from '../models/workout';
import * as Crypto from 'expo-crypto';

// ============================================================
// Row types (typed DB results)
// ============================================================

interface NoteRow {
    id: string;
    exercise_id: string;
    note: string;
    created_at: string;
}

interface SessionHeaderRow {
    workout_id: string;
    workout_name: string;
    completed_at: string;
}

interface SessionSetRow {
    workout_id: string;
    order_index: number;
    weight: number | null;
    reps: number | null;
    duration: number | null;
    type: string;
}

// ============================================================
// Exercise Notes (Multi-note)
// ============================================================

/**
 * Get all notes for an exercise, newest first.
 */
export async function getExerciseNotes(exerciseId: string): Promise<ExerciseNote[]> {
    const db = await getDatabase();
    if (!db) return [];

    try {
        const rows = await db.getAllAsync<NoteRow>(
            `SELECT id, exercise_id, note, created_at
             FROM exercise_notes
             WHERE exercise_id = ?
             ORDER BY created_at DESC`,
            [exerciseId],
        );
        return rows.map((r) => ({
            id: r.id,
            exerciseId: r.exercise_id,
            note: r.note,
            createdAt: r.created_at,
        }));
    } catch (error) {
        console.error('[ExerciseDetails] Failed to get exercise notes:', error);
        return [];
    }
}

/**
 * Save a new note for an exercise. Each call creates a new timestamped entry.
 */
export async function saveExerciseNote(exerciseId: string, note: string): Promise<void> {
    const db = await getDatabase();
    if (!db) return;

    const trimmed = note.trim();
    if (!trimmed) return;

    try {
        const id = Crypto.randomUUID();
        await db.runAsync(
            `INSERT INTO exercise_notes (id, exercise_id, note, created_at)
             VALUES (?, ?, ?, datetime('now'))`,
            [id, exerciseId, trimmed],
        );
    } catch (error) {
        console.error('[ExerciseDetails] Failed to save exercise note:', error);
    }
}

/**
 * Delete a specific note by its ID.
 */
export async function deleteExerciseNote(noteId: string): Promise<void> {
    const db = await getDatabase();
    if (!db) return;

    try {
        await db.runAsync(
            `DELETE FROM exercise_notes WHERE id = ?`,
            [noteId],
        );
    } catch (error) {
        console.error('[ExerciseDetails] Failed to delete exercise note:', error);
    }
}

// ============================================================
// Session History (Paginated)
// ============================================================

/**
 * Get full session history for an exercise, paginated.
 *
 * Returns a chronological feed (newest first) of every workout session
 * that included this exercise, with set details and volume.
 *
 * @param exerciseId - The exercise ID to query
 * @param limit - Max sessions to return (default: 20)
 * @param offset - Number of sessions to skip (for pagination)
 */
export async function getExerciseSessionHistory(
    exerciseId: string,
    limit: number = 20,
    offset: number = 0,
): Promise<ExerciseSession[]> {
    const db = await getDatabase();
    if (!db) return [];

    try {
        // Step 1: Get workout headers that contain this exercise
        const headers = await db.getAllAsync<SessionHeaderRow>(
            `SELECT DISTINCT
                w.id AS workout_id,
                w.name AS workout_name,
                w.completed_at
             FROM workouts w
             JOIN workout_exercises we ON w.id = we.workout_id
             WHERE we.exercise_id = ?
               AND w.status = 'completed'
             ORDER BY w.completed_at DESC
             LIMIT ? OFFSET ?`,
            [exerciseId, limit, offset],
        );

        if (headers.length === 0) return [];

        // Step 2: Get all sets for this exercise across those workouts
        // Batch the workout IDs to respect the 500-ID chunking guardrail
        const BATCH_SIZE = 500;
        const allSets: SessionSetRow[] = [];

        for (let i = 0; i < headers.length; i += BATCH_SIZE) {
            const batch = headers.slice(i, i + BATCH_SIZE);
            const placeholders = batch.map(() => '?').join(',');
            const workoutIds = batch.map((h) => h.workout_id);

            const rows = await db.getAllAsync<SessionSetRow>(
                `SELECT
                    we.workout_id,
                    ws.order_index,
                    ws.weight,
                    ws.reps,
                    ws.duration,
                    ws.type
                 FROM workout_sets ws
                 JOIN workout_exercises we ON ws.workout_exercise_id = we.id
                 WHERE we.exercise_id = ?
                   AND we.workout_id IN (${placeholders})
                 ORDER BY we.workout_id, ws.order_index ASC`,
                [exerciseId, ...workoutIds],
            );
            allSets.push(...rows);
        }

        // Step 3: Group sets by workout ID
        const setsByWorkout = new Map<string, SessionSetRow[]>();
        for (const setRow of allSets) {
            const existing = setsByWorkout.get(setRow.workout_id) ?? [];
            existing.push(setRow);
            setsByWorkout.set(setRow.workout_id, existing);
        }

        // Step 4: Build ExerciseSession objects
        return headers.map((header) => {
            const rawSets = setsByWorkout.get(header.workout_id) ?? [];
            let workingSetNumber = 0;

            const sets: ExerciseSessionSet[] = rawSets.map((s) => {
                if (s.type !== 'warmup') {
                    workingSetNumber++;
                }
                return {
                    setNumber: s.type === 'warmup' ? 0 : workingSetNumber,
                    weight: s.weight,
                    reps: s.reps,
                    duration: s.duration,
                    type: s.type as SetType,
                };
            });

            // Calculate volume for this exercise in this session
            const totalVolume = rawSets.reduce((sum, s) => {
                if (s.weight && s.reps && s.type !== 'warmup') {
                    return sum + s.weight * s.reps;
                }
                return sum;
            }, 0);

            return {
                workoutId: header.workout_id,
                workoutName: header.workout_name,
                date: header.completed_at,
                sets,
                totalVolume: Math.round(totalVolume),
            };
        });
    } catch (error) {
        console.error('[ExerciseDetails] Failed to get session history:', error);
        return [];
    }
}
