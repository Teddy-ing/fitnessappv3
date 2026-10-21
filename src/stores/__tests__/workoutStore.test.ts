/**
 * Tests for workoutStore
 *
 * Covers the critical store actions that manage exercises and sets.
 * These are the actions most likely to cause data loss or bugs if broken.
 *
 * Testing strategy:
 *   - Call the store directly via useWorkoutStore.getState()
 *   - Start a workout, add exercises, then test each action
 *   - Verify immutability: original objects are NOT mutated
 */

// Mock persistence layer (expo-file-system unavailable in Jest)
jest.mock('../workoutPersistence', () => ({
    persistWorkoutState: jest.fn(),
    loadPersistedWorkout: jest.fn().mockResolvedValue(null),
    clearPersistedWorkout: jest.fn(),
}));
jest.mock('../../services/workoutService', () => ({
    getPreviousSetsForExercise: jest.fn().mockResolvedValue([]),
    getPreviousSetsForExercises: jest.fn().mockResolvedValue(new Map()),
}));
jest.mock('../../services/smartSuggestionsService', () => ({
    getSuggestionsForExercise: jest.fn().mockResolvedValue({}),
    getSuggestionsForExercises: jest.fn().mockResolvedValue(new Map()),
}));
jest.mock('../../services/preferencesService', () => ({
    getSettings: jest.fn().mockResolvedValue({ smartSuggestions: false }),
}));

import { useWorkoutStore } from '../workoutStore';
import { Exercise } from '../../models/exercise';
import { useRestTimerStore } from '../restTimerStore';
import { clearPersistedWorkout, loadPersistedWorkout } from '../workoutPersistence';
import { createWorkout, createWorkoutExercise, PreviousSetData, Workout } from '../../models/workout';
import { ExerciseSuggestion } from '../../models/smartSuggestions';
import { getPreviousSetsForExercise, getPreviousSetsForExercises } from '../../services/workoutService';
import { getSuggestionsForExercise, getSuggestionsForExercises } from '../../services/smartSuggestionsService';
import { getSettings } from '../../services/preferencesService';

// A minimal exercise fixture for testing
function makeExercise(id: string, name: string = 'Test Exercise'): Exercise {
    return {
        id,
        name,
        category: 'strength',
        muscleGroups: [{ muscle: 'chest', contribution: 100, isPrimary: true }],
        equipment: ['barbell'],
        trackWeight: true,
        trackReps: true,
        trackTime: false,
        trackDistance: false,
        isCustom: false,
        isHidden: false,
        isFavorite: false,
        createdAt: new Date(0),
        updatedAt: new Date(0),
    };
}

// Reset store between tests
beforeEach(() => {
    jest.clearAllMocks();
    useWorkoutStore.setState({
        activeWorkout: null,
        lastCompletedSet: null,
        isFinishing: false,
        isEditMode: false,
        originalDuration: null,
        originalCompletedAt: null,
        originalStartedAt: null,
    });
    useRestTimerStore.getState().stopRestTimer();
});

// ========================================
// Workout lifecycle
// ========================================

describe('startWorkout', () => {
    it('creates an active workout with empty exercises', () => {
        useWorkoutStore.getState().startWorkout('Test Workout');
        const { activeWorkout } = useWorkoutStore.getState();

        expect(activeWorkout).not.toBeNull();
        expect(activeWorkout!.name).toBe('Test Workout');
        expect(activeWorkout!.status).toBe('in_progress');
        expect(activeWorkout!.main.exercises).toHaveLength(0);
    });
});

describe('discardWorkout', () => {
    it('clears active workout and lastCompletedSet', () => {
        useWorkoutStore.getState().startWorkout();
        useWorkoutStore.getState().discardWorkout();

        const { activeWorkout, lastCompletedSet } = useWorkoutStore.getState();
        expect(activeWorkout).toBeNull();
        expect(lastCompletedSet).toBeNull();
    });
});

