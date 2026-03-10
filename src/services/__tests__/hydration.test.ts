/**
 * Tests for hydration mapping functions
 *
 * These functions convert raw database rows (snake_case) into typed
 * domain models (camelCase). They are the most critical data path —
 * a mismatch between column names and property access will cause
 * silent runtime bugs.
 *
 * All functions tested here are pure (no DB calls, no side effects).
 */

import {
    mapSetRow,
    mapExerciseRow,
    mapWorkoutRow,
    SetRow,
    ExerciseRow,
    WorkoutRow,
} from '../hydration';

// ========================================
// Fixtures
// ========================================

function makeSetRow(overrides: Partial<SetRow> = {}): SetRow {
    return {
        id: 'set-1',
        order_index: 0,
        weight: 135,
        reps: 8,
        duration: null,
        distance: null,
        type: 'working',
        status: 'completed',
        rpe: 7,
        rir: 3,
        suggested_weight: 130,
        suggested_reps: 10,
        note: 'Felt heavy',
        completed_at: '2025-01-15T10:30:00.000Z',
        rest_duration: 120,
        ...overrides,
    };
}

function makeExerciseRow(overrides: Partial<ExerciseRow> = {}): ExerciseRow {
    return {
        id: 'we-1',
        exercise_id: 'ex-bench',
        exercise_name: 'Bench Press',
        exercise_category: 'strength',
        exercise_muscle_groups: JSON.stringify([{ muscle: 'chest', contribution: 80, isPrimary: true }]),
        exercise_equipment: JSON.stringify(['barbell']),
        exercise_track_weight: 1,
        exercise_track_reps: 1,
        exercise_track_time: 0,
        order_index: 0,
        superset_group_id: null,
        note: null,
        ...overrides,
    };
}

function makeWorkoutRow(overrides: Partial<WorkoutRow> = {}): WorkoutRow {
    return {
        id: 'w-1',
        name: 'Morning Push',
        status: 'completed',
        started_at: '2025-01-15T09:00:00.000Z',
        completed_at: '2025-01-15T10:15:00.000Z',
        total_duration: 4500,
        total_volume: 12000,
        total_sets: 15,
        muscle_groups_worked: JSON.stringify(['chest', 'triceps', 'shoulders']),
        location: 'Home Gym',
        note: 'Good session',
        template_id: 'tmpl-1',
        day_of_week: 3,
        created_at: '2025-01-15T09:00:00.000Z',
        updated_at: '2025-01-15T10:15:00.000Z',
        ...overrides,
    };
}

// ========================================
// mapSetRow
// ========================================

describe('mapSetRow', () => {
    it('maps all snake_case columns to camelCase', () => {
        const result = mapSetRow(makeSetRow());

        expect(result.id).toBe('set-1');
        expect(result.orderIndex).toBe(0);
        expect(result.weight).toBe(135);
        expect(result.reps).toBe(8);
        expect(result.type).toBe('working');
        expect(result.status).toBe('completed');
        expect(result.rpe).toBe(7);
        expect(result.rir).toBe(3);
        expect(result.suggestedWeight).toBe(130);
        expect(result.suggestedReps).toBe(10);
        expect(result.note).toBe('Felt heavy');
        expect(result.restDuration).toBe(120);
    });

    it('converts completed_at string to Date', () => {
        const result = mapSetRow(makeSetRow());
        expect(result.completedAt).toBeInstanceOf(Date);
        expect(result.completedAt!.toISOString()).toBe('2025-01-15T10:30:00.000Z');
    });

    it('handles null completed_at', () => {
        const result = mapSetRow(makeSetRow({ completed_at: null }));
        expect(result.completedAt).toBeNull();
    });

    it('preserves null values for nullable fields', () => {
        const result = mapSetRow(makeSetRow({
            weight: null,
            reps: null,
            duration: null,
            distance: null,
            rpe: null,
            rir: null,
            suggested_weight: null,
            suggested_reps: null,
            note: null,
            rest_duration: null,
        }));

        expect(result.weight).toBeNull();
        expect(result.reps).toBeNull();
        expect(result.rpe).toBeNull();
        expect(result.suggestedWeight).toBeNull();
        expect(result.note).toBeNull();
        expect(result.restDuration).toBeNull();
    });
});

