import { DatabaseSync } from 'node:sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import * as database from '../database';
import { runMigrations } from '../migrations';
import { generateExportPayload, importAllData } from '../dataTransferService';
import { restoreFromCloud } from '../cloudBackupService';
import { applyStoredOnboarding, getOnboardingProfile, saveOnboardingProfile, shouldShowOnboarding } from '../onboardingService';
import { createOnboardingProfile, parseOnboardingProfile, type OnboardingProfile } from '../../models/onboarding';

let mockDb: SQLiteDatabase;
let mockBackupContents = '';

jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn(async () => mockDb) }));
jest.mock('expo-file-system', () => ({
    File: class {
        async text() { return mockBackupContents; }
    },
    Paths: { cache: 'cache' },
}));
jest.mock('expo-sharing', () => ({}));
jest.mock('expo-document-picker', () => ({
    getDocumentAsync: jest.fn(async () => ({ canceled: false, assets: [{ uri: 'backup.json' }] })),
}));
jest.mock('@react-native-google-signin/google-signin', () => ({
    GoogleSignin: {
        configure: jest.fn(),
        signInSilently: jest.fn(),
        getTokens: jest.fn(async () => ({ accessToken: 'test-token' })),
    },
}));
jest.mock('../../stores/workoutPersistence', () => ({ clearPersistedWorkout: jest.fn() }));

/** The production migrations and services execute against a real in-memory SQLite database. */
function createExpoAdapter(sqlite: DatabaseSync): SQLiteDatabase {
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
            try {
                await callback();
                sqlite.exec('COMMIT;');
            } catch (error) {
                sqlite.exec('ROLLBACK;');
                throw error;
            }
        },
        closeAsync: async () => sqlite.close(),
    } as unknown as SQLiteDatabase;
}

function answeredProfile(status: OnboardingProfile['status'] = 'completed'): OnboardingProfile {
    return {
        ...createOnboardingProfile(),
        status,
        step: 6,
        completedAt: status === 'completed' ? '2026-09-30T01:00:00.000Z' : null,
        answers: {
            weightUnit: 'kg',
            distanceUnit: 'km',
            measurementUnit: 'cm',
            experienceLevel: 'advanced',
            trainingPhase: 'bulk',
            primaryGoal: 'strength',
            trainingDaysPerWeek: 4,
            trainingLocation: 'both',
            availableEquipment: ['dumbbell'],
        },
    };
}

let sqlite: DatabaseSync;

beforeEach(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    sqlite = new DatabaseSync(':memory:');
    mockDb = createExpoAdapter(sqlite);
    await database.getDatabase();
});

afterEach(async () => {
    jest.restoreAllMocks();
    await database.closeDatabase();
});

