/**
 * Tests for restTimerStore
 *
 * Covers the pure timer state machine: start, stop, tick, adjust,
 * per-exercise rest times. No side effects here (haptics, notifications
 * live in the RestTimer component).
 */

import { useRestTimerStore, DEFAULT_REST_DURATION } from '../restTimerStore';

// Reset store between tests
beforeEach(() => {
    useRestTimerStore.setState({
        restTimerDuration: DEFAULT_REST_DURATION,
        restTimerRemaining: 0,
        restTimerActive: false,
        restTimerEndTime: null,
        exerciseRestTimes: {},
        activeRestTimerExerciseId: null,
        activeRestTimerSetId: null,
    });
});

// ========================================
// startRestTimer
// ========================================

describe('startRestTimer', () => {
    it('starts with default duration when no seconds given', () => {
        useRestTimerStore.getState().startRestTimer();

        const state = useRestTimerStore.getState();
        expect(state.restTimerActive).toBe(true);
        expect(state.restTimerDuration).toBe(DEFAULT_REST_DURATION);
        expect(state.restTimerRemaining).toBe(DEFAULT_REST_DURATION);
        expect(state.restTimerEndTime).not.toBeNull();
    });

    it('starts with custom duration', () => {
        useRestTimerStore.getState().startRestTimer(90);

        const state = useRestTimerStore.getState();
        expect(state.restTimerDuration).toBe(90);
        expect(state.restTimerRemaining).toBe(90);
    });

    it('sets exercise and set IDs when provided', () => {
        useRestTimerStore.getState().startRestTimer(60, 'ex-1', 'set-1');

        const state = useRestTimerStore.getState();
        expect(state.activeRestTimerExerciseId).toBe('ex-1');
        expect(state.activeRestTimerSetId).toBe('set-1');
    });

    it('sets endTime properly', () => {
        const before = Date.now();
        useRestTimerStore.getState().startRestTimer(60);
        const after = Date.now();

        const { restTimerEndTime } = useRestTimerStore.getState();
        // endTime should be ~60 seconds from now
        expect(restTimerEndTime).toBeGreaterThanOrEqual(before + 60000);
        expect(restTimerEndTime).toBeLessThanOrEqual(after + 60000);
    });
});

// ========================================
// stopRestTimer
// ========================================

describe('stopRestTimer', () => {
    it('resets all timer state', () => {
        useRestTimerStore.getState().startRestTimer(60, 'ex-1', 'set-1');
        useRestTimerStore.getState().stopRestTimer();

        const state = useRestTimerStore.getState();
        expect(state.restTimerActive).toBe(false);
        expect(state.restTimerRemaining).toBe(0);
        expect(state.restTimerEndTime).toBeNull();
        expect(state.activeRestTimerExerciseId).toBeNull();
        expect(state.activeRestTimerSetId).toBeNull();
    });
});

// ========================================
// tickRestTimer
// ========================================

describe('tickRestTimer', () => {
    it('does nothing when timer is not active', () => {
        useRestTimerStore.getState().tickRestTimer();
        expect(useRestTimerStore.getState().restTimerRemaining).toBe(0);
    });

    it('updates remaining based on endTime', () => {
        // Start a 60-second timer, then shift endTime to 30 seconds from now
        useRestTimerStore.getState().startRestTimer(60);
        useRestTimerStore.setState({ restTimerEndTime: Date.now() + 30000 });

        useRestTimerStore.getState().tickRestTimer();

        const { restTimerRemaining } = useRestTimerStore.getState();
        expect(restTimerRemaining).toBe(30);
    });

    it('stops timer when remaining reaches 0', () => {
        useRestTimerStore.getState().startRestTimer(60);
        // Set endTime to the past
        useRestTimerStore.setState({ restTimerEndTime: Date.now() - 1000 });

        useRestTimerStore.getState().tickRestTimer();

        const state = useRestTimerStore.getState();
        expect(state.restTimerActive).toBe(false);
        expect(state.restTimerRemaining).toBe(0);
        expect(state.restTimerEndTime).toBeNull();
    });
});

// ========================================
// adjustRestTimer
// ========================================

describe('adjustRestTimer', () => {
    it('does nothing when timer is not active', () => {
        useRestTimerStore.getState().adjustRestTimer(30);
        expect(useRestTimerStore.getState().restTimerRemaining).toBe(0);
    });

    it('adds time to the timer', () => {
        useRestTimerStore.getState().startRestTimer(60);
        const remainingBefore = useRestTimerStore.getState().restTimerRemaining;

        useRestTimerStore.getState().adjustRestTimer(30);

        expect(useRestTimerStore.getState().restTimerRemaining).toBe(remainingBefore + 30);
        expect(useRestTimerStore.getState().restTimerDuration).toBe(90);
    });

    it('subtracts time, clamped to 0', () => {
        useRestTimerStore.getState().startRestTimer(20);
        useRestTimerStore.getState().adjustRestTimer(-30);

        expect(useRestTimerStore.getState().restTimerRemaining).toBe(0);
        // Duration can go to 0 too
        expect(useRestTimerStore.getState().restTimerDuration).toBe(0);
    });

    it('updates per-exercise rest time when exercise is active', () => {
        useRestTimerStore.getState().startRestTimer(60, 'ex-1', 'set-1');
        useRestTimerStore.getState().adjustRestTimer(30);

        // Should persist the new duration for this exercise
        const restTime = useRestTimerStore.getState().getExerciseRestTime('ex-1');
        expect(restTime).toBe(90);
    });
});

// ========================================
// Per-exercise rest times
// ========================================

describe('exercise rest times', () => {
    it('returns default when no custom time is set', () => {
        const restTime = useRestTimerStore.getState().getExerciseRestTime('unknown-exercise');
        expect(restTime).toBe(DEFAULT_REST_DURATION);
    });

    it('returns custom time when set', () => {
        useRestTimerStore.getState().setExerciseRestTime('ex-1', 90);
        expect(useRestTimerStore.getState().getExerciseRestTime('ex-1')).toBe(90);
    });

    it('adjusts active timer when setting rest time for active exercise', () => {
        useRestTimerStore.getState().startRestTimer(60, 'ex-1', 'set-1');
        useRestTimerStore.getState().setExerciseRestTime('ex-1', 90);

        const state = useRestTimerStore.getState();
        expect(state.restTimerDuration).toBe(90);
        expect(state.restTimerRemaining).toBe(90);
    });

    it('does not adjust timer when setting rest time for different exercise', () => {
        useRestTimerStore.getState().startRestTimer(60, 'ex-1', 'set-1');
        useRestTimerStore.getState().setExerciseRestTime('ex-2', 90);

        // Timer should remain at 60
        expect(useRestTimerStore.getState().restTimerDuration).toBe(60);
    });
});
