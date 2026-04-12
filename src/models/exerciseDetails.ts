/**
 * Exercise Details Models
 *
 * Types for the Exercise Details screen's History tab
 * and persistent exercise notes.
 */

import type { SetType } from './workout';

/**
 * A single set within a historical exercise session.
 */
export interface ExerciseSessionSet {
    setNumber: number;
    weight: number | null;
    reps: number | null;
    duration: number | null;
    type: SetType;
}

/**
 * One workout session where a specific exercise was performed.
 * Used by the History tab's timeline feed.
 */
export interface ExerciseSession {
    workoutId: string;
    workoutName: string;
    /** ISO date string of when the workout was completed */
    date: string;
    sets: ExerciseSessionSet[];
    /** SUM(weight × reps) for this exercise in this session */
    totalVolume: number;
}

/**
 * A single timestamped note for an exercise.
 * Users can have multiple notes per exercise (e.g., cues from different sessions).
 */
export interface ExerciseNote {
    id: string;
    exerciseId: string;
    note: string;
    /** ISO date string */
    createdAt: string;
}
