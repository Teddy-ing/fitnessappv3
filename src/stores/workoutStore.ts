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
import {
    persistWorkoutState,
    loadPersistedWorkout,
    clearPersistedWorkout,
} from './workoutPersistence';
import {
    getPreviousSetsForExercise,
    getPreviousSetsForExercises,
} from '../services/workoutService';
import { getSuggestionsForExercise } from '../services/smartSuggestionsService';
import { getSettings } from '../services/preferencesService';
import { type PreviousSetData } from '../models/workout';
import type { ExerciseSuggestion } from '../models/smartSuggestions';
import { useRestTimerStore } from './restTimerStore';

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

    // Previous session data per exercise (runtime only, not persisted)
    previousSets: Map<string, PreviousSetData[]>;

    // Smart suggestion data per exercise (runtime only, not persisted)
    exerciseSuggestions: Map<string, ExerciseSuggestion>;

    // Auto-collapse state per exercise (runtime only, not persisted)
    collapsedExercises: Set<string>;

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
    restoreWorkout: () => Promise<void>;

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

    // Actions - Phase 2: Menu actions
    updateExerciseNote: (exerciseId: string, note: string | null) => void;
    addWarmupSets: (exerciseId: string, count?: number) => void;
    replaceExercise: (exerciseId: string, newExercise: Exercise) => void;

    // Actions - Phase 3: Collapse + Notes
    toggleCollapse: (exerciseId: string) => void;
    updateWorkoutNote: (note: string | null) => void;

}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
    activeWorkout: null,
    lastCompletedSet: null,
    previousSets: new Map(),
    exerciseSuggestions: new Map(),
    collapsedExercises: new Set(),
    isEditMode: false,
    originalDuration: null,
    originalCompletedAt: null,
    originalStartedAt: null,


    // ========================================
    // Workout lifecycle
    // ========================================

    startWorkout: (name?: string) => {
        const workout = createWorkout(name);
        set({ activeWorkout: workout, previousSets: new Map(), exerciseSuggestions: new Map(), collapsedExercises: new Set(), isEditMode: false, originalDuration: null, originalCompletedAt: null, originalStartedAt: null });
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
            previousSets: new Map(),
            collapsedExercises: new Set(),
            isEditMode: true,
            originalDuration: workout.totalDuration ?? null,
            originalCompletedAt: workout.completedAt ?? null,
            originalStartedAt: workout.startedAt ?? null,
        });

        // Fetch previous sets for all exercises in the loaded workout
        const exerciseIds = workout.main.exercises.map(e => e.exerciseId);
        if (exerciseIds.length > 0) {
            getPreviousSetsForExercises(exerciseIds).then(prevMap => {
                set({ previousSets: prevMap });
            }).catch(err => {
                console.warn('[WorkoutStore] Failed to load previous sets for edit:', err);
            });
        }
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
            previousSets: new Map(),
            exerciseSuggestions: new Map(),
            collapsedExercises: new Set(),
            isEditMode: false,
            originalDuration: null,
            originalCompletedAt: null,
            originalStartedAt: null,
        });

        // Clear persisted state (fire-and-forget, non-critical)
        clearPersistedWorkout();

        return completedWorkout;
    },

    discardWorkout: () => {
        set({
            activeWorkout: null,
            lastCompletedSet: null,
            previousSets: new Map(),
            exerciseSuggestions: new Map(),
            collapsedExercises: new Set(),
            isEditMode: false,
            originalDuration: null,
            originalCompletedAt: null,
            originalStartedAt: null,
        });

        // Clear persisted state (fire-and-forget, non-critical)
        clearPersistedWorkout();
    },

    restoreWorkout: async () => {
        try {
            const persisted = await loadPersistedWorkout();
            if (persisted && persisted.activeWorkout) {
                set({
                    activeWorkout: persisted.activeWorkout as Workout,
                    isEditMode: persisted.isEditMode,
                    originalDuration: persisted.originalDuration,
                    originalCompletedAt: persisted.originalCompletedAt,
                    originalStartedAt: persisted.originalStartedAt,
                    lastCompletedSet: null,
                });
                console.log('[WorkoutStore] Restored in-progress workout from disk');
            }
        } catch (err) {
            console.warn('[WorkoutStore] Failed to restore workout:', err);
        }
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

        // Async: fetch previous sets for this exercise (non-blocking)
        getPreviousSetsForExercise(exercise.id).then(prevSets => {
            const { previousSets } = get();
            const updated = new Map(previousSets);
            updated.set(exercise.id, prevSets);
            set({ previousSets: updated });
        }).catch(err => {
            console.warn('[WorkoutStore] Failed to load previous sets:', err);
        });

        // Phase 7: Async fetch smart suggestions (gated by setting, non-blocking)
        getSettings().then(settings => {
            if (!settings.smartSuggestions) return;
            return getSuggestionsForExercise(
                exercise.id,
                settings.trainingPhase,
                settings.defaultWeightIncrement,
            ).then(suggestion => {
                const { exerciseSuggestions } = get();
                const updated = new Map(exerciseSuggestions);
                updated.set(exercise.id, suggestion);
                set({ exerciseSuggestions: updated });

                // Pre-populate rest timer with learned duration
                if (suggestion.smartRestDuration) {
                    useRestTimerStore.getState().setExerciseRestTime(
                        exercise.id, suggestion.smartRestDuration,
                    );
                }
            });
        }).catch(err => {
            console.warn('[WorkoutStore] Smart suggestions fetch failed:', err);
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

        // Auto-collapse: if all sets in this exercise are now completed, collapse
        if (wasCompleted) {
            const updatedExercise = exercises.find(ex => ex.id === exerciseId);
            if (updatedExercise && updatedExercise.sets.every(s => s.status === 'completed')) {
                const { collapsedExercises } = get();
                const updated = new Set(collapsedExercises);
                updated.add(exerciseId);
                set({ collapsedExercises: updated });
            }
        }
    },

    // ========================================
    // Phase 2: Menu actions
    // ========================================

    updateExerciseNote: (exerciseId: string, note: string | null) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;

        const exercises = activeWorkout.main.exercises.map(ex => {
            if (ex.id === exerciseId) {
                return { ...ex, note: note && note.trim() ? note.trim() : null };
            }
            return ex;
        });

        set({
            activeWorkout: {
                ...activeWorkout,
                main: { ...activeWorkout.main, exercises },
                updatedAt: new Date(),
            },
        });
    },

    addWarmupSets: (exerciseId: string, count: number = 2) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;

        const exercises = activeWorkout.main.exercises.map(ex => {
            if (ex.id === exerciseId) {
                // Create N warmup sets
                const warmupSets: WorkoutSet[] = Array.from({ length: count }, (_, i) =>
                    createSet(i, 'warmup')
                );
                // Reindex: warmups first, then existing sets
                const allSets = [...warmupSets, ...ex.sets].map((s, idx) => ({
                    ...s,
                    orderIndex: idx,
                }));
                return { ...ex, sets: allSets };
            }
            return ex;
        });

        set({
            activeWorkout: {
                ...activeWorkout,
                main: { ...activeWorkout.main, exercises },
                updatedAt: new Date(),
            },
        });
    },

    replaceExercise: (exerciseId: string, newExercise: Exercise) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;

        const exercises = activeWorkout.main.exercises.map(ex => {
            if (ex.id === exerciseId) {
                // Keep set structure, swap exercise definition, and clear entered data
                return {
                    ...ex,
                    exerciseId: newExercise.id,
                    exercise: newExercise,
                    sets: ex.sets.map(s => ({
                        ...s,
                        weight: null,
                        reps: null,
                        duration: null,
                        distance: null,
                        rpe: null,
                        rir: null,
                        status: 'pending' as const,
                        completedAt: null,
                    }))
                };
            }
            return ex;
        });

        // BH-034 fix: Clear the replaced exercise from collapsedExercises
        // to prevent the new exercise from inheriting a stale collapsed state
        const { collapsedExercises } = get();
        const updatedCollapsed = new Set(collapsedExercises);
        updatedCollapsed.delete(exerciseId);

        set({
            activeWorkout: {
                ...activeWorkout,
                main: { ...activeWorkout.main, exercises },
                updatedAt: new Date(),
            },
            collapsedExercises: updatedCollapsed,
        });

        // Fetch previous sets for the new exercise
        getPreviousSetsForExercise(newExercise.id).then(prevSets => {
            const { previousSets } = get();
            const updated = new Map(previousSets);
            updated.set(newExercise.id, prevSets);
            set({ previousSets: updated });
        }).catch(err => {
            console.warn('[WorkoutStore] Failed to load previous sets for replaced exercise:', err);
        });

        // Phase 7: Fetch smart suggestions for replaced exercise
        getSettings().then(settings => {
            if (!settings.smartSuggestions) return;
            return getSuggestionsForExercise(
                newExercise.id,
                settings.trainingPhase,
                settings.defaultWeightIncrement,
            ).then(suggestion => {
                const { exerciseSuggestions } = get();
                const updated = new Map(exerciseSuggestions);
                updated.set(newExercise.id, suggestion);
                set({ exerciseSuggestions: updated });

                // Pre-populate rest timer with learned duration
                if (suggestion.smartRestDuration) {
                    useRestTimerStore.getState().setExerciseRestTime(
                        newExercise.id, suggestion.smartRestDuration,
                    );
                }
            });
        }).catch(err => {
            console.warn('[WorkoutStore] Smart suggestions fetch failed for replaced exercise:', err);
        });
    },

    // ========================================
    // Phase 3: Collapse + Notes
    // ========================================

    toggleCollapse: (exerciseId: string) => {
        const { collapsedExercises } = get();
        const updated = new Set(collapsedExercises);
        if (updated.has(exerciseId)) {
            updated.delete(exerciseId);
        } else {
            updated.add(exerciseId);
        }
        set({ collapsedExercises: updated });
    },

    updateWorkoutNote: (note: string | null) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;

        set({
            activeWorkout: {
                ...activeWorkout,
                note: note && note.trim() ? note.trim() : null,
                updatedAt: new Date(),
            },
        });
    },
}));

