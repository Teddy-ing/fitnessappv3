/**
 * Workout Store
 * 
 * Zustand store for managing workout state.
 * Handles the active workout, exercises, sets, and rest timer.
 */

import { create } from 'zustand';
import * as Haptics from 'expo-haptics';
import { sendRestTimerNotification } from '../services/notificationService';
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
const DEFAULT_REST_DURATION = 120;

interface WorkoutState {
    // Current active workout (null if not working out)
    activeWorkout: Workout | null;

    // Rest timer state
    restTimerDuration: number;      // Total duration set
    restTimerRemaining: number;     // Seconds remaining
    restTimerActive: boolean;       // Is timer running?
    restTimerEndTime: number | null; // Timestamp when timer ends

    // Per-exercise rest times (exerciseId -> seconds)
    exerciseRestTimes: Record<string, number>;
    // Track which set triggered the current timer (for inline display)
    activeRestTimerExerciseId: string | null;
    activeRestTimerSetId: string | null;

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
    toggleSuperset: (exerciseId: string) => void;  // Link/unlink with next exercise

    // Actions - Set management
    addSet: (exerciseId: string) => void;
    removeSet: (exerciseId: string, setId: string) => void;
    updateSet: (exerciseId: string, setId: string, updates: Partial<WorkoutSet>) => void;
    completeSet: (exerciseId: string, setId: string) => void;

    // Actions - Rest timer
    startRestTimer: (seconds?: number, exerciseId?: string, setId?: string) => void;
    stopRestTimer: () => void;
    adjustRestTimer: (delta: number) => void;
    tickRestTimer: () => void;
    setExerciseRestTime: (exerciseId: string, seconds: number) => void;
    getExerciseRestTime: (exerciseId: string) => number;

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
    exerciseRestTimes: {},
    activeRestTimerExerciseId: null,
    activeRestTimerSetId: null,
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
            // Get per-exercise rest time or default
            const exerciseRestTime = get().exerciseRestTimes[exerciseId] ?? DEFAULT_REST_DURATION;
            startRestTimer(exerciseRestTime, exerciseId, setId);
        }
    },

    // ========================================
    // Rest timer
    // ========================================

    startRestTimer: (seconds?: number, exerciseId?: string, setId?: string) => {
        const duration = seconds ?? get().restTimerDuration;
        const endTime = Date.now() + (duration * 1000);

        set({
            restTimerDuration: duration,
            restTimerRemaining: duration,
            restTimerActive: true,
            restTimerEndTime: endTime,
            activeRestTimerExerciseId: exerciseId ?? null,
            activeRestTimerSetId: setId ?? null,
        });
    },

    stopRestTimer: () => {
        set({
            restTimerActive: false,
            restTimerRemaining: 0,
            restTimerEndTime: null,
            activeRestTimerExerciseId: null,
            activeRestTimerSetId: null,
        });
    },

    adjustRestTimer: (delta: number) => {
        const { restTimerRemaining, restTimerActive, restTimerEndTime, restTimerDuration, activeRestTimerExerciseId } = get();
        if (!restTimerActive) return;

        const newRemaining = Math.max(0, restTimerRemaining + delta);
        const newDuration = Math.max(0, restTimerDuration + delta);
        const newEndTime = restTimerEndTime ? restTimerEndTime + (delta * 1000) : null;

        // Also update the per-exercise rest time so future sets use this duration
        if (activeRestTimerExerciseId) {
            const { exerciseRestTimes } = get();
            set({
                exerciseRestTimes: {
                    ...exerciseRestTimes,
                    [activeRestTimerExerciseId]: newDuration,
                },
            });
        }

        set({
            restTimerRemaining: newRemaining,
            restTimerDuration: newDuration,
            restTimerEndTime: newEndTime,
        });
    },

    tickRestTimer: () => {
        const { restTimerActive, restTimerEndTime } = get();
        if (!restTimerActive || !restTimerEndTime) return;

        const remaining = Math.max(0, Math.ceil((restTimerEndTime - Date.now()) / 1000));

        if (remaining <= 0) {
            // Timer finished - trigger haptic feedback and notification
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            sendRestTimerNotification(); // Send notification (especially useful when in background)
            set({
                restTimerActive: false,
                restTimerRemaining: 0,
                restTimerEndTime: null,
                activeRestTimerExerciseId: null,
                activeRestTimerSetId: null,
            });
        } else {
            set({ restTimerRemaining: remaining });
        }
    },

    setExerciseRestTime: (exerciseId: string, seconds: number) => {
        const { exerciseRestTimes, restTimerActive, activeRestTimerExerciseId, restTimerEndTime } = get();

        // Update the per-exercise setting
        set({
            exerciseRestTimes: {
                ...exerciseRestTimes,
                [exerciseId]: seconds,
            },
        });

        // If there's an active timer for this exercise, adjust it
        if (restTimerActive && activeRestTimerExerciseId === exerciseId) {
            const newEndTime = Date.now() + (seconds * 1000);
            set({
                restTimerDuration: seconds,
                restTimerRemaining: seconds,
                restTimerEndTime: newEndTime,
            });
        }
    },

    getExerciseRestTime: (exerciseId: string) => {
        return get().exerciseRestTimes[exerciseId] ?? DEFAULT_REST_DURATION;
    },

    // ========================================
    // UI state
    // ========================================

    openExercisePicker: () => set({ isExercisePickerOpen: true }),
    closeExercisePicker: () => set({ isExercisePickerOpen: false }),
    focusExercise: (exerciseId: string | null) => set({ currentExerciseId: exerciseId }),
}));

export default useWorkoutStore;