describe('onboarding migration and persistence', () => {
    it('leaves a fresh database eligible for optional onboarding', async () => {
        expect(sqlite.prepare('PRAGMA user_version').get()).toMatchObject({ user_version: 20 });
        expect(await getOnboardingProfile()).toBeNull();
        expect(shouldShowOnboarding(await getOnboardingProfile())).toBe(true);
        expect(sqlite.prepare('SELECT has_completed_onboarding FROM user_settings').get()).toMatchObject({ has_completed_onboarding: 0 });
    });

    it('upgrades v19 without interrupting existing users or changing history and preferences', async () => {
        sqlite.exec(`
            ALTER TABLE user_settings DROP COLUMN onboarding_profile;
            PRAGMA user_version = 19;
            UPDATE user_settings SET weight_unit = 'kg', training_phase = 'cut', active_split_id = 'saved-split';
            INSERT INTO workouts (id, name, started_at, created_at, updated_at) VALUES ('history', 'Saved workout', '2026-01-01', '2026-01-01', '2026-01-01');
        `);
        await runMigrations(mockDb);
        const profile = await getOnboardingProfile();
        expect(profile).toEqual({ ...createOnboardingProfile(), status: 'skipped' });
        expect(shouldShowOnboarding(profile)).toBe(false);
        expect(sqlite.prepare('SELECT weight_unit, training_phase, active_split_id FROM user_settings').get()).toMatchObject({ weight_unit: 'kg', training_phase: 'cut', active_split_id: 'saved-split' });
        expect(sqlite.prepare('SELECT name FROM workouts WHERE id = ?').get('history')).toMatchObject({ name: 'Saved workout' });
        await runMigrations(mockDb);
        expect(await getOnboardingProfile()).toEqual(profile);
    });

    it('rolls back a failed upgrade including its schema stamp', async () => {
        sqlite.exec('ALTER TABLE user_settings DROP COLUMN onboarding_profile; PRAGMA user_version = 19;');
        jest.spyOn(mockDb, 'runAsync').mockRejectedValueOnce(new Error('disk full'));
        await expect(runMigrations(mockDb)).rejects.toThrow('disk full');
        expect(sqlite.prepare('PRAGMA user_version').get()).toMatchObject({ user_version: 19 });
        expect(sqlite.prepare('PRAGMA table_info(user_settings)').all().map(row => row.name)).not.toContain('onboarding_profile');
    });

    it.each(['in_progress', 'skipped', 'completed'] as const)('round-trips %s and applies settings only on completion', async status => {
        const before = sqlite.prepare('SELECT * FROM user_settings').get();
        const profile = answeredProfile(status);
        await saveOnboardingProfile(profile);
        const saved = await getOnboardingProfile();
        expect(saved).toEqual(status === 'completed' ? { ...profile, appliedAt: expect.any(String) } : profile);
        const after = sqlite.prepare('SELECT * FROM user_settings').get();
        expect(after).toEqual({
            ...before,
            ...(status === 'completed' ? { weight_unit: 'kg', distance_unit: 'km', measurement_unit: 'cm', training_phase: 'bulk' } : {}),
            onboarding_profile: JSON.stringify(saved),
            has_completed_onboarding: status === 'in_progress' ? 0 : 1,
        });
        expect(shouldShowOnboarding(profile)).toBe(status === 'in_progress');
    });

    it('keeps a completed profile safe from a concurrently queued draft or skip', async () => {
        const profile = answeredProfile();
        const saves = await Promise.allSettled([
            saveOnboardingProfile(profile),
            saveOnboardingProfile(answeredProfile('in_progress')),
            saveOnboardingProfile(answeredProfile('skipped')),
        ]);
        expect(saves.map(result => result.status)).toEqual(['fulfilled', 'rejected', 'rejected']);
        expect(await getOnboardingProfile()).toEqual({ ...profile, appliedAt: expect.any(String) });
    });

    it('does not reapply a retried completion over later settings changes', async () => {
        const profile = answeredProfile();
        await saveOnboardingProfile(profile);
        const saved = await getOnboardingProfile();
        sqlite.exec("UPDATE user_settings SET weight_unit = 'lbs', training_phase = 'cut'");
        await saveOnboardingProfile(profile);
        expect(await getOnboardingProfile()).toEqual(saved);
        expect(sqlite.prepare('SELECT weight_unit, training_phase FROM user_settings').get()).toMatchObject({ weight_unit: 'lbs', training_phase: 'cut' });
    });

    it('rejects malformed JSON and invalid answer values on hydration and save', async () => {
        const profile = answeredProfile();
        const invalidValues: unknown[] = [
            '{broken',
            { ...profile, version: 3 },
            { ...profile, step: -1 },
            { ...profile, step: 7 },
            { ...profile, step: 1.5 },
            { ...profile, status: 'unexpected' },
            { ...profile, completedAt: 'invalid' },
            { ...profile, completedAt: null },
            { ...profile, answers: { ...profile.answers, weightUnit: 'stones' } },
            { ...profile, answers: { ...profile.answers, distanceUnit: 'meters' } },
            { ...profile, answers: { ...profile.answers, measurementUnit: 'feet' } },
            { ...profile, answers: { ...profile.answers, experienceLevel: 'expert' } },
            { ...profile, answers: { ...profile.answers, trainingPhase: 'anything' } },
            { ...profile, answers: { ...profile.answers, primaryGoal: 'anything' } },
            { ...profile, answers: { ...profile.answers, trainingLocation: 'anywhere' } },
            { ...profile, answers: { ...profile.answers, trainingDaysPerWeek: 0 } },
            { ...profile, answers: { ...profile.answers, trainingDaysPerWeek: 8 } },
            { ...profile, answers: { ...profile.answers, trainingDaysPerWeek: 2.5 } },
            { ...profile, answers: { ...profile.answers, availableEquipment: ['unknown'] } },
            { ...profile, answers: { ...profile.answers, availableEquipment: 'dumbbell' } },
            { ...profile, useRecommendedPlan: 'yes' },
            { ...profile, appliedAt: 'not a date' },
            { ...profile, appliedSplitId: 'orphan' },
            { ...profile, answers: {} },
        ];
        for (const invalid of invalidValues) {
            expect(parseOnboardingProfile(invalid)).toBeNull();
            await expect(saveOnboardingProfile(invalid as OnboardingProfile)).rejects.toThrow('Invalid onboarding profile');
        }
        sqlite.prepare('UPDATE user_settings SET onboarding_profile = ?').run('{broken');
        expect(await getOnboardingProfile()).toBeNull();
        sqlite.exec('UPDATE user_settings SET has_completed_onboarding = 1');
        expect(shouldShowOnboarding(await getOnboardingProfile())).toBe(false);
    });

    it('fails visibly when the database or settings row is unavailable', async () => {
        const spy = jest.spyOn(database, 'getDatabase').mockResolvedValueOnce(null).mockResolvedValueOnce(null);
        await expect(getOnboardingProfile()).rejects.toThrow('Database not available');
        await expect(saveOnboardingProfile(createOnboardingProfile())).rejects.toThrow('Database not available');
        spy.mockRestore();
        sqlite.exec('DELETE FROM user_settings');
        await expect(saveOnboardingProfile(createOnboardingProfile())).rejects.toThrow('User settings not available');
    });

    it('does not report success when the settings update saves zero rows', async () => {
        jest.spyOn(mockDb, 'runAsync').mockResolvedValueOnce({ changes: 0, lastInsertRowId: 0 });
        await expect(saveOnboardingProfile(createOnboardingProfile())).rejects.toThrow('could not be saved');
    });

    it('clears the collected profile with all other user data', async () => {
        await saveOnboardingProfile(answeredProfile());
        await database.clearAllData();
        expect(await getOnboardingProfile()).toBeNull();
        expect(shouldShowOnboarding(await getOnboardingProfile())).toBe(true);
    });
});