describe('finishWorkout', () => {
    function startCompletedWorkout() {
        const store = useWorkoutStore.getState();
        store.startWorkout('Strength');
        store.addExercise(makeExercise('bench'));
        const exercise = useWorkoutStore.getState().activeWorkout!.main.exercises[0];
        store.updateSet(exercise.id, exercise.sets[0].id, { weight: 100, reps: 8 });
        store.completeSet(exercise.id, exercise.sets[0].id);
        useRestTimerStore.getState().startRestTimer(120, exercise.id, exercise.sets[0].id);
        return useWorkoutStore.getState().activeWorkout!;
    }

    it('keeps the workout recoverable until persistence succeeds and rejects duplicate finishes', async () => {
        const active = startCompletedWorkout();
        let resolveSave!: () => void;
        const persist = jest.fn(() => new Promise<void>(resolve => { resolveSave = resolve; }));
        const first = useWorkoutStore.getState().finishWorkout(persist);

        expect(useWorkoutStore.getState().activeWorkout).toBe(active);
        expect(useWorkoutStore.getState().isFinishing).toBe(true);
        expect(clearPersistedWorkout).not.toHaveBeenCalled();
        expect(await useWorkoutStore.getState().finishWorkout(persist)).toBeNull();
        useWorkoutStore.getState().discardWorkout();
        expect(useWorkoutStore.getState().activeWorkout).toBe(active);
        expect(persist).toHaveBeenCalledTimes(1);

        resolveSave();
        const result = await first;
        expect(result).toMatchObject({ id: active.id, status: 'completed', totalSets: 1, totalVolume: 800 });
        expect(useWorkoutStore.getState().activeWorkout).toBeNull();
        expect(useWorkoutStore.getState().isFinishing).toBe(false);
        expect(clearPersistedWorkout).toHaveBeenCalledTimes(1);
        expect(useRestTimerStore.getState().restTimerActive).toBe(false);
    });

    it('retains the active workout, recovery file, and rest timer on save failure so retry succeeds', async () => {
        const active = startCompletedWorkout();
        const persist = jest.fn().mockRejectedValueOnce(new Error('Disk full')).mockResolvedValueOnce(undefined);
        await expect(useWorkoutStore.getState().finishWorkout(persist)).rejects.toThrow('Disk full');

        expect(useWorkoutStore.getState().activeWorkout).toBe(active);
        expect(useWorkoutStore.getState().isFinishing).toBe(false);
        expect(clearPersistedWorkout).not.toHaveBeenCalled();
        expect(useRestTimerStore.getState().restTimerActive).toBe(true);

        await expect(useWorkoutStore.getState().finishWorkout(persist)).resolves.toMatchObject({ id: active.id });
        expect(useWorkoutStore.getState().activeWorkout).toBeNull();
    });

    it('preserves the historical workout identity and timing while saving edits', async () => {
        const active = startCompletedWorkout();
        const historical = {
            ...active,
            startedAt: new Date('2026-08-12T12:00:00Z'),
            completedAt: new Date('2026-08-12T13:10:00Z'),
            totalDuration: 4200,
        };
        useWorkoutStore.getState().loadWorkoutForEditing(historical);
        const persist = jest.fn().mockRejectedValueOnce(new Error('Offline database')).mockResolvedValueOnce(undefined);
        await expect(useWorkoutStore.getState().finishWorkout(persist)).rejects.toThrow();
        expect(useWorkoutStore.getState().isEditMode).toBe(true);
        expect(useWorkoutStore.getState().originalDuration).toBe(4200);

        const result = await useWorkoutStore.getState().finishWorkout(persist);
        expect(result).toMatchObject({ id: historical.id, startedAt: historical.startedAt, completedAt: historical.completedAt, totalDuration: 4200 });
        expect(persist).toHaveBeenLastCalledWith(result, true);
        expect(useWorkoutStore.getState().isEditMode).toBe(false);
    });
});

// ========================================
// Exercise management
// ========================================

describe('addExercise', () => {
    it('appends exercise to the workout', () => {
        useWorkoutStore.getState().startWorkout();
        useWorkoutStore.getState().addExercise(makeExercise('ex-1', 'Bench Press'));

        const { activeWorkout } = useWorkoutStore.getState();
        expect(activeWorkout!.main.exercises).toHaveLength(1);
        expect(activeWorkout!.main.exercises[0].exercise.name).toBe('Bench Press');
    });



    it('does nothing if no active workout', () => {
        useWorkoutStore.getState().addExercise(makeExercise('ex-1'));
        expect(useWorkoutStore.getState().activeWorkout).toBeNull();
    });
});

