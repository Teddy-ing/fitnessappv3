/**
 * Rest Timer Store
 *
 * Standalone Zustand store for the rest timer state machine.
 * Extracted from workoutStore to separate concerns and prevent
 * unnecessary re-renders of workout components on every tick.
 *
 * Side effects (haptics, notifications) are NOT in this store —
 * they live in useRestTimerLifecycle at the app root.
 */

import { create } from 'zustand';

// Default rest timer duration in seconds
export const DEFAULT_REST_DURATION = 120;

interface RestTimerState {
    // Timer state
    restTimerDuration: number;          // Total duration set
    restTimerRemaining: number;         // Seconds remaining
    restTimerActive: boolean;           // Is timer running?
    restTimerEndTime: number | null;    // Timestamp when timer ends

    // Why the timer stopped (null while running or before first use)
    timerCompletionReason: 'expired' | 'skipped' | null;

    // Per-exercise rest times (exerciseId -> seconds)
    exerciseRestTimes: Record<string, number>;

    // Track which set triggered the current timer (for inline display)
    activeRestTimerExerciseId: string | null;
    activeRestTimerSetId: string | null;

    // Actions
    startRestTimer: (seconds?: number, exerciseId?: string, setId?: string) => void;
    stopRestTimer: () => void;
    adjustRestTimer: (delta: number) => void;
    tickRestTimer: () => void;
    setExerciseRestTime: (exerciseId: string, seconds: number) => void;
    getExerciseRestTime: (exerciseId: string) => number;
}

export const useRestTimerStore = create<RestTimerState>((set, get) => ({
    restTimerDuration: DEFAULT_REST_DURATION,
    restTimerRemaining: 0,
    restTimerActive: false,
    restTimerEndTime: null,
    timerCompletionReason: null,
    exerciseRestTimes: {},
    activeRestTimerExerciseId: null,
    activeRestTimerSetId: null,

    startRestTimer: (seconds?: number, exerciseId?: string, setId?: string) => {
        const duration = Math.max(0, seconds ?? get().restTimerDuration);
        const endTime = Date.now() + (duration * 1000);

        set({
            restTimerDuration: duration,
            restTimerRemaining: duration,
            restTimerActive: duration > 0,
            restTimerEndTime: duration > 0 ? endTime : null,
            timerCompletionReason: duration > 0 ? null : 'skipped',
            activeRestTimerExerciseId: duration > 0 ? exerciseId ?? null : null,
            activeRestTimerSetId: duration > 0 ? setId ?? null : null,
        });
    },

    stopRestTimer: () => {
        set({
            restTimerActive: false,
            restTimerRemaining: 0,
            restTimerEndTime: null,
            timerCompletionReason: 'skipped',
            activeRestTimerExerciseId: null,
            activeRestTimerSetId: null,
        });
    },

    adjustRestTimer: (delta: number) => {
        const { restTimerActive, restTimerEndTime, restTimerDuration, activeRestTimerExerciseId } = get();
        if (!restTimerActive || restTimerEndTime === null) return;

        const newEndTime = restTimerEndTime + (delta * 1000);
        const newRemaining = Math.max(0, Math.ceil((newEndTime - Date.now()) / 1000));
        const newDuration = Math.max(0, restTimerDuration + delta);

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
            restTimerEndTime: newRemaining > 0 ? newEndTime : null,
            ...(newRemaining === 0 ? {
                restTimerActive: false,
                timerCompletionReason: 'skipped' as const,
                activeRestTimerExerciseId: null,
                activeRestTimerSetId: null,
            } : {}),
        });
    },

    /**
     * Pure tick — calculates remaining time from endTime.
     * When timer reaches 0, sets restTimerActive to false.
     * Side effects (haptics, notifications) are handled by the
     * app-level timer lifecycle watching state changes.
     */
    tickRestTimer: () => {
        const { restTimerActive, restTimerEndTime } = get();
        if (!restTimerActive || !restTimerEndTime) return;

        const remaining = Math.max(0, Math.ceil((restTimerEndTime - Date.now()) / 1000));

        if (remaining <= 0) {
            set({
                restTimerActive: false,
                restTimerRemaining: 0,
                restTimerEndTime: null,
                timerCompletionReason: 'expired',
                activeRestTimerExerciseId: null,
                activeRestTimerSetId: null,
            });
        } else {
            set({ restTimerRemaining: remaining });
        }
    },

    setExerciseRestTime: (exerciseId: string, seconds: number) => {
        seconds = Math.max(0, seconds);
        const { exerciseRestTimes, restTimerActive, activeRestTimerExerciseId } = get();

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
            if (seconds === 0) get().stopRestTimer();
        }
    },

    getExerciseRestTime: (exerciseId: string) => {
        return get().exerciseRestTimes[exerciseId] ?? DEFAULT_REST_DURATION;
    },
}));

export default useRestTimerStore;
