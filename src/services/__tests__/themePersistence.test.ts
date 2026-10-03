import { DatabaseSync } from 'node:sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import * as database from '../database';
import { getSettings, updateSettings } from '../preferencesService';
import { generateExportPayload, importAllData } from '../dataTransferService';
import { restoreFromCloud } from '../cloudBackupService';
import { subscribeSettingsChanges } from '../settingsEvents';
import { normalizeThemeId } from '../../models/theme';

let mockDb: SQLiteDatabase;
let mockBackupContents = '';
let transactionActive = false;
let sqlite: DatabaseSync;
const unsubscribe: Array<() => void> = [];

jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn(async () => mockDb) }));
jest.mock('expo-file-system', () => ({
    File: class { async text() { return mockBackupContents; } },
    Paths: { cache: 'cache' },
}));
jest.mock('expo-sharing', () => ({}));
jest.mock('expo-document-picker', () => ({
    getDocumentAsync: jest.fn(async () => ({ canceled: false, assets: [{ uri: 'backup.json' }] })),
}));
jest.mock('@react-native-google-signin/google-signin', () => ({
    GoogleSignin: {
        configure: jest.fn(), signInSilently: jest.fn(),
        getTokens: jest.fn(async () => ({ accessToken: 'test-token' })),
    },
}));
jest.mock('../../stores/workoutPersistence', () => ({ clearPersistedWorkout: jest.fn() }));

/** Production migrations and services run against real SQLite; only the Expo bridge is adapted. */
function createExpoAdapter(db: DatabaseSync): SQLiteDatabase {
    return {
        execAsync: async (sql: string) => { db.exec(sql); },
        runAsync: async (sql: string, params: (string | number | null)[] = []) => {
            const result = db.prepare(sql).run(...params);
            return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
        },
        getFirstAsync: async (sql: string, params: (string | number | null)[] = []) => db.prepare(sql).get(...params) ?? null,
        getAllAsync: async (sql: string, params: (string | number | null)[] = []) => db.prepare(sql).all(...params),
        withTransactionAsync: async (callback: () => Promise<void>) => {
            db.exec('BEGIN;');
            transactionActive = true;
            try {
                await callback();
                db.exec('COMMIT;');
            } catch (error) {
                db.exec('ROLLBACK;');
                throw error;
            } finally {
                transactionActive = false;
            }
        },
        closeAsync: async () => db.close(),
    } as unknown as SQLiteDatabase;
}

function seedPreferencesAndHistory() {
    sqlite.exec(`
        UPDATE user_settings SET weight_unit = 'kg', distance_unit = 'km', default_rest_time = 135, show_rpe = 1;
        INSERT INTO workouts (id, name, started_at, created_at, updated_at)
        VALUES ('history', 'Saved heavy day', '2026-01-01', '2026-01-01', '2026-01-01');
    `);
}

function observeChanges() {
    const observations: Array<{ inTransaction: boolean; theme: string; workouts: unknown[] }> = [];
    unsubscribe.push(subscribeSettingsChanges(() => {
        observations.push({
            inTransaction: transactionActive,
            theme: normalizeThemeId(sqlite.prepare('SELECT theme FROM user_settings WHERE id = 1').get()?.theme),
            workouts: sqlite.prepare('SELECT * FROM workouts ORDER BY id').all(),
        });
    }));
    return observations;
}

beforeEach(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    transactionActive = false;
    sqlite = new DatabaseSync(':memory:');
    mockDb = createExpoAdapter(sqlite);
    await database.getDatabase();
});

afterEach(async () => {
    unsubscribe.splice(0).forEach(off => off());
    jest.restoreAllMocks();
    await database.closeDatabase();
});