describe('removeExercise', () => {
    it('removes the exercise and reindexes immutably', () => {
        const store = useWorkoutStore.getState();
        store.startWorkout();
        store.addExercise(makeExercise('ex-1', 'Bench'));
        store.addExercise(makeExercise('ex-2', 'Squat'));
        store.addExercise(makeExercise('ex-3', 'Deadlift'));

        // Grab a reference BEFORE removal
        const exercisesBefore = useWorkoutStore.getState().activeWorkout!.main.exercises;
        const secondExerciseBefore = exercisesBefore[1];

        // Remove the middle exercise
        const exToRemove = exercisesBefore[1].id;
        useWorkoutStore.getState().removeExercise(exToRemove);

        const exercisesAfter = useWorkoutStore.getState().activeWorkout!.main.exercises;
        expect(exercisesAfter).toHaveLength(2);
        expect(exercisesAfter[0].exercise.name).toBe('Bench');
        expect(exercisesAfter[1].exercise.name).toBe('Deadlift');

        // Verify reindexing
        expect(exercisesAfter[0].orderIndex).toBe(0);
        expect(exercisesAfter[1].orderIndex).toBe(1);

        // Verify immutability: original objects should NOT have been mutated
        expect(secondExerciseBefore.orderIndex).toBe(1); // unchanged from before
    });
});

describe('reorderExercises', () => {
    it('moves exercise from one position to another and reindexes', () => {
        const store = useWorkoutStore.getState();
        store.startWorkout();
        store.addExercise(makeExercise('ex-1', 'A'));
        store.addExercise(makeExercise('ex-2', 'B'));
        store.addExercise(makeExercise('ex-3', 'C'));

        // Grab reference before reorder
        const exercisesBefore = useWorkoutStore.getState().activeWorkout!.main.exercises;

        // Move C (index 2) to position 0
        useWorkoutStore.getState().reorderExercises(2, 0);

        const exercisesAfter = useWorkoutStore.getState().activeWorkout!.main.exercises;
        expect(exercisesAfter[0].exercise.name).toBe('C');
        expect(exercisesAfter[1].exercise.name).toBe('A');
        expect(exercisesAfter[2].exercise.name).toBe('B');

        // Verify reindexing
        expect(exercisesAfter[0].orderIndex).toBe(0);
        expect(exercisesAfter[1].orderIndex).toBe(1);
        expect(exercisesAfter[2].orderIndex).toBe(2);

        // Verify immutability: originals not mutated
        expect(exercisesBefore[0].orderIndex).toBe(0);
        expect(exercisesBefore[1].orderIndex).toBe(1);
        expect(exercisesBefore[2].orderIndex).toBe(2);
    });
});

// ========================================
// Set management
// ========================================

describe('removeSet', () => {
    it('removes a set and reindexes remaining sets immutably', () => {
        const store = useWorkoutStore.getState();
        store.startWorkout();
        store.addExercise(makeExercise('ex-1'));

        const exerciseId = useWorkoutStore.getState().activeWorkout!.main.exercises[0].id;
        const sets = useWorkoutStore.getState().activeWorkout!.main.exercises[0].sets;
        expect(sets.length).toBeGreaterThanOrEqual(3); // createWorkoutExercise makes 3 sets

        // Store reference to original set objects
        const setsBefore = [...sets];
        const setToRemoveId = sets[1].id;

        // Remove the middle set
        useWorkoutStore.getState().removeSet(exerciseId, setToRemoveId);

        const setsAfter = useWorkoutStore.getState().activeWorkout!.main.exercises[0].sets;
        expect(setsAfter).toHaveLength(sets.length - 1);

        // Verify reindexing
        setsAfter.forEach((s, idx) => {
            expect(s.orderIndex).toBe(idx);
        });

        // Verify immutability: original set objects not mutated
        expect(setsBefore[2].orderIndex).toBe(2); // was 2, should still be 2
    });
});

