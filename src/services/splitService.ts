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

/**
 * Get all splits
 */
export async function getSplits(): Promise<Split[]> {
    const db = await getDatabase();
    if (!db) return [];

    const splitRows = await db.getAllAsync<any>(
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

    const row = await db.getFirstAsync<any>(
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
    const db = await getDatabase();
    if (!db) return null;

    const now = new Date();

    await db.withTransactionAsync(async () => {
        // Insert or update split
        await db.runAsync(
            `INSERT OR REPLACE INTO splits (id, name, description, is_built_in, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [split.id, split.name, split.description, split.isBuiltIn ? 1 : 0,
            split.createdAt.toISOString(), now.toISOString()]
        );

        // Delete existing template associations
        await db.runAsync(
            `DELETE FROM splits_templates WHERE split_id = ?`,
            [split.id]
        );

        // Insert template associations
        for (let i = 0; i < split.templateIds.length; i++) {
            const linkId = Crypto.randomUUID();
            await db.runAsync(
                `INSERT INTO splits_templates (id, split_id, template_id, order_index)
                 VALUES (?, ?, ?, ?)`,
                [linkId, split.id, split.templateIds[i], i]
            );
        }
    });

    return { ...split, updatedAt: now };
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
    const db = await getDatabase();
    if (!db) return null;

    const row = await db.getFirstAsync<{ value: string }>(
        `SELECT value FROM user_preferences WHERE key = 'active_split_id'`
    );

    if (!row?.value) return null;
    return getSplitById(row.value);
}

/**
 * Set the active split
 */
export async function setActiveSplit(splitId: string | null): Promise<void> {
    const db = await getDatabase();
    if (!db) return;

    if (splitId) {
        await db.runAsync(
            `INSERT OR REPLACE INTO user_preferences (key, value) VALUES ('active_split_id', ?)`,
            [splitId]
        );
        // Reset template index when changing splits
        await db.runAsync(
            `INSERT OR REPLACE INTO user_preferences (key, value) VALUES ('current_template_index', '0')`
        );
    } else {
        await db.runAsync(
            `DELETE FROM user_preferences WHERE key = 'active_split_id'`
        );
        await db.runAsync(
            `DELETE FROM user_preferences WHERE key = 'current_template_index'`
        );
    }
}

/**
 * Get current template index (which template is next in the split)
 */
export async function getCurrentTemplateIndex(): Promise<number> {
    const db = await getDatabase();
    if (!db) return 0;

    const row = await db.getFirstAsync<{ value: string }>(
        `SELECT value FROM user_preferences WHERE key = 'current_template_index'`
    );

    return row?.value ? parseInt(row.value, 10) : 0;
}

/**
 * Set current template index
 */
export async function setCurrentTemplateIndex(index: number): Promise<void> {
    const db = await getDatabase();
    if (!db) return;

    await db.runAsync(
        `INSERT OR REPLACE INTO user_preferences (key, value) VALUES ('current_template_index', ?)`,
        [index.toString()]
    );
}

/**
 * Advance to next template in split (skipping rest days)
 */
export async function advanceToNextTemplate(): Promise<void> {
    const split = await getActiveSplit();
    if (!split || split.schedule.length === 0) return;

    let currentIndex = await getCurrentTemplateIndex();
    let nextIndex = (currentIndex + 1) % split.schedule.length;

    // Skip rest days (find next actual template)
    let attempts = 0;
    while (split.schedule[nextIndex].type === 'rest' && attempts < split.schedule.length) {
        nextIndex = (nextIndex + 1) % split.schedule.length;
        attempts++;
    }

    await setCurrentTemplateIndex(nextIndex);
}

/**
 * Get the current template to do (the "next" workout)
 */
export async function getCurrentTemplate(): Promise<Template | null> {
    const split = await getActiveSplit();
    if (!split || split.schedule.length === 0) return null;

    const index = await getCurrentTemplateIndex();
    const item = split.schedule[index];

    if (item.type === 'rest') return null;

    const templates = await getTemplates();
    return templates.find(t => t.id === item.templateId) || null;
}

/**
 * Get templates for a split
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
 * Hydrate a split from database row
 */
async function hydrateSplit(row: any): Promise<Split> {
    const db = await getDatabase();
    if (!db) throw new Error('Database not available');

    // Get template IDs for this split
    const templateRows = await db.getAllAsync<{ template_id: string }>(
        `SELECT template_id FROM splits_templates WHERE split_id = ? ORDER BY order_index`,
        [row.id]
    );

    const templateIds = templateRows.map(r => r.template_id);

    // Generate schedule from templateIds (for backward compat - new splits will store schedule directly)
    const schedule = templateIds.map(id => ({ type: 'template' as const, templateId: id }));

    return {
        id: row.id,
        name: row.name,
        description: row.description,
        templateIds,
        schedule,
        isBuiltIn: row.is_built_in === 1,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}

export default {
    getSplits,
    getSplitById,
    saveSplit,
    deleteSplit,
    getActiveSplit,
    setActiveSplit,
    getTemplatesForSplit,
};
