/**
 * Split Service
 * 
 * CRUD operations for workout splits.
 * A Split groups multiple Templates together into a training program.
 */

import * as Crypto from 'expo-crypto';
import { getDatabase } from './database';
import { Split, createSplit } from '../models/split';
import { Template, getTemplates } from './templateService';
import { getSettings, updateSettings } from './preferencesService';
import { withWriteLock } from '../utils/dbMutex';
import { toLocalISOString } from '../utils/localDate';

/** Row shape returned by SELECT * FROM splits */
interface SplitRow {
    id: string;
    name: string;
    description: string | null;
    is_built_in: number;
    is_favorite: number;
    created_at: string;
    updated_at: string;
}

/**
 * Get all splits
 */
export async function getSplits(): Promise<Split[]> {
    const db = await getDatabase();
    if (!db) return [];

    const splitRows = await db.getAllAsync<SplitRow>(
        `SELECT * FROM splits ORDER BY is_built_in DESC, name ASC`
    );

    const splits: Split[] = [];

    for (const row of splitRows) {
        const split = await hydrateSplit(row);
        splits.push(split);
    }

    return splits;
}

/**
 * Get a split by ID
 */
export async function getSplitById(id: string): Promise<Split | null> {
    const db = await getDatabase();
    if (!db) return null;

    const row = await db.getFirstAsync<SplitRow>(
        `SELECT * FROM splits WHERE id = ?`,
        [id]
    );

    if (!row) return null;
    return hydrateSplit(row);
}

/**
 * Create a new split
 */