export default useWorkoutStore;

// ============================================================
// Persistence subscriber (TD-021, PP-045)
// Only fires when persistence-relevant fields change.
// Previous implementation used bare subscribe() which fired on
// every state mutation (including lastCompletedSet, collapsedExercises,
// previousSets), running JSON.stringify on the entire workout tree
// even when nothing persistence-relevant changed.
// ============================================================

let _prevActiveWorkout: unknown = undefined;
let _prevIsEditMode: boolean | undefined = undefined;
let _prevOriginalDuration: number | null | undefined = undefined;
let _prevOriginalCompletedAt: Date | null | undefined = undefined;
let _prevOriginalStartedAt: Date | null | undefined = undefined;

useWorkoutStore.subscribe((state) => {
    // Skip if no persistence-relevant fields changed (reference equality)
    if (
        state.activeWorkout === _prevActiveWorkout &&
        state.isEditMode === _prevIsEditMode &&
        state.originalDuration === _prevOriginalDuration &&
        state.originalCompletedAt === _prevOriginalCompletedAt &&
        state.originalStartedAt === _prevOriginalStartedAt
    ) {
        return;
    }

    _prevActiveWorkout = state.activeWorkout;
    _prevIsEditMode = state.isEditMode;
    _prevOriginalDuration = state.originalDuration;
    _prevOriginalCompletedAt = state.originalCompletedAt;
    _prevOriginalStartedAt = state.originalStartedAt;

    persistWorkoutState({
        activeWorkout: state.activeWorkout,
        isEditMode: state.isEditMode,
        originalDuration: state.originalDuration,
        originalCompletedAt: state.originalCompletedAt,
        originalStartedAt: state.originalStartedAt,
    });
});