// ========================================
// mapExerciseRow
// ========================================

describe('mapExerciseRow', () => {
    it('maps exercise snapshot columns to Exercise model', () => {
        const result = mapExerciseRow(makeExerciseRow());

        expect(result.id).toBe('ex-bench');
        expect(result.name).toBe('Bench Press');
        expect(result.category).toBe('strength');
        expect(result.trackWeight).toBe(true);
        expect(result.trackReps).toBe(true);
        expect(result.trackTime).toBe(false);
    });

    it('parses muscle_groups JSON', () => {
        const result = mapExerciseRow(makeExerciseRow());

        expect(result.muscleGroups).toHaveLength(1);
        expect(result.muscleGroups[0].muscle).toBe('chest');
        expect(result.muscleGroups[0].isPrimary).toBe(true);
    });

    it('parses equipment JSON', () => {
        const result = mapExerciseRow(makeExerciseRow());
        expect(result.equipment).toEqual(['barbell']);
    });

    it('handles null/empty muscle_groups gracefully', () => {
        const result = mapExerciseRow(makeExerciseRow({ exercise_muscle_groups: null }));
        expect(result.muscleGroups).toEqual([]);

        const result2 = mapExerciseRow(makeExerciseRow({ exercise_muscle_groups: '' }));
        expect(result2.muscleGroups).toEqual([]);
    });

    it('handles null/empty equipment gracefully', () => {
        const result = mapExerciseRow(makeExerciseRow({ exercise_equipment: null }));
        expect(result.equipment).toEqual([]);
    });

    it('sets non-snapshot fields to defaults', () => {
        const result = mapExerciseRow(makeExerciseRow());

        expect(result.trackDistance).toBe(false);
        expect(result.isCustom).toBe(false);
        expect(result.isHidden).toBe(false);
        expect(result.isFavorite).toBe(false);
        expect(result.createdAt.getTime()).toBe(0); // epoch
        expect(result.updatedAt.getTime()).toBe(0);
    });
});

// ========================================
// mapWorkoutRow
// ========================================

