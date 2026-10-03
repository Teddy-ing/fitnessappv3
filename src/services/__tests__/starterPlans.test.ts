import { DatabaseSync } from 'node:sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import { STARTER_PLANS, type StarterPlanDefinition } from '../../data/starterPlans';
import { SEED_EXERCISES } from '../../data/exercises';
import { runMigrations } from '../migrations';
import { insertStarterPlanInTransaction, seedPremadeSplits } from '../premadeSplits';
import { withWriteLock } from '../../utils/dbMutex';

let mockDb: SQLiteDatabase | null;
jest.mock('../database', () => ({ getDatabase: async () => mockDb }));
jest.mock('expo-sqlite', () => ({}));

function adapter(sqlite: DatabaseSync): SQLiteDatabase {
    return {
        execAsync: async (sql: string) => { sqlite.exec(sql); },
        runAsync: async (sql: string, params: (string | number | null)[] = []) => {
            const result = sqlite.prepare(sql).run(...params);
            return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
        },
        getFirstAsync: async (sql: string, params: (string | number | null)[] = []) => sqlite.prepare(sql).get(...params) ?? null,
        getAllAsync: async (sql: string, params: (string | number | null)[] = []) => sqlite.prepare(sql).all(...params),
        withTransactionAsync: async (callback: () => Promise<void>) => {
            sqlite.exec('BEGIN;');
            try { await callback(); sqlite.exec('COMMIT;'); }
            catch (error) { sqlite.exec('ROLLBACK;'); throw error; }
        },
    } as unknown as SQLiteDatabase;
}

describe('starter program catalog', () => {
    it('covers the supported training styles with usable seven-day schedules', () => {
        expect(STARTER_PLANS.map(plan => plan.id)).toEqual([
            'premade_ppl', 'premade_arnold', 'premade_full_body', 'premade_upper_lower', 'premade_bodybuilding',
            'premade_home_dumbbell', 'premade_calisthenics', 'premade_strength_cardio', 'premade_endurance', 'premade_mobility',
        ]);
        for (const plan of STARTER_PLANS) {
            expect(plan.schedule).toHaveLength(7);
            expect(plan.schedule).toContain(null);
            for (const day of plan.schedule) {
                if (day !== null) expect(plan.workouts[day]).toBeDefined();
            }
            for (const workout of plan.workouts) {
                expect(workout.exercises.length).toBeGreaterThan(0);
                for (const entry of workout.exercises) {
                    expect(SEED_EXERCISES.find(exercise => exercise.id === entry.id)).toBeDefined();
                    expect(entry.sets).toBeGreaterThan(0);
                    expect(Number.isInteger(entry.sets)).toBe(true);
                    expect(entry.note.length).toBeGreaterThan(15);
                }
            }
        }
    });

    it('keeps high-frequency PPL and Arnold sessions moderate and includes hamstring work', () => {
        for (const id of ['premade_ppl', 'premade_arnold']) {
            const plan = STARTER_PLANS.find(item => item.id === id)!;
            expect(plan.schedule.filter(day => day !== null)).toHaveLength(6);
            expect(Math.max(...plan.workouts.map(workout => workout.exercises.reduce((sum, entry) => sum + entry.sets, 0)))).toBeLessThanOrEqual(16);
            expect(plan.workouts[2].exercises.map(entry => entry.id)).toContain('leg-curl-seated');
            expect(plan.workouts[2].exercises.map(entry => entry.id)).toContain('romanian-deadlift');
        }
        expect(STARTER_PLANS.find(plan => plan.id === 'premade_arnold')!.description).toContain('single sessions');
    });

    it('gives every full-body and dumbbell day knee, hamstring/hip, push and pull work', () => {
        for (const id of ['premade_full_body', 'premade_home_dumbbell', 'premade_calisthenics']) {
            for (const workout of STARTER_PLANS.find(plan => plan.id === id)!.workouts) {
                const muscles = workout.exercises.flatMap(entry => SEED_EXERCISES.find(exercise => exercise.id === entry.id)!
                    .muscleGroups.filter(group => group.isPrimary).map(group => group.muscle));
                expect(muscles).toContain('quads');
                expect(muscles).toContain('hamstrings');
                expect(muscles.some(muscle => muscle === 'chest' || muscle === 'shoulders')).toBe(true);
                expect(muscles.some(muscle => muscle === 'back' || muscle === 'lats')).toBe(true);
            }
        }
    });

    it('does not assume a bench or machines in the home dumbbell plan', () => {
        const plan = STARTER_PLANS.find(item => item.id === 'premade_home_dumbbell')!;
        for (const workout of plan.workouts) {
            for (const entry of workout.exercises) {
                const equipment = SEED_EXERCISES.find(exercise => exercise.id === entry.id)!.equipment;
                expect(equipment.every(item => ['dumbbell', 'bodyweight', 'none'].includes(item))).toBe(true);
            }
        }
    });

    it('provides cardio duration/intensity and mobility hold prescriptions', () => {
        const endurance = STARTER_PLANS.find(plan => plan.id === 'premade_endurance')!;
        for (const workout of endurance.workouts) {
            expect(workout.exercises).toHaveLength(1);
            const entry = workout.exercises[0];
            expect(entry.note).toMatch(/min/);
            expect(SEED_EXERCISES.find(exercise => exercise.id === entry.id)!.trackTime).toBe(true);
        }
        const mobility = STARTER_PLANS.find(plan => plan.id === 'premade_mobility')!;
        expect(mobility.workouts.flatMap(workout => workout.exercises).some(entry => entry.note.includes('20–30 sec'))).toBe(true);
    });
});

