/**
 * Workout Store
 * 
 * Zustand store for managing active workout state.
 * Handles the workout lifecycle, exercises, and sets.
 * 
 * Rest timer logic lives in restTimerStore.ts.
 * The RestTimer component watches lastCompletedSet to auto-start timers.
 */

import { create } from 'zustand';
import {
    Workout,
    WorkoutExercise,
    WorkoutSet,
    WorkoutSection,
    createWorkout,
    createWorkoutExercise,
    createSet
} from '../models/workout';
import { Exercise } from '../models/exercise';

/** Signal emitted when a set is completed, watched by RestTimer */
export interface CompletedSetSignal {
    exerciseId: string;
    setId: string;
    timestamp: number;
}

interface WorkoutState {
    // Current active workout (null if not working out)
    activeWorkout: Workout | null;

    // Signal for timer auto-start (set by completeSet, consumed by RestTimer)
    lastCompletedSet: CompletedSetSignal | null;

    // Edit mode: true when editing a historical workout from the calendar
    isEditMode: boolean;
    originalDuration: number | null;
    originalCompletedAt: Date | null;
    originalStartedAt: Date | null;


    // Actions - Workout lifecycle
    startWorkout: (name?: string) => void;
    loadWorkoutForEditing: (workout: Workout) => void;
    finishWorkout: () => Promise<Workout | null>;
    discardWorkout: () => void;

    // Actions - Exercise management
    addExercise: (exercise: Exercise) => void;
    removeExercise: (exerciseId: string) => void;
    reorderExercises: (fromIndex: number, toIndex: number) => void;
    toggleSuperset: (exerciseId: string) => void;