describe('mapWorkoutRow', () => {
    it('maps workout columns to Workout model', () => {
        const result = mapWorkoutRow(makeWorkoutRow(), [], new Map());

        expect(result.id).toBe('w-1');
        expect(result.name).toBe('Morning Push');
        expect(result.status).toBe('completed');
        expect(result.totalDuration).toBe(4500);
        expect(result.totalVolume).toBe(12000);
        expect(result.totalSets).toBe(15);
        expect(result.location).toBe('Home Gym');
        expect(result.note).toBe('Good session');
        expect(result.templateId).toBe('tmpl-1');
        expect(result.dayOfWeek).toBe(3);
    });

    it('converts date strings to Date objects', () => {
        const result = mapWorkoutRow(makeWorkoutRow(), [], new Map());

        expect(result.startedAt).toBeInstanceOf(Date);
        expect(result.completedAt).toBeInstanceOf(Date);
        expect(result.createdAt).toBeInstanceOf(Date);
        expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('handles null completed_at', () => {
        const result = mapWorkoutRow(
            makeWorkoutRow({ completed_at: null }),
            [],
            new Map(),
        );
        expect(result.completedAt).toBeNull();
    });

    it('parses muscle_groups_worked JSON', () => {
        const result = mapWorkoutRow(makeWorkoutRow(), [], new Map());
        expect(result.muscleGroupsWorked).toEqual(['chest', 'triceps', 'shoulders']);
    });

    it('handles null/empty muscle_groups_worked gracefully', () => {
        const result = mapWorkoutRow(
            makeWorkoutRow({ muscle_groups_worked: null }),
            [],
            new Map(),
        );
        expect(result.muscleGroupsWorked).toEqual([]);
    });

    it('assembles exercises with their sets', () => {
        const exerciseRow = makeExerciseRow({ id: 'we-1', exercise_id: 'ex-bench' });
        const setRow = makeSetRow({ id: 'set-1' });
        const setsMap = new Map([['we-1', [setRow]]]);

        const result = mapWorkoutRow(makeWorkoutRow(), [exerciseRow], setsMap);

        expect(result.main.exercises).toHaveLength(1);
        expect(result.main.exercises[0].exercise.name).toBe('Bench Press');
        expect(result.main.exercises[0].sets).toHaveLength(1);
        expect(result.main.exercises[0].sets[0].weight).toBe(135);
    });

    it('handles exercises with no sets', () => {
        const exerciseRow = makeExerciseRow({ id: 'we-1' });
        const result = mapWorkoutRow(makeWorkoutRow(), [exerciseRow], new Map());

        expect(result.main.exercises[0].sets).toEqual([]);
    });

    it('handles superset_group_id', () => {
        const ex1 = makeExerciseRow({ id: 'we-1', superset_group_id: 'ss-1' });
        const ex2 = makeExerciseRow({ id: 'we-2', superset_group_id: 'ss-1', order_index: 1, exercise_id: 'ex-row', exercise_name: 'Row' });

        const result = mapWorkoutRow(makeWorkoutRow(), [ex1, ex2], new Map());

        expect(result.main.exercises[0].supersetGroupId).toBe('ss-1');
        expect(result.main.exercises[1].supersetGroupId).toBe('ss-1');
    });
});

// ========================================
// Validation / corrupt data
// ========================================

describe('validation: malformed JSON', () => {
    it('returns empty array for malformed muscle_groups', () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        const result = mapExerciseRow(makeExerciseRow({ exercise_muscle_groups: '{broken json' }));

        expect(result.muscleGroups).toEqual([]);
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('Malformed JSON'),
            expect.any(String),
        );
        consoleSpy.mockRestore();
    });

    it('returns empty array for malformed equipment', () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        const result = mapExerciseRow(makeExerciseRow({ exercise_equipment: 'not-json' }));

        expect(result.equipment).toEqual([]);
        consoleSpy.mockRestore();
    });

    it('returns empty array for malformed muscle_groups_worked', () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        const result = mapWorkoutRow(
            makeWorkoutRow({ muscle_groups_worked: '<<invalid>>' }),
            [],
            new Map(),
        );

        expect(result.muscleGroupsWorked).toEqual([]);
        consoleSpy.mockRestore();
    });
});

describe('validation: negative numbers', () => {
    it('clamps negative weight to 0', () => {
        const result = mapSetRow(makeSetRow({ weight: -5 }));
        expect(result.weight).toBe(0);
    });

    it('clamps negative reps to 0', () => {
        const result = mapSetRow(makeSetRow({ reps: -10 }));
        expect(result.reps).toBe(0);
    });

    it('clamps negative totalVolume to 0', () => {
        const result = mapWorkoutRow(
            makeWorkoutRow({ total_volume: -100 }),
            [],
            new Map(),
        );
        expect(result.totalVolume).toBe(0);
    });

    it('preserves null (does not convert to 0)', () => {
        const result = mapSetRow(makeSetRow({ weight: null }));
        expect(result.weight).toBeNull();
    });
});

describe('validation: unknown union types', () => {
    it('falls back to "working" for unknown set type', () => {
        const result = mapSetRow(makeSetRow({ type: 'invalid_type' }));
        expect(result.type).toBe('working');
    });

    it('falls back to "pending" for unknown set status', () => {
        const result = mapSetRow(makeSetRow({ status: 'garbage' }));
        expect(result.status).toBe('pending');
    });

    it('falls back to "completed" for unknown workout status', () => {
        const result = mapWorkoutRow(
            makeWorkoutRow({ status: 'unknown_status' }),
            [],
            new Map(),
        );
        expect(result.status).toBe('completed');
    });

    it('accepts all valid set types', () => {
        const validTypes = ['warmup', 'working', 'drop', 'failure', 'amrap', 'rest_pause', 'super', 'giant'];
        for (const type of validTypes) {
            const result = mapSetRow(makeSetRow({ type }));
            expect(result.type).toBe(type);
        }
    });
});
