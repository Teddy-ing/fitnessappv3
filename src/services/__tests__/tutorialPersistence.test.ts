import { DatabaseSync } from 'node:sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import * as database from '../database';
import { runMigrations } from '../migrations';
import { generateExportPayload, importAllData } from '../dataTransferService';
import { restoreFromCloud } from '../cloudBackupService';
import { getTutorialProgress, saveTutorialProgress } from '../tutorialService';
import { createTutorialProgress, parseTutorialProgress, type TutorialStatus } from '../../models/tutorial';

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

/** Run the actual migrations and persistence services against real SQLite. */
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

let sqlite: DatabaseSync;

function seedExistingData() {
    sqlite.exec(`
        UPDATE user_settings SET weight_unit = 'kg', training_phase = 'cut', active_split_id = 'saved-split';
        INSERT INTO workouts (id, name, started_at, created_at, updated_at)
        VALUES ('history', 'Saved workout', '2026-01-01', '2026-01-01', '2026-01-01');
    `);
}

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

describe('tutorial migration and persistence', () => {
    it('makes only a fresh database eligible for the invitation', async () => {
        expect(sqlite.prepare('PRAGMA user_version').get()).toMatchObject({ user_version: 21 });
        expect(await getTutorialProgress()).toEqual(createTutorialProgress('available'));
        expect(sqlite.prepare('SELECT tutorial_progress FROM user_settings').get()).toMatchObject({ tutorial_progress: null });
    });

    it('upgrades existing installs without changing any settings or workout history', async () => {
        seedExistingData();
        sqlite.exec('ALTER TABLE user_settings DROP COLUMN tutorial_progress; PRAGMA user_version = 20;');
        const settings = sqlite.prepare('SELECT * FROM user_settings').get();
        const history = sqlite.prepare('SELECT * FROM workouts').all();
        await runMigrations(mockDb);
        expect(await getTutorialProgress()).toEqual(createTutorialProgress('skipped'));
        expect(sqlite.prepare('SELECT * FROM user_settings').get()).toEqual({
            ...settings, tutorial_progress: JSON.stringify(createTutorialProgress('skipped')),
        });
        expect(sqlite.prepare('SELECT * FROM workouts').all()).toEqual(history);
        await runMigrations(mockDb);
        expect(await getTutorialProgress()).toEqual(createTutorialProgress('skipped'));
    });

    it('rolls back the new column and schema stamp if migration fails', async () => {
        sqlite.exec('ALTER TABLE user_settings DROP COLUMN tutorial_progress; PRAGMA user_version = 20;');
        jest.spyOn(mockDb, 'runAsync').mockRejectedValueOnce(new Error('disk full'));
        await expect(runMigrations(mockDb)).rejects.toThrow('disk full');
        expect(sqlite.prepare('PRAGMA user_version').get()).toMatchObject({ user_version: 20 });
        expect(sqlite.prepare('PRAGMA table_info(user_settings)').all().map(row => row.name)).not.toContain('tutorial_progress');
    });

    it.each(['available', 'active', 'skipped', 'completed'] as const)('persists %s without touching setup, preferences or workout history', async status => {
        seedExistingData();
        const settings = sqlite.prepare('SELECT * FROM user_settings').get();
        const history = sqlite.prepare('SELECT * FROM workouts').all();
        await saveTutorialProgress(status);
        expect(await getTutorialProgress()).toEqual(createTutorialProgress(status));
        expect(sqlite.prepare('SELECT * FROM user_settings').get()).toEqual({
            ...settings, tutorial_progress: JSON.stringify(createTutorialProgress(status)),
        });
        expect(sqlite.prepare('SELECT * FROM workouts').all()).toEqual(history);
    });

    it('allows an explicit replay after completion and serializes queued changes', async () => {
        await saveTutorialProgress('completed');
        await saveTutorialProgress('active');
        expect(await getTutorialProgress()).toEqual(createTutorialProgress('active'));
        await Promise.all([saveTutorialProgress('active'), saveTutorialProgress('skipped'), saveTutorialProgress('completed')]);
        expect(await getTutorialProgress()).toEqual(createTutorialProgress('completed'));
    });

    it('suppresses guidance for malformed, unsupported or unknown stored data', async () => {
        const invalidValues: unknown[] = [
            '{broken', 'null', '[]', 'true', '42', '', {},
            { version: 2, status: 'active' },
            { version: 1, status: 'unexpected' },
            { version: 1 },
        ];
        for (const invalid of invalidValues) {
            expect(parseTutorialProgress(invalid)).toBeNull();
            sqlite.prepare('UPDATE user_settings SET tutorial_progress = ?').run(typeof invalid === 'string' ? invalid : JSON.stringify(invalid));
            expect(await getTutorialProgress()).toEqual(createTutorialProgress('skipped'));
        }
        await expect(saveTutorialProgress('unexpected' as TutorialStatus)).rejects.toThrow('Invalid tutorial status');
    });

    it('reports database and missing-row failures without claiming to save', async () => {
        const spy = jest.spyOn(database, 'getDatabase').mockResolvedValueOnce(null).mockResolvedValueOnce(null);
        await expect(getTutorialProgress()).rejects.toThrow('Database not available');
        await expect(saveTutorialProgress('active')).rejects.toThrow('Database not available');
        spy.mockRestore();
        sqlite.exec('DELETE FROM user_settings');
        await expect(getTutorialProgress()).rejects.toThrow('User settings not available');
        await expect(saveTutorialProgress('active')).rejects.toThrow('could not be saved');
    });

    it('keeps existing progress when a write fails and permits a retry', async () => {
        await saveTutorialProgress('active');
        jest.spyOn(mockDb, 'runAsync').mockRejectedValueOnce(new Error('disk full'));
        await expect(saveTutorialProgress('completed')).rejects.toThrow('disk full');
        expect(await getTutorialProgress()).toEqual(createTutorialProgress('active'));
        await saveTutorialProgress('completed');
        expect(await getTutorialProgress()).toEqual(createTutorialProgress('completed'));
    });

    it('resets to a fresh invitation when clearing all user data, including after a queued save', async () => {
        await Promise.all([saveTutorialProgress('completed'), database.clearAllData()]);
        expect(await getTutorialProgress()).toEqual(createTutorialProgress('available'));
        expect(sqlite.prepare('SELECT tutorial_progress FROM user_settings').get()).toMatchObject({ tutorial_progress: null });
    });
});