describe('completeSet', () => {
    it('toggles a pending set to completed and emits signal', () => {
        const store = useWorkoutStore.getState();
        store.startWorkout();
        store.addExercise(makeExercise('ex-1'));

        const exerciseId = useWorkoutStore.getState().activeWorkout!.main.exercises[0].id;
        const setId = useWorkoutStore.getState().activeWorkout!.main.exercises[0].sets[0].id;

        useWorkoutStore.getState().completeSet(exerciseId, setId);

        const set = useWorkoutStore.getState().activeWorkout!.main.exercises[0].sets[0];
        expect(set.status).toBe('completed');
        expect(set.completedAt).not.toBeNull();

        // Should emit lastCompletedSet signal
        const { lastCompletedSet } = useWorkoutStore.getState();
        expect(lastCompletedSet).not.toBeNull();
        expect(lastCompletedSet!.exerciseId).toBe(exerciseId);
        expect(lastCompletedSet!.setId).toBe(setId);
    });

    it('toggles a completed set back to pending without emitting signal', () => {
        const store = useWorkoutStore.getState();
        store.startWorkout();
        store.addExercise(makeExercise('ex-1'));

        const exerciseId = useWorkoutStore.getState().activeWorkout!.main.exercises[0].id;
        const setId = useWorkoutStore.getState().activeWorkout!.main.exercises[0].sets[0].id;

        // Complete, then uncomplete
        useWorkoutStore.getState().completeSet(exerciseId, setId);
        // Clear the signal to test it doesn't fire again
        useWorkoutStore.setState({ lastCompletedSet: null });

        useWorkoutStore.getState().completeSet(exerciseId, setId);

        const set = useWorkoutStore.getState().activeWorkout!.main.exercises[0].sets[0];
        expect(set.status).toBe('pending');
        expect(set.completedAt).toBeNull();

        // Should NOT emit a new signal when uncompleting
        expect(useWorkoutStore.getState().lastCompletedSet).toBeNull();
    });
});

describe('updateSet', () => {
    it('updates specific set fields without affecting others', () => {
        const store = useWorkoutStore.getState();
        store.startWorkout();
        store.addExercise(makeExercise('ex-1'));

        const exerciseId = useWorkoutStore.getState().activeWorkout!.main.exercises[0].id;
        const setId = useWorkoutStore.getState().activeWorkout!.main.exercises[0].sets[0].id;

        useWorkoutStore.getState().updateSet(exerciseId, setId, { weight: 135, reps: 8 });

        const set = useWorkoutStore.getState().activeWorkout!.main.exercises[0].sets[0];
        expect(set.weight).toBe(135);
        expect(set.reps).toBe(8);
        expect(set.status).toBe('pending'); // unchanged
    });
});

// ========================================
// Superset management
// ========================================

describe('toggleSuperset', () => {
    it('links two adjacent exercises into a superset', () => {
        const store = useWorkoutStore.getState();
        store.startWorkout();
        store.addExercise(makeExercise('ex-1', 'Bench'));
        store.addExercise(makeExercise('ex-2', 'Row'));

        const firstExId = useWorkoutStore.getState().activeWorkout!.main.exercises[0].id;
        useWorkoutStore.getState().toggleSuperset(firstExId);

        const exercises = useWorkoutStore.getState().activeWorkout!.main.exercises;
        expect(exercises[0].supersetGroupId).not.toBeNull();
        expect(exercises[0].supersetGroupId).toBe(exercises[1].supersetGroupId);
    });

    it('unlinks a two-exercise superset when toggled again', () => {
        const store = useWorkoutStore.getState();
        store.startWorkout();
        store.addExercise(makeExercise('ex-1', 'Bench'));
        store.addExercise(makeExercise('ex-2', 'Row'));

        const firstExId = useWorkoutStore.getState().activeWorkout!.main.exercises[0].id;

        // Link
        useWorkoutStore.getState().toggleSuperset(firstExId);
        // Unlink
        useWorkoutStore.getState().toggleSuperset(firstExId);

        const exercises = useWorkoutStore.getState().activeWorkout!.main.exercises;
        expect(exercises[0].supersetGroupId).toBeNull();
        expect(exercises[1].supersetGroupId).toBeNull();
    });

    it('does nothing for the last exercise (no next exercise to pair with)', () => {
        const store = useWorkoutStore.getState();
        store.startWorkout();
        store.addExercise(makeExercise('ex-1', 'Bench'));

        const onlyExId = useWorkoutStore.getState().activeWorkout!.main.exercises[0].id;
        useWorkoutStore.getState().toggleSuperset(onlyExId);

        const exercises = useWorkoutStore.getState().activeWorkout!.main.exercises;
        expect(exercises[0].supersetGroupId).toBeNull();
    });
});