    // Actions - Set management
    addSet: (exerciseId: string) => void;
    removeSet: (exerciseId: string, setId: string) => void;
    updateSet: (exerciseId: string, setId: string, updates: Partial<WorkoutSet>) => void;
    completeSet: (exerciseId: string, setId: string) => void;

}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
    activeWorkout: null,
    lastCompletedSet: null,
    isEditMode: false,
    originalDuration: null,
    originalCompletedAt: null,
    originalStartedAt: null,


    // ========================================
    // Workout lifecycle
    // ========================================

    startWorkout: (name?: string) => {
        const workout = createWorkout(name);
        set({ activeWorkout: workout, isEditMode: false, originalDuration: null, originalCompletedAt: null, originalStartedAt: null });
    },

    loadWorkoutForEditing: (workout: Workout) => {
        // Load historical workout for editing.
        // Set status to in_progress, reset completedAt, and update timestamps.
        // The original ID is preserved so updateWorkout updates the same record.
        set({
            activeWorkout: {
                ...workout,
                status: 'in_progress',
                completedAt: null,
                startedAt: new Date(),
                updatedAt: new Date(),
            },
            lastCompletedSet: null,
            isEditMode: true,
            originalDuration: workout.totalDuration ?? null,
            originalCompletedAt: workout.completedAt ?? null,
            originalStartedAt: workout.startedAt ?? null,
        });
    },

    finishWorkout: async () => {
        const { activeWorkout } = get();
        if (!activeWorkout) return null;

        const now = new Date();
        const duration = Math.floor((now.getTime() - activeWorkout.startedAt.getTime()) / 1000);

        // Calculate totals
        const allExercises = activeWorkout.main.exercises;
        let totalVolume = 0;
        let totalSets = 0;
        const muscleGroups = new Set<string>();

        allExercises.forEach(ex => {
            ex.sets.forEach(s => {
                if (s.status === 'completed' && s.weight && s.reps) {
                    totalVolume += s.weight * s.reps;
                    totalSets++;
                }
            });
            ex.exercise.muscleGroups.forEach(mg => {
                if (mg.isPrimary) muscleGroups.add(mg.muscle);
            });
        });

        const completedWorkout: Workout = {
            ...activeWorkout,
            status: 'completed',
            completedAt: now,
            totalDuration: duration,
            totalVolume,
            totalSets,
            muscleGroupsWorked: Array.from(muscleGroups),
            updatedAt: now,
        };

        set({
            activeWorkout: null,
            lastCompletedSet: null,
            isEditMode: false,
            originalDuration: null,
            originalCompletedAt: null,
            originalStartedAt: null,
        });

        return completedWorkout;
    },

    discardWorkout: () => {
        set({
            activeWorkout: null,
            lastCompletedSet: null,
            isEditMode: false,
            originalDuration: null,
            originalCompletedAt: null,
            originalStartedAt: null,
        });
    },

    // ========================================
    // Exercise management
    // ========================================

    addExercise: (exercise: Exercise) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;

        const newExercise = createWorkoutExercise(
            exercise,
            activeWorkout.main.exercises.length
        );

        set({
            activeWorkout: {
                ...activeWorkout,
                main: {
                    ...activeWorkout.main,
                    exercises: [...activeWorkout.main.exercises, newExercise],
                },
                updatedAt: new Date(),
            },
        });
    },

    removeExercise: (exerciseId: string) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;

        // Filter then reindex immutably (spread each to avoid mutating originals)
        const exercises = activeWorkout.main.exercises
            .filter(e => e.id !== exerciseId)
            .map((ex, idx) => ({ ...ex, orderIndex: idx }));

        set({
            activeWorkout: {
                ...activeWorkout,
                main: {
                    ...activeWorkout.main,
                    exercises,
                },
                updatedAt: new Date(),
            },
        });
    },

    reorderExercises: (fromIndex: number, toIndex: number) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;

        const reordered = [...activeWorkout.main.exercises];
        const [removed] = reordered.splice(fromIndex, 1);
        reordered.splice(toIndex, 0, removed);
        // Reindex immutably (spread each to avoid mutating originals)
        const exercises = reordered.map((ex, idx) => ({ ...ex, orderIndex: idx }));

        set({
            activeWorkout: {
                ...activeWorkout,
                main: {
                    ...activeWorkout.main,
                    exercises,
                },
                updatedAt: new Date(),
            },
        });
    },

    toggleSuperset: (exerciseId: string) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;

        const exerciseIndex = activeWorkout.main.exercises.findIndex(e => e.id === exerciseId);
        if (exerciseIndex === -1 || exerciseIndex >= activeWorkout.main.exercises.length - 1) return;

        const currentExercise = activeWorkout.main.exercises[exerciseIndex];
        const nextExercise = activeWorkout.main.exercises[exerciseIndex + 1];

        // Create new exercises array with immutable updates
        const exercises = activeWorkout.main.exercises.map((ex, idx) => {
            // If current exercise is already in a superset with next, remove the link
            if (currentExercise.supersetGroupId && currentExercise.supersetGroupId === nextExercise.supersetGroupId) {
                // Check if there are other exercises in this superset group
                const groupExercises = activeWorkout.main.exercises.filter(
                    e => e.supersetGroupId === currentExercise.supersetGroupId
                );

                if (groupExercises.length === 2) {
                    // Only these two, remove the group entirely
                    if (idx === exerciseIndex || idx === exerciseIndex + 1) {
                        return { ...ex, supersetGroupId: null };
                    }
                } else {
                    // Multiple exercises, just remove current from group
                    if (idx === exerciseIndex) {
                        return { ...ex, supersetGroupId: null };
                    }
                }
            } else {
                // Create or join superset
                if (idx === exerciseIndex || idx === exerciseIndex + 1) {
                    const newGroupId = nextExercise.supersetGroupId || currentExercise.supersetGroupId || `superset-${Date.now()}`;
                    return { ...ex, supersetGroupId: newGroupId };
                }
            }
            return ex;
        });

        set({
            activeWorkout: {
                ...activeWorkout,
                main: {
                    ...activeWorkout.main,
                    exercises,
                },
                updatedAt: new Date(),
            },
        });
    },

    // ========================================
    // Set management
    // ========================================

    addSet: (exerciseId: string) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;

        const exercises = activeWorkout.main.exercises.map(ex => {
            if (ex.id === exerciseId) {
                const newSet = createSet(ex.sets.length, 'working');
                // Copy weight from previous set if available
                if (ex.sets.length > 0) {
                    const lastSet = ex.sets[ex.sets.length - 1];
                    newSet.suggestedWeight = lastSet.weight;
                    newSet.suggestedReps = lastSet.reps;
                }
                return {
                    ...ex,
                    sets: [...ex.sets, newSet],
                };
            }
            return ex;
        });

        set({
            activeWorkout: {
                ...activeWorkout,
                main: {
                    ...activeWorkout.main,
                    exercises,
                },
                updatedAt: new Date(),
            },
        });
    },

    removeSet: (exerciseId: string, setId: string) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;

        const exercises = activeWorkout.main.exercises.map(ex => {
            if (ex.id === exerciseId) {
                // Filter then reindex immutably (spread each to avoid mutating originals)
                const sets = ex.sets
                    .filter(s => s.id !== setId)
                    .map((s, idx) => ({ ...s, orderIndex: idx }));
                return { ...ex, sets };
            }
            return ex;
        });

        set({
            activeWorkout: {
                ...activeWorkout,
                main: {
                    ...activeWorkout.main,
                    exercises,
                },
                updatedAt: new Date(),
            },
        });
    },

    updateSet: (exerciseId: string, setId: string, updates: Partial<WorkoutSet>) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;

        const exercises = activeWorkout.main.exercises.map(ex => {
            if (ex.id === exerciseId) {
                const sets = ex.sets.map(s => {
                    if (s.id === setId) {
                        return { ...s, ...updates };
                    }
                    return s;
                });
                return { ...ex, sets };
            }
            return ex;
        });

        set({
            activeWorkout: {
                ...activeWorkout,
                main: {
                    ...activeWorkout.main,
                    exercises,
                },
                updatedAt: new Date(),
            },
        });
    },

    completeSet: (exerciseId: string, setId: string) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;

        let wasCompleted = false;

        const exercises = activeWorkout.main.exercises.map(ex => {
            if (ex.id === exerciseId) {
                const sets = ex.sets.map(s => {
                    if (s.id === setId) {
                        // Check if we're marking as completed (not uncompleting)
                        wasCompleted = s.status !== 'completed';
                        return {
                            ...s,
                            status: s.status === 'completed' ? 'pending' : 'completed',
                            completedAt: s.status === 'completed' ? null : new Date(),
                        } as WorkoutSet;
                    }
                    return s;
                });
                return { ...ex, sets };
            }
            return ex;
        });

        set({
            activeWorkout: {
                ...activeWorkout,
                main: {
                    ...activeWorkout.main,
                    exercises,
                },
                updatedAt: new Date(),
            },
            // Signal for RestTimer to auto-start (only when completing, not uncompleting)
            ...(wasCompleted ? {
                lastCompletedSet: { exerciseId, setId, timestamp: Date.now() },
            } : {}),
        });
    },
}));

export default useWorkoutStore;