let sqlite: DatabaseSync;
beforeEach(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec('PRAGMA foreign_keys = ON;');
    mockDb = adapter(sqlite);
    await runMigrations(mockDb);
});
afterEach(() => { jest.restoreAllMocks(); sqlite.close(); });

function snapshot() {
    return Object.fromEntries(['splits', 'templates', 'template_exercises', 'splits_schedule', 'splits_templates', 'workouts', 'user_settings']
        .map(table => [table, sqlite.prepare(`SELECT * FROM ${table} ORDER BY id`).all()]));
}

/** Reproduce shipped legacy content, including its skipped nonexistent leg-curl. */
function insertLegacyPlan(id: 'premade_ppl' | 'premade_arnold' = 'premade_ppl') {
    const timestamp = '2025-01-01T00:00:00.000Z';
    const name = id === 'premade_ppl' ? 'Push Pull Legs' : 'Arnold Split';
    const description = id === 'premade_ppl' ? 'Classic 3-day split targeting push, pull, and leg movements' : "Arnold Schwarzenegger's classic 6-day double split routine";
    sqlite.prepare('INSERT INTO splits (id, name, description, is_built_in, is_favorite, created_at, updated_at) VALUES (?, ?, ?, 1, 1, ?, ?)')
        .run(id, name, description, timestamp, timestamp);
    const days = id === 'premade_ppl' ? [
        { name: 'Push Day', exercises: [['bench-press-barbell', 4], ['incline-bench-press-dumbbell', 3], ['overhead-press-dumbbell', 3], ['lateral-raise', 3], ['tricep-pushdown', 3], ['overhead-tricep-extension', 3]] },
        { name: 'Pull Day', exercises: [['deadlift-conventional', 3], ['lat-pulldown', 4], ['bent-over-row-barbell', 3], ['seated-cable-row', 3], ['face-pull', 3], ['barbell-curl', 3], ['hammer-curl', 3]] },
        { name: 'Leg Day', exercises: [['squat-barbell', 4], ['romanian-deadlift', 3], ['leg-press', 3], ['leg-curl', 3], ['leg-extension', 3], ['calf-raise-standing', 4]] },
    ] : [
        { name: 'Chest & Back', exercises: [['bench-press-barbell', 4], ['incline-bench-press-dumbbell', 3], ['chest-fly-dumbbell', 3], ['pull-up', 4], ['bent-over-row-barbell', 4], ['seated-cable-row', 3], ['deadlift-conventional', 3]] },
        { name: 'Shoulders & Arms', exercises: [['overhead-press-barbell', 4], ['lateral-raise', 4], ['rear-delt-fly', 3], ['barbell-curl', 3], ['dumbbell-curl', 3], ['close-grip-bench', 3], ['tricep-pushdown', 3]] },
        { name: 'Legs', exercises: [['squat-barbell', 5], ['leg-press', 4], ['leg-extension', 3], ['leg-curl', 4], ['lunge-dumbbell', 3], ['calf-raise-standing', 5]] },
    ];
    days.forEach((day, index) => {
        const templateId = `${id}_template_${index}`;
        sqlite.prepare('INSERT INTO templates (id, name, description, use_count, last_used_at, is_favorite, created_at, updated_at) VALUES (?, ?, ?, 12, ?, 1, ?, ?)')
            .run(templateId, day.name, `Part of ${name}`, timestamp, timestamp, timestamp);
        day.exercises.forEach(([id, sets], order) => {
            const exercise = SEED_EXERCISES.find(item => item.id === id);
            if (!exercise) return;
            sqlite.prepare(`INSERT INTO template_exercises (id, template_id, exercise_id, exercise_name, exercise_category,
                exercise_muscle_groups, exercise_equipment, exercise_track_weight, exercise_track_reps, exercise_track_time,
                order_index, default_sets, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`)
                .run(`${templateId}_exercise_${order}`, templateId, exercise.id, exercise.name, exercise.category,
                    JSON.stringify(exercise.muscleGroups), JSON.stringify(exercise.equipment), +exercise.trackWeight,
                    +exercise.trackReps, +exercise.trackTime, order, sets);
        });
        sqlite.prepare('INSERT INTO splits_schedule (id, split_id, order_index, item_type, template_id) VALUES (?, ?, ?, ?, ?)')
            .run(`schedule_${index}`, id, index, 'template', templateId);
        sqlite.prepare('INSERT INTO splits_templates (id, split_id, template_id, order_index) VALUES (?, ?, ?, ?)')
            .run(`link_${index}`, id, templateId, index);
    });
    sqlite.prepare('UPDATE user_settings SET active_split_id = ?, current_template_index = 2').run(id);
    sqlite.prepare('INSERT INTO workouts (id, name, started_at, created_at, updated_at, template_id) VALUES (?, ?, ?, ?, ?, ?)')
        .run('saved-workout', 'Historical legs', timestamp, timestamp, timestamp, `${id}_template_2`);
}

