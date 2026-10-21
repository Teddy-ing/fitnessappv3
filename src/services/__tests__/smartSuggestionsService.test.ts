import { DatabaseSync } from 'node:sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import {
    getProgressionNudge,
    getSuggestionsForExercise,
    getSuggestionsForExercises,
} from '../smartSuggestionsService';

let mockDb: SQLiteDatabase | null;
jest.mock('../database', () => ({ getDatabase: async () => mockDb }));

let sqlite: DatabaseSync;
let sequence: number;

interface SetInput {
    weight: number | null;
    reps: number | null;
    type?: string;
    status?: string;
}

function addSession(
    exerciseId: string,
    sets: SetInput[],
    options: { completedAt?: string | null; status?: string } = {},
): string {
    sequence++;
    const id = `workout-${String(sequence).padStart(4, '0')}`;
    const completedAt = options.completedAt === undefined
        ? `2026-10-${String(sequence).padStart(2, '0')}T12:00:00`
        : options.completedAt;
    sqlite.prepare('INSERT INTO workouts (id, completed_at, status) VALUES (?, ?, ?)')
        .run(id, completedAt, options.status ?? 'completed');
    addExercise(id, exerciseId, sets);
    return id;
}

function addExercise(workoutId: string, exerciseId: string, sets: SetInput[]): void {
    const id = `${workoutId}-${exerciseId}-${sqlite.prepare('SELECT COUNT(*) AS n FROM workout_exercises').get()!.n}`;
    sqlite.prepare('INSERT INTO workout_exercises (id, workout_id, exercise_id) VALUES (?, ?, ?)')
        .run(id, workoutId, exerciseId);
    const insertSet = sqlite.prepare(`INSERT INTO workout_sets
        (id, workout_exercise_id, order_index, weight, reps, type, status, rest_duration)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    sets.forEach((set, index) => insertSet.run(
        `${id}-${index}`, id, index, set.weight, set.reps, set.type ?? 'working', set.status ?? 'completed', 90,
    ));
}

function addHistory(exerciseId: string, weights: number[], reps = 10): void {
    weights.forEach(weight => addSession(exerciseId, [{ weight, reps }]));
}

async function expectNudge(exerciseId: string, expected: unknown): Promise<void> {
    expect(await getProgressionNudge(exerciseId)).toEqual(expected);
    expect((await getSuggestionsForExercise(exerciseId, 'maintain')).progressionNudge).toEqual(expected);
}

beforeEach(() => {
    sequence = 0;
    sqlite = new DatabaseSync(':memory:');
    // Use real SQLite for the production window functions, grouping, filters,
    // and chronology. These are the stored columns read by this service.
    sqlite.exec(`
        CREATE TABLE workouts (id TEXT PRIMARY KEY, completed_at TEXT, status TEXT NOT NULL);
        CREATE TABLE workout_exercises (id TEXT PRIMARY KEY, workout_id TEXT NOT NULL, exercise_id TEXT NOT NULL);
        CREATE TABLE workout_sets (
            id TEXT PRIMARY KEY, workout_exercise_id TEXT NOT NULL, order_index INTEGER NOT NULL,
            weight REAL, reps INTEGER, type TEXT NOT NULL, status TEXT NOT NULL, rest_duration INTEGER
        );
    `);
    mockDb = {
        getAllAsync: async (sql: string, params: (string | number | null)[] = []) => sqlite.prepare(sql).all(...params),
    } as unknown as SQLiteDatabase;
});

afterEach(() => {
    sqlite.close();
    mockDb = null;
});

describe('progression nudges use the latest completed sessions', () => {
    it('discards an old 50-pound plateau after a newer 60-pound workout', async () => {
        addHistory('press', [50, 50, 50]);
        addSession('press', [{ weight: 60, reps: 10 }, { weight: 60, reps: 7 }, { weight: 60, reps: 4 }]);

        await expectNudge('press', null);
    });

    it('suggests 55 when the latest three sessions really repeat 50 by 10', async () => {
        addHistory('press', [50, 50, 50]);

        await expectNudge('press', { currentWeight: 50, currentReps: 10, consecutiveSessions: 3, suggestedWeight: 55 });
    });

    it('recognizes a newer 60-pound plateau without reviving the older 50-pound one', async () => {
        addHistory('press', [50, 50, 50, 60, 60, 60]);

        await expectNudge('press', { currentWeight: 60, currentReps: 10, consecutiveSessions: 3, suggestedWeight: 65 });
    });

    it.each([
        { weight: 45, reps: 10 },
        { weight: 50, reps: 8 },
    ])('does not nudge an obsolete plateau after a newer $weight by $reps session', async set => {
        addHistory('press', [50, 50, 50]);
        addSession('press', [set]);

        await expectNudge('press', null);
    });

    it('counts only the consecutive matching sessions through the newest workout', async () => {
        addHistory('press', [45, 50, 50, 50, 50]);

        await expectNudge('press', { currentWeight: 50, currentReps: 10, consecutiveSessions: 4, suggestedWeight: 55 });
    });

    it('uses most reps at the top weight, never reps borrowed from a lighter set', async () => {
        for (let i = 0; i < 3; i++) {
            addSession('press', [{ weight: 60, reps: 6 }, { weight: 60, reps: 8 }, { weight: 50, reps: 12 }]);
        }

        await expectNudge('press', { currentWeight: 60, currentReps: 8, consecutiveSessions: 3, suggestedWeight: 65 });
    });

    it('does not hide fewer reps at the top weight behind a high-rep back-off set', async () => {
        addHistory('press', [60, 60, 60]);
        addSession('press', [{ weight: 60, reps: 6 }, { weight: 50, reps: 12 }]);

        await expectNudge('press', null);
    });

    it('counts distinct completed workouts even when their timestamps match', async () => {
        for (let i = 0; i < 3; i++) {
            addSession('press', [{ weight: 50, reps: 10 }], { completedAt: '2026-10-20T12:00:00' });
        }

        await expectNudge('press', { currentWeight: 50, currentReps: 10, consecutiveSessions: 3, suggestedWeight: 55 });
    });

    it('breaks timestamp ties consistently for standalone and batch nudges', async () => {
        for (const weight of [50, 50, 50, 60]) {
            addSession('press', [{ weight, reps: 10 }], { completedAt: '2026-10-20T12:00:00' });
        }

        await expectNudge('press', null);
    });

    it('counts sessions instead of sets or repeated exercise entries within a workout', async () => {
        for (let i = 0; i < 2; i++) {
            const id = addSession('press', [{ weight: 50, reps: 10 }, { weight: 50, reps: 10 }]);
            addExercise(id, 'press', [{ weight: 50, reps: 10 }]);
        }

        await expectNudge('press', null);
    });

    it.each([
        { label: 'warm-up', set: { weight: 50, reps: 10, type: 'warmup' }, options: {} },
        { label: 'skipped set', set: { weight: 50, reps: 10, status: 'skipped' }, options: {} },
        { label: 'unfinished workout', set: { weight: 50, reps: 10 }, options: { status: 'in_progress' } },
        { label: 'missing completion time', set: { weight: 50, reps: 10 }, options: { completedAt: null } },
        { label: 'missing weight', set: { weight: null, reps: 10 }, options: {} },
        { label: 'missing reps', set: { weight: 50, reps: null }, options: {} },
        { label: 'no repetitions', set: { weight: 50, reps: 0 }, options: {} },
    ])('does not count a $label as the third qualifying session', async ({ set, options }) => {
        addHistory('press', [50, 50]);
        addSession('press', [set], options);

        await expectNudge('press', null);
    });

    it('ignores warm-up and incomplete heavier sets when describing completed working performance', async () => {
        for (let i = 0; i < 3; i++) {
            addSession('press', [
                { weight: 50, reps: 10 },
                { weight: 60, reps: 12, type: 'warmup' },
                { weight: 70, reps: 15, status: 'pending' },
            ]);
        }

        await expectNudge('press', { currentWeight: 50, currentReps: 10, consecutiveSessions: 3, suggestedWeight: 55 });
    });

    it('keeps mixed-exercise batch results consistent with individual requests', async () => {
        addHistory('stale', [50, 50, 50, 60]);
        addHistory('steady', [50, 50, 50]);
        addHistory('new-plateau', [50, 50, 60, 60, 60]);
        const exerciseIds = ['stale', 'steady', 'new-plateau', 'no-history'];
        const batch = await getSuggestionsForExercises(exerciseIds, 'maintain');

        for (const id of exerciseIds) {
            expect(batch.get(id)?.progressionNudge).toEqual(await getProgressionNudge(id));
            expect(batch.get(id)).toEqual(await getSuggestionsForExercise(id, 'maintain'));
        }
        expect(batch.get('stale')?.progressionNudge).toBeNull();
        expect(batch.get('steady')?.progressionNudge?.suggestedWeight).toBe(55);
        expect(batch.get('new-plateau')?.progressionNudge?.suggestedWeight).toBe(65);
    });

    it('keeps trend predictions independent of whether an obsolete progression nudge exists', async () => {
        addHistory('press', [50, 50, 50, 50, 50, 50]);
        addSession('press', [{ weight: 60, reps: 10 }, { weight: 60, reps: 7 }, { weight: 60, reps: 4 }]);

        // Existing regression can round its longer trend to 55 despite a latest
        // 60-pound session. That prediction does not justify a stale 50-pound nudge.
        const suggestion = await getSuggestionsForExercise('press', 'bulk');
        expect(suggestion.sets.map(set => set.suggestedWeight)).toEqual([55, 55, 55]);
        expect(suggestion.progressionNudge).toBeNull();
    });
});
