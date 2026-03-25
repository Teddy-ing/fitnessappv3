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

import { useWorkoutStore } from '../workoutStore';
import { Exercise } from '../../models/exercise';

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
    useWorkoutStore.setState({
        activeWorkout: null,
        lastCompletedSet: null,
    });
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