// Runtime history/prediction requests must follow the workout and exercise that
// requested them, even when the user switches workouts before SQLite responds.
describe('asynchronous exercise data', () => {
    function deferred<T>() {
        let resolve!: (value: T) => void;
        const promise = new Promise<T>(done => { resolve = done; });
        return { promise, resolve };
    }
    const flush = () => new Promise<void>(resolve => setImmediate(resolve));
    const suggestion = (exerciseId: string, weight: number): ExerciseSuggestion => ({
        exerciseId,
        sets: [{ suggestedWeight: weight, suggestedReps: 10, confidence: 'high', source: 'direct' }],
        predictedSetCount: 3, smartRestDuration: weight + 60, progressionNudge: null,
    });
    const previous = (weight: number): PreviousSetData[] => [{ weight, reps: 10, type: 'working' }];
    const workoutWith = (...ids: string[]): Workout => {
        const workout = createWorkout('Template');
        workout.main.exercises = ids.map((id, index) => createWorkoutExercise(makeExercise(id), index));
        return workout;
    };

    beforeEach(() => {
        jest.mocked(getSettings).mockReset().mockResolvedValue({
            smartSuggestions: true, trainingPhase: 'maintain', defaultWeightIncrement: 5,
        } as Awaited<ReturnType<typeof getSettings>>);
        jest.mocked(getPreviousSetsForExercise).mockReset().mockResolvedValue([]);
        jest.mocked(getPreviousSetsForExercises).mockReset().mockResolvedValue(new Map());
        jest.mocked(getSuggestionsForExercise).mockReset().mockImplementation(async id => suggestion(id, 55));
        jest.mocked(getSuggestionsForExercises).mockReset().mockResolvedValue(new Map());
        jest.mocked(loadPersistedWorkout).mockReset().mockResolvedValue(null);
        useWorkoutStore.setState({ previousSets: new Map(), exerciseSuggestions: new Map(), collapsedExercises: new Set() });
        useRestTimerStore.setState({ exerciseRestTimes: {} });
    });

    it('ignores an old workout batch when a newer workout has the same exercise', async () => {
        const oldSuggestions = deferred<Map<string, ExerciseSuggestion>>();
        const oldPrevious = deferred<Map<string, PreviousSetData[]>>();
        jest.mocked(getSuggestionsForExercises).mockReturnValueOnce(oldSuggestions.promise);
        jest.mocked(getPreviousSetsForExercises).mockReturnValueOnce(oldPrevious.promise);
        useWorkoutStore.getState().startFromTemplate(workoutWith('bench'));
        await flush();

        const currentWorkout = workoutWith('bench');
        const currentSuggestion = suggestion('bench', 70);
        jest.mocked(getSuggestionsForExercises).mockResolvedValueOnce(new Map([['bench', currentSuggestion]]));
        jest.mocked(getPreviousSetsForExercises).mockResolvedValueOnce(new Map([['bench', previous(75)]]));
        useWorkoutStore.getState().startFromTemplate(currentWorkout);
        await flush();
        oldSuggestions.resolve(new Map([['bench', suggestion('bench', 50)]]));
        oldPrevious.resolve(new Map([['bench', previous(50)]]));
        await flush();

        expect(useWorkoutStore.getState().exerciseSuggestions.get('bench')).toEqual(currentSuggestion);
        expect(useWorkoutStore.getState().previousSets.get('bench')).toEqual(previous(75));
        expect(useRestTimerStore.getState().exerciseRestTimes.bench).toBe(130);
        expect(useWorkoutStore.getState().activeWorkout).toBe(currentWorkout);
    });

    it('clears old predictions on edit and rejects the prior lifecycle even for the same workout ID', async () => {
        const oldSuggestions = deferred<Map<string, ExerciseSuggestion>>();
        const workout = workoutWith('bench');
        jest.mocked(getSuggestionsForExercises).mockReturnValueOnce(oldSuggestions.promise);
        useWorkoutStore.getState().startFromTemplate(workout);
        await flush();
        useWorkoutStore.setState({ exerciseSuggestions: new Map([['bench', suggestion('bench', 40)]]) });
        useWorkoutStore.getState().loadWorkoutForEditing(workout);
        expect(useWorkoutStore.getState().exerciseSuggestions.size).toBe(0);
        await flush();
        oldSuggestions.resolve(new Map([['bench', suggestion('bench', 50)]]));
        await flush();

        expect(useWorkoutStore.getState().exerciseSuggestions.size).toBe(0);
        expect(useRestTimerStore.getState().exerciseRestTimes).toEqual({});
    });

    it('does not repopulate discarded workout data or learned rest times from a late single response', async () => {
        const oldSuggestions = deferred<ExerciseSuggestion>();
        const oldPrevious = deferred<PreviousSetData[]>();
        jest.mocked(getSuggestionsForExercise).mockReturnValueOnce(oldSuggestions.promise);
        jest.mocked(getPreviousSetsForExercise).mockReturnValueOnce(oldPrevious.promise);
        useWorkoutStore.getState().startWorkout();
        useWorkoutStore.getState().addExercise(makeExercise('bench'));
        await flush();
        useWorkoutStore.getState().discardWorkout();
        oldSuggestions.resolve(suggestion('bench', 50));
        oldPrevious.resolve(previous(50));
        await flush();

        expect(useWorkoutStore.getState().activeWorkout).toBeNull();
        expect(useWorkoutStore.getState().exerciseSuggestions.size).toBe(0);
        expect(useWorkoutStore.getState().previousSets.size).toBe(0);
        expect(useRestTimerStore.getState().exerciseRestTimes).toEqual({});
    });

    it('merges a late batch without erasing data for an exercise added after that batch began', async () => {
        const batchSuggestions = deferred<Map<string, ExerciseSuggestion>>();
        const batchPrevious = deferred<Map<string, PreviousSetData[]>>();
        jest.mocked(getSuggestionsForExercises).mockReturnValueOnce(batchSuggestions.promise);
        jest.mocked(getPreviousSetsForExercises).mockReturnValueOnce(batchPrevious.promise);
        useWorkoutStore.getState().startFromTemplate(workoutWith('bench'));
        await flush();
        jest.mocked(getPreviousSetsForExercise).mockResolvedValueOnce(previous(80));
        useWorkoutStore.getState().addExercise(makeExercise('row'));
        await flush();
        batchSuggestions.resolve(new Map([['bench', suggestion('bench', 60)]]));
        batchPrevious.resolve(new Map([['bench', previous(65)]]));
        await flush();

        expect([...useWorkoutStore.getState().exerciseSuggestions.keys()]).toEqual(['row', 'bench']);
        expect(useWorkoutStore.getState().previousSets.get('row')).toEqual(previous(80));
        expect(useWorkoutStore.getState().previousSets.get('bench')).toEqual(previous(65));
    });

    it('rejects the replaced exercise from a batch while keeping responses for unchanged exercises', async () => {
        const batchSuggestions = deferred<Map<string, ExerciseSuggestion>>();
        const batchPrevious = deferred<Map<string, PreviousSetData[]>>();
        jest.mocked(getSuggestionsForExercises).mockReturnValueOnce(batchSuggestions.promise);
        jest.mocked(getPreviousSetsForExercises).mockReturnValueOnce(batchPrevious.promise);
        const workout = workoutWith('bench', 'row');
        useWorkoutStore.getState().startFromTemplate(workout);
        await flush();
        useWorkoutStore.getState().replaceExercise(workout.main.exercises[0].id, makeExercise('press'));
        await flush();
        batchSuggestions.resolve(new Map([['bench', suggestion('bench', 60)], ['row', suggestion('row', 80)]]));
        batchPrevious.resolve(new Map([['bench', previous(65)], ['row', previous(85)]]));
        await flush();

        expect([...useWorkoutStore.getState().exerciseSuggestions.keys()]).toEqual(['press', 'row']);
        expect(useWorkoutStore.getState().previousSets.has('bench')).toBe(false);
        expect(useWorkoutStore.getState().previousSets.get('row')).toEqual(previous(85));
        expect(useRestTimerStore.getState().exerciseRestTimes.bench).toBeUndefined();
    });

    it('rejects an old response after replacing an exercise away and then back to the same ID', async () => {
        const oldSuggestions = deferred<ExerciseSuggestion>();
        const oldPrevious = deferred<PreviousSetData[]>();
        jest.mocked(getSuggestionsForExercise).mockReturnValueOnce(oldSuggestions.promise);
        jest.mocked(getPreviousSetsForExercise).mockReturnValueOnce(oldPrevious.promise);
        useWorkoutStore.getState().startWorkout();
        useWorkoutStore.getState().addExercise(makeExercise('bench'));
        await flush();
        const rowId = useWorkoutStore.getState().activeWorkout!.main.exercises[0].id;
        useWorkoutStore.getState().replaceExercise(rowId, makeExercise('press'));
        await flush();
        useWorkoutStore.getState().replaceExercise(rowId, makeExercise('bench'));
        await flush();
        oldSuggestions.resolve(suggestion('bench', 20));
        oldPrevious.resolve(previous(20));
        await flush();

        expect(useWorkoutStore.getState().exerciseSuggestions.get('bench')).toEqual(suggestion('bench', 55));
        expect(useWorkoutStore.getState().previousSets.get('bench')).toEqual([]);
        expect(useRestTimerStore.getState().exerciseRestTimes.bench).toBe(115);
    });

    it('rejects removed instances even when the same exercise is added again', async () => {
        const oldSuggestions = deferred<ExerciseSuggestion>();
        jest.mocked(getSuggestionsForExercise).mockReturnValueOnce(oldSuggestions.promise);
        useWorkoutStore.getState().startWorkout();
        useWorkoutStore.getState().addExercise(makeExercise('bench'));
        await flush();
        const oldRowId = useWorkoutStore.getState().activeWorkout!.main.exercises[0].id;
        useWorkoutStore.getState().removeExercise(oldRowId);
        useWorkoutStore.getState().addExercise(makeExercise('bench'));
        await flush();
        oldSuggestions.resolve(suggestion('bench', 20));
        await flush();

        expect(useWorkoutStore.getState().exerciseSuggestions.get('bench')).toEqual(suggestion('bench', 55));
        expect(useWorkoutStore.getState().activeWorkout!.main.exercises[0].id).not.toBe(oldRowId);
    });

    it('restores with fresh runtime maps while preserving saved set values', async () => {
        const workout = workoutWith('bench');
        workout.main.exercises[0].sets[0].weight = 60;
        workout.main.exercises[0].sets[0].reps = 10;
        useWorkoutStore.setState({
            exerciseSuggestions: new Map([['bench', suggestion('bench', 40)]]),
            previousSets: new Map([['bench', previous(40)]]),
            collapsedExercises: new Set(['old-row']),
        });
        jest.mocked(loadPersistedWorkout).mockResolvedValueOnce({
            activeWorkout: workout, isEditMode: false, originalDuration: null,
            originalStartedAt: null, originalCompletedAt: null,
        });
        await useWorkoutStore.getState().restoreWorkout();
        await flush();

        expect(useWorkoutStore.getState().exerciseSuggestions.size).toBe(0);
        expect(useWorkoutStore.getState().previousSets.size).toBe(0);
        expect(useWorkoutStore.getState().collapsedExercises.size).toBe(0);
        expect(useWorkoutStore.getState().activeWorkout).toBe(workout);
        expect(workout.main.exercises[0].sets[0]).toMatchObject({ weight: 60, reps: 10 });
    });

    it('does not let a delayed disk restore replace a newly started workout', async () => {
        const disk = deferred<Awaited<ReturnType<typeof loadPersistedWorkout>>>();
        jest.mocked(loadPersistedWorkout).mockReturnValueOnce(disk.promise);
        const restoring = useWorkoutStore.getState().restoreWorkout();
        useWorkoutStore.getState().startWorkout('New session');
        const current = useWorkoutStore.getState().activeWorkout;
        disk.resolve({
            activeWorkout: workoutWith('bench'), isEditMode: false, originalDuration: null,
            originalStartedAt: null, originalCompletedAt: null,
        });
        await restoring;
        await flush();

        expect(useWorkoutStore.getState().activeWorkout).toBe(current);
        expect(getSuggestionsForExercises).not.toHaveBeenCalled();
    });

    it('keeps predictions and previous-session values separate without changing logged sets', async () => {
        const workout = workoutWith('bench');
        workout.main.exercises[0].sets[0].weight = 65;
        workout.main.exercises[0].sets[0].reps = 8;
        jest.mocked(getSuggestionsForExercises).mockResolvedValueOnce(new Map([['bench', suggestion('bench', 55)]]));
        jest.mocked(getPreviousSetsForExercises).mockResolvedValueOnce(new Map([['bench', previous(60)]]));
        useWorkoutStore.getState().startFromTemplate(workout);
        await flush();

        expect(useWorkoutStore.getState().exerciseSuggestions.get('bench')?.sets[0].suggestedWeight).toBe(55);
        expect(useWorkoutStore.getState().previousSets.get('bench')?.[0].weight).toBe(60);
        expect(useWorkoutStore.getState().activeWorkout).toBe(workout);
        expect(workout.main.exercises[0].sets[0]).toMatchObject({ weight: 65, reps: 8 });
    });
});
