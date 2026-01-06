/**
 * Workout Store
 * 
 * Zustand store for managing workout state.
 * Handles the active workout, exercises, sets, and rest timer.
 */

import { create } from 'zustand';
import * as Haptics from 'expo-haptics';
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

// Default rest timer duration in seconds
const DEFAULT_REST_DURATION = 90;

interface WorkoutState {
    // Current active workout (null if not working out)
    activeWorkout: Workout | null;

    // Rest timer state
    restTimerDuration: number;      // Total duration set
    restTimerRemaining: number;     // Seconds remaining
    restTimerActive: boolean;       // Is timer running?
    restTimerEndTime: number | null; // Timestamp when timer ends

    // UI state
    isExercisePickerOpen: boolean;
    currentExerciseId: string | null; // For focusing on a specific exercise

    // Actions - Workout lifecycle
    startWorkout: (name?: string) => void;
    finishWorkout: () => Promise<Workout | null>;
    discardWorkout: () => void;

    // Actions - Exercise management
    addExercise: (exercise: Exercise) => void;
    removeExercise: (exerciseId: string) => void;
    reorderExercises: (fromIndex: number, toIndex: number) => void;

    // Actions - Set management
    addSet: (exerciseId: string) => void;
    removeSet: (exerciseId: string, setId: string) => void;
    updateSet: (exerciseId: string, setId: string, updates: Partial<WorkoutSet>) => void;
    completeSet: (exerciseId: string, setId: string) => void;

    // Actions - Rest timer
    startRestTimer: (seconds?: number) => void;
    stopRestTimer: () => void;
    adjustRestTimer: (delta: number) => void;
    tickRestTimer: () => void;

    // Actions - UI state
    openExercisePicker: () => void;
    closeExercisePicker: () => void;
    focusExercise: (exerciseId: string | null) => void;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
    activeWorkout: null,
    restTimerDuration: DEFAULT_REST_DURATION,
    restTimerRemaining: 0,
    restTimerActive: false,
    restTimerEndTime: null,
    isExercisePickerOpen: false,
    currentExerciseId: null,

    // ========================================
    // Workout lifecycle
    // ========================================

    startWorkout: (name?: string) => {
        const workout = createWorkout(name);
        set({ activeWorkout: workout });
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

        // Stop rest timer if running
        set({
            activeWorkout: null,
            restTimerActive: false,
            restTimerRemaining: 0,
            restTimerEndTime: null,
        });

        return completedWorkout;
    },

    discardWorkout: () => {
        set({
            activeWorkout: null,
            restTimerActive: false,
            restTimerRemaining: 0,
            restTimerEndTime: null,
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
            isExercisePickerOpen: false,
        });
    },

    removeExercise: (exerciseId: string) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;

        const exercises = activeWorkout.main.exercises.filter(e => e.id !== exerciseId);
        // Reindex
        exercises.forEach((ex, idx) => { ex.orderIndex = idx; });

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

        const exercises = [...activeWorkout.main.exercises];
        const [removed] = exercises.splice(fromIndex, 1);
        exercises.splice(toIndex, 0, removed);
        // Reindex
        exercises.forEach((ex, idx) => { ex.orderIndex = idx; });

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
                const sets = ex.sets.filter(s => s.id !== setId);
                // Reindex
                sets.forEach((s, idx) => { s.orderIndex = idx; });
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
        const { activeWorkout, startRestTimer } = get();
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
        });

        // Start rest timer when completing a set (not when uncompleting)
        if (wasCompleted) {
            startRestTimer();
        }
    },

    // ========================================
    // Rest timer
    // ========================================

    startRestTimer: (seconds?: number) => {
        const duration = seconds ?? get().restTimerDuration;
        const endTime = Date.now() + (duration * 1000);

        set({
            restTimerDuration: duration,
            restTimerRemaining: duration,
            restTimerActive: true,
            restTimerEndTime: endTime,
        });
    },

    stopRestTimer: () => {
        set({
            restTimerActive: false,
            restTimerRemaining: 0,
            restTimerEndTime: null,
        });
    },

    adjustRestTimer: (delta: number) => {
        const { restTimerRemaining, restTimerActive, restTimerEndTime } = get();
        if (!restTimerActive) return;

        const newRemaining = Math.max(0, restTimerRemaining + delta);
        const newEndTime = restTimerEndTime ? restTimerEndTime + (delta * 1000) : null;

        set({
            restTimerRemaining: newRemaining,
            restTimerEndTime: newEndTime,
        });
    },

    tickRestTimer: () => {
        const { restTimerActive, restTimerEndTime } = get();
        if (!restTimerActive || !restTimerEndTime) return;

        const remaining = Math.max(0, Math.ceil((restTimerEndTime - Date.now()) / 1000));

        if (remaining <= 0) {
            // Timer finished - trigger haptic feedback
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            set({
                restTimerActive: false,
                restTimerRemaining: 0,
                restTimerEndTime: null,
            });
        } else {
            set({ restTimerRemaining: remaining });
        }
    },

    // ========================================
    // UI state
    // ========================================

    openExercisePicker: () => set({ isExercisePickerOpen: true }),
    closeExercisePicker: () => set({ isExercisePickerOpen: false }),
    focusExercise: (exerciseId: string | null) => set({ currentExerciseId: exerciseId }),
}));

export default useWorkoutStore;