describe.each(['local', 'cloud'] as const)('%s tutorial backup restore', source => {
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

    it.each(['available', 'active', 'skipped', 'completed'] as const)('round-trips %s alongside settings and workout history', async status => {
        seedExistingData();
        await saveTutorialProgress(status);
        const payload = await generateExportPayload();
        expect(payload.tables.user_settings[0].tutorial_progress).toBe(JSON.stringify(createTutorialProgress(status)));
        await database.clearAllData();
        await expect(restore(JSON.stringify(payload))).resolves.toBe(true);
        expect(await getTutorialProgress()).toEqual(createTutorialProgress(status));
        const restored = await generateExportPayload();
        expect(restored.tables).toEqual(payload.tables);
    });

    it('preserves the fresh-install invitation when restoring a current backup with null progress', async () => {
        const payload = await generateExportPayload();
        await saveTutorialProgress('completed');
        await expect(restore(JSON.stringify(payload))).resolves.toBe(true);
        expect(await getTutorialProgress()).toEqual(createTutorialProgress('available'));
    });

    it.each([19, 20])('suppresses the invitation for a v%i backup and replaces current progress', async schemaVersion => {
        const payload = await generateExportPayload();
        payload.meta.schemaVersion = schemaVersion;
        delete payload.tables.user_settings[0].tutorial_progress;
        if (schemaVersion < 20) delete payload.tables.user_settings[0].onboarding_profile;
        payload.tables.user_settings[0].weight_unit = 'kg';
        await saveTutorialProgress('active');
        await expect(restore(JSON.stringify(payload))).resolves.toBe(true);
        expect(await getTutorialProgress()).toEqual(createTutorialProgress('skipped'));
        expect(sqlite.prepare('SELECT weight_unit FROM user_settings').get()).toMatchObject({ weight_unit: 'kg' });
    });

    it('suppresses the invitation for an older backup without a settings row', async () => {
        const payload = await generateExportPayload();
        payload.meta.schemaVersion = 20;
        payload.tables.user_settings = [];
        await saveTutorialProgress('active');
        await expect(restore(JSON.stringify(payload))).resolves.toBe(true);
        expect(await getTutorialProgress()).toEqual(createTutorialProgress('skipped'));
    });

    it('rolls back the entire restore if the compatibility write fails', async () => {
        const payload = await generateExportPayload();
        payload.meta.schemaVersion = 20;
        delete payload.tables.user_settings[0].tutorial_progress;
        seedExistingData();
        await saveTutorialProgress('active');
        const before = await generateExportPayload();
        const run = mockDb.runAsync.bind(mockDb);
        jest.spyOn(mockDb, 'runAsync').mockImplementation(((sql: string, params: any) => {
            if (sql.startsWith('UPDATE user_settings SET tutorial_progress')) return Promise.reject(new Error('disk full'));
            return run(sql, params);
        }) as typeof mockDb.runAsync);
        await expect(restore(JSON.stringify(payload))).rejects.toThrow('disk full');
        expect((await generateExportPayload()).tables).toEqual(before.tables);
    });
});