describe('onboarding application', () => {
    function beginnerProfile(): OnboardingProfile {
        const profile = answeredProfile();
        return { ...profile, answers: { ...profile.answers, experienceLevel: 'beginner', trainingLocation: 'gym', trainingDaysPerWeek: 3 } };
    }

    it('creates and activates a personal plan once, including its templates and rest days', async () => {
        const profile = beginnerProfile();
        await Promise.all([saveOnboardingProfile(profile), saveOnboardingProfile(profile)]);
        const saved = (await getOnboardingProfile())!;
        expect(saved.appliedSplitId).toMatch(/^onboarding_/);
        const settings = sqlite.prepare('SELECT * FROM user_settings').get();
        expect(settings).toMatchObject({ active_split_id: saved.appliedSplitId, current_template_index: 0, last_workout_date: null, weight_unit: 'kg', distance_unit: 'km', measurement_unit: 'cm', training_phase: 'bulk' });
        expect(sqlite.prepare('SELECT COUNT(*) AS count FROM splits').get()).toMatchObject({ count: 1 });
        expect(sqlite.prepare('SELECT is_built_in FROM splits WHERE id = ?').get(saved.appliedSplitId)).toMatchObject({ is_built_in: 0 });
        const schedule = sqlite.prepare('SELECT * FROM splits_schedule WHERE split_id = ? ORDER BY order_index').all(saved.appliedSplitId);
        expect(schedule).toHaveLength(7);
        expect(schedule.filter(row => row.item_type === 'template')).toHaveLength(3);
        const templates = sqlite.prepare('SELECT * FROM templates').all();
        expect(templates.length).toBeGreaterThan(0);
        for (const item of schedule.filter(row => row.item_type === 'template')) {
            expect(templates.some(template => template.id === item.template_id)).toBe(true);
        }
        expect(await applyStoredOnboarding()).toBe(false);
    });

    it.each([
        ['beginner', false, 0], ['intermediate', null, 0], ['intermediate', true, 1], ['advanced', true, 0],
    ] as const)('respects %s plan consent %s', async (experienceLevel, useRecommendedPlan, count) => {
        const profile = beginnerProfile();
        profile.answers.experienceLevel = experienceLevel;
        profile.useRecommendedPlan = useRecommendedPlan;
        await saveOnboardingProfile(profile);
        expect(sqlite.prepare('SELECT COUNT(*) AS count FROM splits').get()).toMatchObject({ count });
        expect(sqlite.prepare('SELECT weight_unit FROM user_settings').get()).toMatchObject({ weight_unit: 'kg' });
    });

    it('preserves an existing selected routine and its position when applying preferences', async () => {
        sqlite.exec("INSERT INTO splits (id, name, created_at, updated_at) VALUES ('custom', 'My routine', '2026-01-01', '2026-01-01'); UPDATE user_settings SET active_split_id = 'custom', current_template_index = 2;");
        await saveOnboardingProfile(beginnerProfile());
        expect(sqlite.prepare('SELECT active_split_id, current_template_index FROM user_settings').get()).toMatchObject({ active_split_id: 'custom', current_template_index: 2 });
        expect(sqlite.prepare('SELECT COUNT(*) AS count FROM splits').get()).toMatchObject({ count: 1 });
        expect((await getOnboardingProfile())?.appliedSplitId).toBeNull();
    });

    it('leaves unanswered units and unsure phase unchanged while retaining all answers', async () => {
        sqlite.exec("UPDATE user_settings SET weight_unit = 'kg', measurement_unit = 'cm', training_phase = 'cut'");
        const profile = { ...createOnboardingProfile(), status: 'completed' as const, step: 6, completedAt: new Date().toISOString() };
        profile.answers.trainingPhase = 'unsure';
        await saveOnboardingProfile(profile);
        expect(sqlite.prepare('SELECT weight_unit, distance_unit, measurement_unit, training_phase FROM user_settings').get()).toMatchObject({ weight_unit: 'kg', distance_unit: 'mi', measurement_unit: 'cm', training_phase: 'cut' });
        expect((await getOnboardingProfile())?.answers.trainingPhase).toBe('unsure');
    });

    it('rolls back plan rows and preferences together if completion cannot be recorded', async () => {
        const before = sqlite.prepare('SELECT * FROM user_settings').get();
        const run = mockDb.runAsync.bind(mockDb);
        jest.spyOn(mockDb, 'runAsync').mockImplementation(((sql: string, params: any) => {
            if (sql.startsWith('UPDATE user_settings SET')) return Promise.reject(new Error('disk full'));
            return run(sql, params);
        }) as typeof mockDb.runAsync);
        await expect(saveOnboardingProfile(beginnerProfile())).rejects.toThrow('disk full');
        expect(sqlite.prepare('SELECT * FROM user_settings').get()).toEqual(before);
        expect(sqlite.prepare('SELECT COUNT(*) AS count FROM splits').get()).toMatchObject({ count: 0 });
        expect(sqlite.prepare('SELECT COUNT(*) AS count FROM templates').get()).toMatchObject({ count: 0 });
        expect(sqlite.prepare('SELECT COUNT(*) AS count FROM template_exercises').get()).toMatchObject({ count: 0 });
    });

    it('upgrades a version-one completed profile and applies it once without repeating onboarding', async () => {
        const profile = answeredProfile();
        const { availableEquipment, ...answers } = profile.answers;
        const legacy = { version: 1, status: 'completed', step: 6, answers, completedAt: profile.completedAt };
        sqlite.prepare('UPDATE user_settings SET onboarding_profile = ?, has_completed_onboarding = 1').run(JSON.stringify(legacy));
        expect(await getOnboardingProfile()).toEqual({ ...profile, answers: { ...answers, availableEquipment: null } });
        expect(await applyStoredOnboarding()).toBe(true);
        expect(shouldShowOnboarding(await getOnboardingProfile())).toBe(false);
        expect(sqlite.prepare('SELECT weight_unit, distance_unit, measurement_unit, training_phase FROM user_settings').get()).toMatchObject({ weight_unit: 'kg', distance_unit: 'km', measurement_unit: 'cm', training_phase: 'bulk' });
        sqlite.exec("UPDATE user_settings SET training_phase = 'maintain'");
        expect(await applyStoredOnboarding()).toBe(false);
        expect(sqlite.prepare('SELECT training_phase FROM user_settings').get()).toMatchObject({ training_phase: 'maintain' });
    });

    it('does not apply a skipped or unfinished profile during startup', async () => {
        await saveOnboardingProfile(answeredProfile('in_progress'));
        expect(await applyStoredOnboarding()).toBe(false);
        await saveOnboardingProfile(answeredProfile('skipped'));
        expect(await applyStoredOnboarding()).toBe(false);
        expect(sqlite.prepare('SELECT weight_unit, training_phase FROM user_settings').get()).toMatchObject({ weight_unit: 'lbs', training_phase: 'maintain' });
    });
});