describe('theme preferences', () => {
    it('defaults a fresh database to IronJot', async () => {
        expect((await getSettings()).theme).toBe('ironjot');
    });

    it.each(['dark', 'light', 'unexpected'])('hydrates legacy or unknown %s as IronJot', async value => {
        sqlite.prepare('UPDATE user_settings SET theme = ?').run(value);
        expect((await getSettings()).theme).toBe('ironjot');
    });

    it.each(['purple', 'ironjot'] as const)('persists %s without changing other settings, history, or schema', async theme => {
        seedPreferencesAndHistory();
        const settingsBefore = sqlite.prepare('SELECT * FROM user_settings').get();
        const historyBefore = sqlite.prepare('SELECT * FROM workouts').all();
        const schemaBefore = sqlite.prepare('PRAGMA user_version').get();
        const notifications = observeChanges();
        await updateSettings({ theme });
        expect((await getSettings()).theme).toBe(theme);
        expect(sqlite.prepare('SELECT * FROM user_settings').get()).toEqual({ ...settingsBefore, theme });
        expect(sqlite.prepare('SELECT * FROM workouts').all()).toEqual(historyBefore);
        expect(sqlite.prepare('PRAGMA user_version').get()).toEqual(schemaBefore);
        expect(notifications).toEqual([{ inTransaction: false, theme, workouts: historyBefore }]);
    });

    it('does not notify or change preferences when a theme write fails', async () => {
        const before = await getSettings();
        const notifications = observeChanges();
        jest.spyOn(mockDb, 'runAsync').mockRejectedValueOnce(new Error('disk full'));
        await expect(updateSettings({ theme: 'purple' })).rejects.toThrow('disk full');
        expect(await getSettings()).toEqual(before);
        expect(notifications).toEqual([]);
    });

    it('does not report a successful theme save if the settings row is missing', async () => {
        sqlite.exec('DELETE FROM user_settings;');
        const notifications = observeChanges();
        await expect(updateSettings({ theme: 'purple' })).rejects.toThrow();
        expect(notifications).toEqual([]);
    });

    it('does not notify for an empty update', async () => {
        const notifications = observeChanges();
        await updateSettings({});
        expect(notifications).toEqual([]);
    });

    it('notifies after data clearing and returns to IronJot defaults', async () => {
        seedPreferencesAndHistory();
        await updateSettings({ theme: 'purple' });
        const notifications = observeChanges();
        await database.clearAllData();
        expect((await getSettings()).theme).toBe('ironjot');
        expect(notifications).toEqual([{ inTransaction: false, theme: 'ironjot', workouts: [] }]);
    });
});

describe.each(['local', 'cloud'] as const)('%s theme backup restore', source => {
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

    it.each(['purple', 'ironjot'] as const)('round-trips %s and notifies only after committed restoration', async theme => {
        seedPreferencesAndHistory();
        await updateSettings({ theme });
        const settingsBefore = await getSettings();
        const historyBefore = sqlite.prepare('SELECT * FROM workouts').all();
        const payload = await generateExportPayload();
        expect(payload.tables.user_settings[0].theme).toBe(theme);
        sqlite.exec("UPDATE user_settings SET theme = 'changed', weight_unit = 'lbs'; DELETE FROM workouts;");
        const notifications = observeChanges();
        await expect(restore(JSON.stringify(payload))).resolves.toBe(true);
        expect(await getSettings()).toEqual(settingsBefore);
        expect(sqlite.prepare('SELECT * FROM workouts').all()).toEqual(historyBefore);
        expect(notifications).toEqual([{ inTransaction: false, theme, workouts: historyBefore }]);
    });

    it('keeps the previous theme and history, with no notification, when restore rolls back', async () => {
        seedPreferencesAndHistory();
        await updateSettings({ theme: 'purple' });
        const payload = await generateExportPayload();
        await updateSettings({ theme: 'ironjot' });
        sqlite.exec("UPDATE workouts SET name = 'Keep this workout';");
        const settingsBefore = await getSettings();
        const historyBefore = sqlite.prepare('SELECT * FROM workouts').all();
        sqlite.exec(`CREATE TRIGGER fail_theme_restore BEFORE INSERT ON workouts
            BEGIN SELECT RAISE(FAIL, 'restore failure'); END;`);
        const notifications = observeChanges();
        await expect(restore(JSON.stringify(payload))).rejects.toThrow('restore failure');
        expect(await getSettings()).toEqual(settingsBefore);
        expect(sqlite.prepare('SELECT * FROM workouts').all()).toEqual(historyBefore);
        expect(notifications).toEqual([]);
    });

    it('normalizes a legacy backup theme when it becomes the live settings', async () => {
        const payload = await generateExportPayload();
        payload.tables.user_settings[0].theme = 'dark';
        await updateSettings({ theme: 'purple' });
        const notifications = observeChanges();
        await expect(restore(JSON.stringify(payload))).resolves.toBe(true);
        expect((await getSettings()).theme).toBe('ironjot');
        expect(notifications).toEqual([{ inTransaction: false, theme: 'ironjot', workouts: [] }]);
    });
});