describe('starter plan seeding on real SQLite', () => {
    it('seeds every plan once with full schedules, snapshots and exercise notes', async () => {
        await seedPremadeSplits();
        expect(sqlite.prepare('SELECT COUNT(*) AS count FROM splits').get()!.count).toBe(STARTER_PLANS.length);
        expect(sqlite.prepare('SELECT COUNT(*) AS count FROM templates').get()!.count).toBe(STARTER_PLANS.reduce((sum, plan) => sum + plan.workouts.length, 0));
        expect(sqlite.prepare('SELECT COUNT(*) AS count FROM splits_schedule').get()!.count).toBe(STARTER_PLANS.length * 7);
        expect(sqlite.prepare('SELECT COUNT(*) AS count FROM template_exercises WHERE note IS NULL').get()!.count).toBe(0);
        expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
        const initial = snapshot();
        await seedPremadeSplits();
        expect(snapshot()).toEqual(initial);
    });

    it('serializes concurrent startup seeds and onboarding insertion without duplicate identities', async () => {
        const db = mockDb!;
        const clone = { ...STARTER_PLANS[2], id: 'onboarding-choice', name: 'My Full Body' };
        await Promise.all([
            seedPremadeSplits(), seedPremadeSplits(),
            withWriteLock(() => db.withTransactionAsync(() => insertStarterPlanInTransaction(db, clone, false))),
        ]);
        expect(sqlite.prepare('SELECT COUNT(*) AS count FROM splits').get()!.count).toBe(STARTER_PLANS.length + 1);
        expect(sqlite.prepare('SELECT is_built_in FROM splits WHERE id = ?').get(clone.id)!.is_built_in).toBe(0);
        expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    });

    it.each(['premade_ppl', 'premade_arnold'] as const)('upgrades untouched %s content in place and adds every missing plan', async id => {
        insertLegacyPlan(id);
        const history = sqlite.prepare('SELECT * FROM workouts').all();
        await seedPremadeSplits();
        expect(sqlite.prepare('SELECT COUNT(*) AS count FROM splits').get()!.count).toBe(10);
        expect(sqlite.prepare('SELECT * FROM workouts').all()).toEqual(history);
        expect(sqlite.prepare('SELECT is_favorite, created_at FROM splits WHERE id = ?').get(id)).toMatchObject({ is_favorite: 1, created_at: '2025-01-01T00:00:00.000Z' });
        for (let index = 0; index < 3; index++) {
            expect(sqlite.prepare('SELECT is_favorite, use_count, last_used_at, created_at FROM templates WHERE id = ?').get(`${id}_template_${index}`))
                .toMatchObject({ is_favorite: 1, use_count: 12, last_used_at: '2025-01-01T00:00:00.000Z', created_at: '2025-01-01T00:00:00.000Z' });
        }
        expect(sqlite.prepare('SELECT current_template_index, active_split_id FROM user_settings').get()).toMatchObject({ current_template_index: 2, active_split_id: id });
        expect(sqlite.prepare('SELECT COUNT(*) AS count FROM splits_schedule WHERE split_id = ?').get(id)!.count).toBe(7);
        expect(sqlite.prepare('SELECT exercise_id FROM template_exercises WHERE template_id = ?').all(`${id}_template_2`).map(row => row.exercise_id)).toContain('leg-curl-seated');
        const upgraded = snapshot();
        await seedPremadeSplits();
        expect(snapshot()).toEqual(upgraded);
    });

    it('preserves edited templates and schedules, including notes and active position', async () => {
        insertLegacyPlan();
        sqlite.exec("UPDATE template_exercises SET note = 'My custom cue' WHERE template_id = 'premade_ppl_template_0'; UPDATE splits SET description = 'My preferred cycle' WHERE id = 'premade_ppl'; UPDATE splits_schedule SET template_id = 'premade_ppl_template_1' WHERE order_index = 0;");
        const edited = sqlite.prepare('SELECT * FROM template_exercises WHERE template_id = ? ORDER BY id').all('premade_ppl_template_0');
        const schedule = sqlite.prepare('SELECT * FROM splits_schedule ORDER BY id').all();
        await seedPremadeSplits();
        expect(sqlite.prepare('SELECT * FROM template_exercises WHERE template_id = ? ORDER BY id').all('premade_ppl_template_0')).toEqual(edited);
        expect(sqlite.prepare('SELECT * FROM splits_schedule WHERE split_id = ? ORDER BY id').all('premade_ppl')).toEqual(schedule);
        expect(sqlite.prepare('SELECT current_template_index FROM user_settings').get()!.current_template_index).toBe(2);
        expect(sqlite.prepare('SELECT description FROM splits WHERE id = ?').get('premade_ppl')!.description).toBe('My preferred cycle');
    });

    it('preserves template copies and orphaned template identities', async () => {
        const stamp = '2025-01-01';
        sqlite.prepare('INSERT INTO templates (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)').run('premade_full_body_template_0', 'My retained template', stamp, stamp);
        sqlite.prepare('INSERT INTO templates (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)').run('my-copy', 'Copied Push Day', stamp, stamp);
        const originals = sqlite.prepare('SELECT * FROM templates ORDER BY id').all();
        await seedPremadeSplits();
        expect(sqlite.prepare('SELECT * FROM templates WHERE id IN (?, ?) ORDER BY id').all('premade_full_body_template_0', 'my-copy')).toEqual(originals);
    });

    it('never takes over a user-owned split with a colliding builtin identity', async () => {
        sqlite.prepare('INSERT INTO splits (id, name, is_built_in, created_at, updated_at) VALUES (?, ?, 0, ?, ?)')
            .run('premade_ppl', 'My split', '2025-01-01', '2025-01-01');
        await seedPremadeSplits();
        expect(sqlite.prepare('SELECT name, is_built_in FROM splits WHERE id = ?').get('premade_ppl')).toMatchObject({ name: 'My split', is_built_in: 0 });
    });

    it('rolls back upgrades and new plans together after a write failure', async () => {
        insertLegacyPlan();
        const before = snapshot();
        const original = mockDb!.runAsync.bind(mockDb!);
        jest.spyOn(mockDb!, 'runAsync').mockImplementation((async (sql: string, params: (string | number | null)[]) => {
            if (params[0] === 'premade_home_dumbbell') throw new Error('disk full');
            return original(sql, params);
        }) as SQLiteDatabase['runAsync']);
        await expect(seedPremadeSplits()).rejects.toThrow('disk full');
        expect(snapshot()).toEqual(before);
    });

    it('throws on unknown exercises, invalid schedules and identity collisions', async () => {
        const db = mockDb!;
        const invalid = [
            { ...STARTER_PLANS[0], schedule: [0] },
            { ...STARTER_PLANS[0], schedule: [0, 1, 30, 0, 1, 2, null] },
            { ...STARTER_PLANS[0], workouts: [{ name: 'Unknown', exercises: [{ id: 'missing-exercise', sets: 3, note: 'test' }] }] },
        ] as StarterPlanDefinition[];
        for (const plan of invalid) {
            await expect(db.withTransactionAsync(() => insertStarterPlanInTransaction(db, plan, false))).rejects.toThrow();
        }
        expect(sqlite.prepare('SELECT COUNT(*) AS count FROM splits').get()!.count).toBe(0);
        await db.withTransactionAsync(() => insertStarterPlanInTransaction(db, STARTER_PLANS[0], true));
        const before = snapshot();
        await expect(db.withTransactionAsync(() => insertStarterPlanInTransaction(db, STARTER_PLANS[0], true))).rejects.toThrow();
        expect(snapshot()).toEqual(before);
    });

    it('reports database unavailability instead of pretending to seed', async () => {
        mockDb = null;
        await expect(seedPremadeSplits()).rejects.toThrow('Database not available');
    });
});