describe.each(['local', 'cloud'] as const)('%s backup restore', source => {
    async function restore(contents: string) {
        if (source === 'local') {
            mockBackupContents = contents;
            return importAllData();
        }
        jest.spyOn(globalThis, 'fetch')
            .mockResolvedValueOnce({ ok: true, json: async () => ({ files: [{ id: 'backup-id' }] }) } as Response)
            .mockResolvedValueOnce({ ok: true, text: async () => contents } as Response);
        return restoreFromCloud();
    }

    it.each(['in_progress', 'skipped', 'completed'] as const)('preserves a %s profile and active preferences', async status => {
        const profile = answeredProfile(status);
        await saveOnboardingProfile(profile);
        const saved = await getOnboardingProfile();
        const payload = await generateExportPayload();
        expect(payload.tables.user_settings[0].onboarding_profile).toBe(JSON.stringify(saved));
        sqlite.exec("UPDATE user_settings SET onboarding_profile = NULL, weight_unit = 'changed'");
        await expect(restore(JSON.stringify(payload))).resolves.toBe(true);
        expect(await getOnboardingProfile()).toEqual(saved);
        expect(sqlite.prepare('SELECT weight_unit, training_phase FROM user_settings').get()).toMatchObject(status === 'completed' ? { weight_unit: 'kg', training_phase: 'bulk' } : { weight_unit: 'lbs', training_phase: 'maintain' });
        if (status === 'completed') expect(await applyStoredOnboarding()).toBe(false);
    });

    it('restores a v19 backup without introducing a launch interruption', async () => {
        const payload = await generateExportPayload();
        payload.meta.schemaVersion = 19;
        delete payload.tables.user_settings[0].onboarding_profile;
        payload.tables.user_settings[0].weight_unit = 'kg';
        await saveOnboardingProfile(answeredProfile());
        await expect(restore(JSON.stringify(payload))).resolves.toBe(true);
        expect((await getOnboardingProfile())?.status).toBe('skipped');
        expect(shouldShowOnboarding(await getOnboardingProfile())).toBe(false);
        expect(sqlite.prepare('SELECT weight_unit FROM user_settings').get()).toMatchObject({ weight_unit: 'kg' });
    });

    it('round-trips a personalized plan, its equipment answers, and its application marker', async () => {
        const profile = answeredProfile();
        profile.answers.experienceLevel = 'beginner';
        profile.answers.trainingLocation = 'home';
        profile.answers.trainingDaysPerWeek = 3;
        await saveOnboardingProfile(profile);
        const saved = await getOnboardingProfile();
        const payload = await generateExportPayload();
        await database.clearAllData();
        await expect(restore(JSON.stringify(payload))).resolves.toBe(true);
        expect(await getOnboardingProfile()).toEqual(saved);
        expect(await applyStoredOnboarding()).toBe(false);
        expect(sqlite.prepare('SELECT active_split_id FROM user_settings').get()).toMatchObject({ active_split_id: saved!.appliedSplitId });
        expect(sqlite.prepare('SELECT COUNT(*) AS count FROM splits_schedule WHERE split_id = ?').get(saved!.appliedSplitId)).toMatchObject({ count: 7 });
    });
});