export async function saveSplit(split: Split): Promise<Split | null> {
    return withWriteLock(async () => {
    const db = await getDatabase();
    if (!db) return null;

    const now = new Date();

    await db.withTransactionAsync(async () => {
        // Insert or update split
        await db.runAsync(
            `INSERT OR REPLACE INTO splits (id, name, description, is_built_in, is_favorite, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [split.id, split.name, split.description, split.isBuiltIn ? 1 : 0, split.isFavorite ? 1 : 0,
            split.createdAt.toISOString(), now.toISOString()]
        );

        // Delete existing template associations (legacy table)
        await db.runAsync(
            `DELETE FROM splits_templates WHERE split_id = ?`,
            [split.id]
        );

        // Delete existing schedule items
        await db.runAsync(
            `DELETE FROM splits_schedule WHERE split_id = ?`,
            [split.id]
        );

        // Insert schedule items (supports rest days)
        for (let i = 0; i < split.schedule.length; i++) {
            const item = split.schedule[i];
            const itemId = Crypto.randomUUID();
            await db.runAsync(
                `INSERT INTO splits_schedule (id, split_id, order_index, item_type, template_id)
                 VALUES (?, ?, ?, ?, ?)`,
                [itemId, split.id, i, item.type, item.type === 'template' ? item.templateId : null]
            );
        }

        // Also insert into legacy splits_templates for backward compat
        const templateItems = split.schedule.filter(item => item.type === 'template');
        for (let i = 0; i < templateItems.length; i++) {
            const item = templateItems[i];
            if (item.type === 'template') {
                const linkId = Crypto.randomUUID();
                await db.runAsync(
                    `INSERT INTO splits_templates (id, split_id, template_id, order_index)
                     VALUES (?, ?, ?, ?)`,
                    [linkId, split.id, item.templateId, i]
                );
            }
        }
    });

    // A repaired position must not inherit completion from the removed position.
    const settings = await getSettings();
    if (settings.activeSplitId === split.id) {
        if (!isValidScheduleIndex(settings.currentTemplateIndex, split.schedule.length)) {
            await updateSettings({ currentTemplateIndex: 0, lastWorkoutDate: null });
        }
    }

    return { ...split, updatedAt: now };
    });
}

/**
 * Delete a split
 */
export async function deleteSplit(id: string): Promise<void> {
    const db = await getDatabase();
    if (!db) return;

    // Don't delete built-in splits
    const split = await getSplitById(id);
    if (split?.isBuiltIn) return;

    await db.runAsync(`DELETE FROM splits WHERE id = ?`, [id]);

    // Also clear active split preference if this was the active one
    const activeSplit = await getActiveSplit();
    if (activeSplit?.id === id) {
        await setActiveSplit(null);
    }
}

/**
 * Get the active split (selected by user)
 */
export async function getActiveSplit(): Promise<Split | null> {
    const settings = await getSettings();
    if (!settings.activeSplitId) return null;
    return getSplitById(settings.activeSplitId);
}

/**
 * Set the active split
 */
export async function setActiveSplit(splitId: string | null): Promise<void> {
    await withWriteLock(async () => {
        await updateSettings({
            activeSplitId: splitId,
            currentTemplateIndex: 0, // Reset when changing splits
            lastWorkoutDate: null,
        });
    });
}

/**
 * Get current template index (which template is next in the split)
 */
export async function getCurrentTemplateIndex(): Promise<number> {
    return withWriteLock(async () => {
        const settings = await getSettings();
        const split = settings.activeSplitId ? await getSplitById(settings.activeSplitId) : null;
        if (!isValidScheduleIndex(settings.currentTemplateIndex, split?.schedule.length ?? 0)) {
            if (settings.currentTemplateIndex !== 0 || settings.lastWorkoutDate) {
                await updateSettings({ currentTemplateIndex: 0, lastWorkoutDate: null });
            }
            return 0;
        }
        return settings.currentTemplateIndex;
    });
}

/**
 * Set current template index
 */
export async function setCurrentTemplateIndex(index: number): Promise<void> {
    await withWriteLock(async () => {
        const split = await getActiveSplit();
        await updateSettings({
            currentTemplateIndex: isValidScheduleIndex(index, split?.schedule.length ?? 0) ? index : 0,
            lastWorkoutDate: null,
        });
    });
}

function isValidScheduleIndex(index: number, length: number): boolean {
    return Number.isInteger(index) && index >= 0 && index < length;
}

function findNextTemplateIndex(split: Split, currentIndex: number): number | null {
    for (let offset = 1; offset <= split.schedule.length; offset++) {
        const index = (currentIndex + offset) % split.schedule.length;
        if (split.schedule[index].type === 'template') return index;
    }
    return null;
}

/** Caller must hold the write lock; never call the locking public setters here. */
async function advancePosition(activeSplitId: string | null, currentIndex: number): Promise<boolean> {
    const split = activeSplitId ? await getSplitById(activeSplitId) : null;
    if (!split || !isValidScheduleIndex(currentIndex, split.schedule.length)) {
        await updateSettings({ currentTemplateIndex: 0, lastWorkoutDate: null });
        return false;
    }

    const nextIndex = findNextTemplateIndex(split, currentIndex);
    // One SQL update consumes the pending completion together with its position.
    await updateSettings({ currentTemplateIndex: nextIndex ?? currentIndex, lastWorkoutDate: null });
    return nextIndex !== null;
}

/**
 * Advance to next template in split (skipping rest days)
 */
export async function advanceToNextTemplate(): Promise<void> {
    await withWriteLock(async () => {
        const settings = await getSettings();
        await advancePosition(settings.activeSplitId, settings.currentTemplateIndex);
    });
}

/**
 * Get the current template to do (the "next" workout)
 */
export async function getCurrentTemplate(): Promise<Template | null> {
    const split = await getActiveSplit();
    if (!split || split.schedule.length === 0) return null;

    const index = await getCurrentTemplateIndex();
    // Bounds check — if index is somehow beyond schedule length, return null
    if (index >= split.schedule.length) return null;

    const item = split.schedule[index];
    if (!item || item.type === 'rest') return null;

    const templates = await getTemplates();
    return templates.find(t => t.id === item.templateId) || null;
}

/**
 * Get the last workout date (stored in user settings)
 */
export async function getLastWorkoutDate(): Promise<string | null> {
    const settings = await getSettings();
    return settings.lastWorkoutDate;
}

/**
 * Set the last workout date
 */
export async function setLastWorkoutDate(date: string): Promise<void> {
    await withWriteLock(() => updateSettings({ lastWorkoutDate: date }));
}

/**
 * Consume a completed workout on the next local date. Split positions follow
 * the schedule, independent of calendar weeks or the number of missed days.
 */
export async function checkAndAdvanceIfNewDay(): Promise<boolean> {
    return withWriteLock(async () => {
        const settings = await getSettings();
        const today = toLocalISOString(new Date()).split('T')[0];
        if (!settings.lastWorkoutDate || settings.lastWorkoutDate >= today) return false;
        return advancePosition(settings.activeSplitId, settings.currentTemplateIndex);
    });
}

/**
 * Mark that a workout was completed today (used for date-based advance)
 */
export async function markWorkoutCompletedToday(): Promise<void> {
    const today = toLocalISOString(new Date()).split('T')[0];
    await setLastWorkoutDate(today);
}

/**
 * Get all templates for a split (ordered by split schedule)
 */
export async function getTemplatesForSplit(splitId: string): Promise<Template[]> {
    const db = await getDatabase();
    if (!db) return [];

    const split = await getSplitById(splitId);
    if (!split) return [];

    const allTemplates = await getTemplates();

    // Return templates in split order
    const templateMap = new Map(allTemplates.map(t => [t.id, t]));
    return split.templateIds
        .map(id => templateMap.get(id))
        .filter((t): t is Template => t !== undefined);
}

/**
 * Info about a split for display purposes
 */
export interface SplitInfo {
    id: string;
    name: string;
    isBuiltIn: boolean;
}

/**
 * Get all splits that contain a specific template
 */
export async function getSplitsForTemplate(templateId: string): Promise<SplitInfo[]> {
    const db = await getDatabase();
    if (!db) return [];

    // Query all splits that have this template in their schedule
    const rows = await db.getAllAsync<{ split_id: string; name: string; is_built_in: number }>(
        `SELECT DISTINCT s.id as split_id, s.name, s.is_built_in 
         FROM splits s
         INNER JOIN splits_schedule ss ON s.id = ss.split_id
         WHERE ss.template_id = ?
         ORDER BY s.is_built_in DESC, s.name ASC`,
        [templateId]
    );

    return rows.map(row => ({
        id: row.split_id,
        name: row.name,
        isBuiltIn: row.is_built_in === 1,
    }));
}

/**
 * Hydrate a split from database row
 */
async function hydrateSplit(row: SplitRow): Promise<Split> {
    const db = await getDatabase();
    if (!db) throw new Error('Database not available');

    // Try to get schedule from new splits_schedule table first
    const scheduleRows = await db.getAllAsync<{ item_type: string; template_id: string | null }>(
        `SELECT item_type, template_id FROM splits_schedule WHERE split_id = ? ORDER BY order_index`,
        [row.id]
    );

    let schedule: Array<{ type: 'template'; templateId: string } | { type: 'rest' }>;
    let templateIds: string[];

    if (scheduleRows.length > 0) {
        // New format: read from splits_schedule
        schedule = scheduleRows.map(r => {
            if (r.item_type === 'rest') {
                return { type: 'rest' as const };
            } else {
                return { type: 'template' as const, templateId: r.template_id! };
            }
        });
        // Extract template IDs for backward compat
        templateIds = schedule
            .filter((item): item is { type: 'template'; templateId: string } => item.type === 'template')
            .map(item => item.templateId);
    } else {
        // Legacy: fall back to splits_templates
        const templateRows = await db.getAllAsync<{ template_id: string }>(
            `SELECT template_id FROM splits_templates WHERE split_id = ? ORDER BY order_index`,
            [row.id]
        );
        templateIds = templateRows.map(r => r.template_id);
        schedule = templateIds.map(id => ({ type: 'template' as const, templateId: id }));
    }

    return {
        id: row.id,
        name: row.name,
        description: row.description,
        templateIds,
        schedule,
        isBuiltIn: row.is_built_in === 1,
        isFavorite: row.is_favorite === 1,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}

/**
 * Toggle the favorite status of a split
 */
export async function toggleSplitFavorite(splitId: string): Promise<boolean> {
    const db = await getDatabase();
    if (!db) return false;

    await db.runAsync(
        `UPDATE splits SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END WHERE id = ?`,
        [splitId]
    );

    const result = await db.getFirstAsync<{ is_favorite: number }>(
        `SELECT is_favorite FROM splits WHERE id = ?`,
        [splitId]
    );
    return result?.is_favorite === 1;
}

export default {
    getSplits,
    getSplitById,
    saveSplit,
    deleteSplit,
    getActiveSplit,
    setActiveSplit,
    getTemplatesForSplit,
    toggleSplitFavorite,
};
