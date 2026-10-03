import type { Workout } from '../models/workout';
import { displayWeight } from './unitConversion';

/** Count completed work, including bodyweight and timed sets. Volume stays in pounds. */
export function getWorkoutSummary(workout: Workout) {
    let completedExercises = 0;
    let completedSets = 0;
    let totalVolume = 0;
    const muscleGroups = new Set<string>();

    for (const exercise of workout.main.exercises) {
        const sets = exercise.sets.filter(set => set.status === 'completed');
        if (sets.length === 0) continue;
        completedExercises++;
        completedSets += sets.length;
        for (const set of sets) {
            if (exercise.exercise.trackWeight && exercise.exercise.trackReps &&
                Number.isFinite(set.weight) && Number.isFinite(set.reps) &&
                (set.weight ?? 0) > 0 && (set.reps ?? 0) > 0) {
                totalVolume += set.weight! * set.reps!;
            }
        }
        for (const group of exercise.exercise.muscleGroups) {
            if (group.isPrimary) muscleGroups.add(group.muscle);
        }
    }

    return { completedExercises, completedSets, totalVolume, muscleGroups: [...muscleGroups] };
}

export function formatWorkoutDuration(seconds: number | null): string {
    const minutes = Math.floor(Math.max(0, seconds ?? 0) / 60);
    if (minutes === 0) return '<1 min';
    if (minutes < 60) return `${minutes} min`;
    const remainder = minutes % 60;
    return `${Math.floor(minutes / 60)} hr${remainder ? ` ${remainder} min` : ''}`;
}

export function formatWorkoutVolume(volume: number, weightUnit: string): string {
    return `${displayWeight(volume, weightUnit).toLocaleString(undefined, { maximumFractionDigits: 1 })} ${weightUnit}`;
}
