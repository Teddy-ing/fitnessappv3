/**
 * Photo Service
 *
 * Manages progress photos: saving to local filesystem,
 * retrieving metadata, and cleanup.
 *
 * Photos are stored under the app's document directory
 * in a `progress_photos/` subfolder.
 *
 * Conventions:
 * - Uses typed row interfaces (never `any`)
 * - Returns empty arrays / null when DB is unavailable
 * - Uses getDatabase() pattern from existing services
 */

import * as FileSystem from 'expo-file-system/legacy';
import { getDatabase } from './database';
import { ProgressPhoto } from '../models/measurement';

// ============================================================
// Row types
// ============================================================

interface ProgressPhotoRow {
    id: string;
    file_path: string;
    recorded_at: string;
    bodyweight: number | null;
    note: string | null;
    created_at: string;
}

// ============================================================
// Row mapper
// ============================================================

function mapPhotoRow(row: ProgressPhotoRow): ProgressPhoto {
    return {
        id: row.id,
        filePath: row.file_path,
        recordedAt: row.recorded_at,
        bodyweight: row.bodyweight,
        note: row.note,
        createdAt: row.created_at,
    };
}

// ============================================================
// UUID helper
// ============================================================

function generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

// ============================================================
// Constants
// ============================================================

const PHOTOS_DIR = 'progress_photos/';

/**
 * Ensure the progress_photos directory exists.
 */
async function ensurePhotosDir(): Promise<string> {
    const dir = `${FileSystem.documentDirectory}${PHOTOS_DIR}`;
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
    return dir;
}

// ============================================================
// CRUD
// ============================================================

/**
 * Save a progress photo to local storage and create a DB entry.
 *
 * @param imageUri - URI of the image to copy (from camera/picker)
 * @param date - Date the photo represents (YYYY-MM-DD)
 * @param note - Optional note
 * @returns The created photo record, or null on failure
 */
export async function saveProgressPhoto(
    imageUri: string,
    date: string,
    note?: string,
): Promise<ProgressPhoto | null> {
    const db = await getDatabase();
    if (!db) return null;

    try {
        const dir = await ensurePhotosDir();
        const id = generateId();
        const timestamp = Date.now();
        const ext = imageUri.split('.').pop() ?? 'jpg';
        const filename = `${date}_${timestamp}.${ext}`;
        const relativePath = `${PHOTOS_DIR}${filename}`;
        const absolutePath = `${dir}${filename}`;

        // Copy image to app storage
        await FileSystem.copyAsync({
            from: imageUri,
            to: absolutePath,
        });

        const now = new Date().toISOString();

        // Fetch current bodyweight for the date (snapshot for overlay)
        const bwRow = await db.getFirstAsync<{ value: number }>(
            `SELECT value FROM measurements
             WHERE measurement_type_id = 'bodyweight' AND recorded_at = ?
             ORDER BY created_at DESC LIMIT 1`,
            [date],
        );

        await db.runAsync(
            `INSERT INTO progress_photos (id, file_path, recorded_at, bodyweight, note, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id, relativePath, date, bwRow?.value ?? null, note ?? null, now],
        );

        return {
            id,
            filePath: relativePath,
            recordedAt: date,
            bodyweight: bwRow?.value ?? null,
            note: note ?? null,
            createdAt: now,
        };
    } catch (error) {
        console.error('[PhotoService] Failed to save progress photo:', error);
        return null;
    }
}

/**
 * Get progress photos, optionally filtered by date range.
 * Returns metadata sorted chronologically (newest first).
 */
export async function getProgressPhotos(
    startDate?: string,
    endDate?: string,
): Promise<ProgressPhoto[]> {
    const db = await getDatabase();
    if (!db) return [];

    try {
        let sql = `SELECT * FROM progress_photos`;
        const params: string[] = [];
        const conditions: string[] = [];

        if (startDate) {
            conditions.push(`recorded_at >= ?`);
            params.push(startDate);
        }
        if (endDate) {
            conditions.push(`recorded_at <= ?`);
            params.push(endDate);
        }

        if (conditions.length > 0) {
            sql += ` WHERE ${conditions.join(' AND ')}`;
        }

        sql += ` ORDER BY recorded_at DESC, created_at DESC`;

        const rows = await db.getAllAsync<ProgressPhotoRow>(sql, params);
        return rows.map(mapPhotoRow);
    } catch (error) {
        console.error('[PhotoService] Failed to get progress photos:', error);
        return [];
    }
}

/**
 * Delete a progress photo from both the filesystem and DB.
 */
export async function deleteProgressPhoto(photoId: string): Promise<void> {
    const db = await getDatabase();
    if (!db) return;

    try {
        // Get file path before deleting the record
        const row = await db.getFirstAsync<{ file_path: string }>(
            `SELECT file_path FROM progress_photos WHERE id = ?`,
            [photoId],
        );

        if (row) {
            const absolutePath = `${FileSystem.documentDirectory}${row.file_path}`;
            const fileInfo = await FileSystem.getInfoAsync(absolutePath);
            if (fileInfo.exists) {
                await FileSystem.deleteAsync(absolutePath);
            }
        }

        await db.runAsync(`DELETE FROM progress_photos WHERE id = ?`, [photoId]);
    } catch (error) {
        console.error('[PhotoService] Failed to delete progress photo:', error);
    }
}

/**
 * Get a single photo with its associated bodyweight.
 */
export async function getPhotoWithBodyweight(
    photoId: string,
): Promise<ProgressPhoto | null> {
    const db = await getDatabase();
    if (!db) return null;

    try {
        const row = await db.getFirstAsync<ProgressPhotoRow>(
            `SELECT * FROM progress_photos WHERE id = ?`,
            [photoId],
        );

        return row ? mapPhotoRow(row) : null;
    } catch (error) {
        console.error('[PhotoService] Failed to get photo:', error);
        return null;
    }
}

/**
 * Get the full absolute URI for a progress photo's file.
 * Use this when rendering the photo in an Image component.
 */
export function getPhotoUri(relativePath: string): string {
    return `${FileSystem.documentDirectory}${relativePath}`;
}
