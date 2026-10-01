import type { SQLiteDatabase } from 'expo-sqlite';
import { createTutorialProgress, parseTutorialProgress, type TutorialProgress, type TutorialStatus } from '../models/tutorial';
import { withWriteLock } from '../utils/dbMutex';
import { getDatabase } from './database';

export async function getTutorialProgress(): Promise<TutorialProgress> {
    const db = await getDatabase();
    if (!db) throw new Error('Database not available');
    const row = await db.getFirstAsync<{ tutorial_progress: string | null }>(
        'SELECT tutorial_progress FROM user_settings WHERE id = 1',
    );
    if (!row) throw new Error('User settings not available');
    if (row.tutorial_progress === null) return createTutorialProgress();
    // Invalid or future data must never opt someone into guidance automatically.
    return parseTutorialProgress(row.tutorial_progress) ?? createTutorialProgress('skipped');
}

export async function saveTutorialProgress(status: TutorialStatus): Promise<void> {
    const progress = parseTutorialProgress({ version: 1, status });
    if (!progress) throw new Error('Invalid tutorial status');
    return withWriteLock(async () => {
        const db = await getDatabase();
        if (!db) throw new Error('Database not available');
        // This single statement is atomic and shares coordination with backup, restore and clearing.
        const result = await db.runAsync(
            'UPDATE user_settings SET tutorial_progress = ? WHERE id = 1',
            [JSON.stringify(progress)],
        );
        if (result.changes !== 1) throw new Error('Tutorial progress could not be saved');
    });
}

/** Call inside the restore transaction and write lock, after replacing the saved settings. */
export async function restoreTutorialCompatibility(db: SQLiteDatabase, schemaVersion: number): Promise<void> {
    await db.execAsync('INSERT OR IGNORE INTO user_settings (id) VALUES (1);');
    if (schemaVersion < 21) {
        await db.runAsync(
            'UPDATE user_settings SET tutorial_progress = ? WHERE id = 1',
            [JSON.stringify(createTutorialProgress('skipped'))],
        );
    }
}
