/**
 * Cloud Backup Service
 *
 * Google Drive integration for automatic cloud backup.
 * Uses the hidden App Data folder (drive.appdata scope) so the app
 * can only access its own files and cannot see any user Drive files.
 *
 * Backup format: reuses the existing ExportPayload JSON from dataTransferService.
 * Single file: workout-backup-latest.json (overwritten each backup).
 *
 * Auto-backup is fire-and-forget — called after saveWorkout() completes
 * without blocking the UI.
 */

import {
    GoogleSignin,
    isSuccessResponse,
    isErrorWithCode,
    statusCodes,
} from '@react-native-google-signin/google-signin';
import { getDatabase } from './database';
import { generateExportPayload } from './dataTransferService';

// ============================================================
// Configuration
// ============================================================

// TODO: Replace with your actual Web Client ID from Google Cloud Console
// See .agent/workflows/setup-gcp.md for setup instructions
const WEB_CLIENT_ID = '549657016861-7oaoios5sva0j1oknhlnhuc59fbfu5bk.apps.googleusercontent.com';

const BACKUP_FILENAME = 'workout-backup-latest.json';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';

// ============================================================
// Types
// ============================================================

export interface CloudBackupConfig {
    id: number;
    provider: string | null;
    accountIdentifier: string | null;
    autoBackupEnabled: boolean;
    lastBackupAt: string | null;
    lastBackupStatus: 'success' | 'failed' | 'none';
}

interface DriveFileListResponse {
    files: Array<{ id: string; name: string; modifiedTime?: string }>;
}

// ============================================================
// Initialization
// ============================================================

let isConfigured = false;

function ensureConfigured(): void {
    if (isConfigured) return;

    GoogleSignin.configure({
        scopes: ['https://www.googleapis.com/auth/drive.appdata'],
        webClientId: WEB_CLIENT_ID,
        offlineAccess: false,
    });

    isConfigured = true;
}

// ============================================================
// Authentication
// ============================================================

/**
 * Sign in with Google and store the provider config in the database.
 * Returns the user's email address.
 */
export async function connectGoogleDrive(): Promise<{ email: string }> {
    ensureConfigured();

    const response = await GoogleSignin.signIn();

    if (!isSuccessResponse(response)) {
        throw new Error('Google Sign-In was cancelled');
    }

    const email = response.data.user.email;

    // Store config in database
    const db = await getDatabase();
    if (!db) throw new Error('Database not available');

    await db.runAsync(
        `INSERT OR REPLACE INTO cloud_backup_config
            (id, provider, account_identifier, auto_backup_enabled, last_backup_at, last_backup_status)
        VALUES (1, 'google_drive', ?, 0, NULL, 'none')`,
        [email],
    );

    console.log(`[CloudBackup] Connected to Google Drive as ${email}`);
    return { email };
}

/**
 * Disconnect the current cloud provider.
 * Signs out of Google and clears the config.
 */
export async function disconnectCloudProvider(): Promise<void> {
    try {
        await GoogleSignin.signOut();
    } catch {
        // Ignore sign-out errors — we're clearing config anyway
    }

    const db = await getDatabase();
    if (!db) return;

    await db.runAsync(
        `UPDATE cloud_backup_config SET
            provider = NULL,
            account_identifier = NULL,
            auto_backup_enabled = 0,
            last_backup_at = NULL,
            last_backup_status = 'none'
        WHERE id = 1`,
    );

    console.log('[CloudBackup] Disconnected');
}

/**
 * Get the current cloud backup configuration.
 */
export async function getCloudBackupConfig(): Promise<CloudBackupConfig | null> {
    const db = await getDatabase();
    if (!db) return null;

    const row = await db.getFirstAsync<{
        id: number;
        provider: string | null;
        account_identifier: string | null;
        auto_backup_enabled: number;
        last_backup_at: string | null;
        last_backup_status: string;
    }>('SELECT * FROM cloud_backup_config WHERE id = 1');

    if (!row) return null;

    return {
        id: row.id,
        provider: row.provider,
        accountIdentifier: row.account_identifier,
        autoBackupEnabled: row.auto_backup_enabled === 1,
        lastBackupAt: row.last_backup_at,
        lastBackupStatus: (row.last_backup_status as CloudBackupConfig['lastBackupStatus']) ?? 'none',
    };
}

/**
 * Check if a cloud provider is connected.
 */
export async function isConnected(): Promise<boolean> {
    const config = await getCloudBackupConfig();
    return config?.provider != null;
}

// ============================================================
// Backup
// ============================================================

/**
 * Get an access token for Google Drive API calls.
 * Silently refreshes if the user is already signed in.
 */
async function getAccessToken(): Promise<string> {
    ensureConfigured();

    // Try silent sign-in first (uses cached session)
    try {
        await GoogleSignin.signInSilently();
    } catch {
        // If silent fails, we need the user to re-authenticate
        throw new Error('Google Sign-In session expired. Please reconnect.');
    }

    const tokens = await GoogleSignin.getTokens();
    return tokens.accessToken;
}

/**
 * Find the backup file in the App Data folder.
 * Returns the file ID if found, null otherwise.
 */
async function findBackupFile(accessToken: string): Promise<string | null> {
    const response = await fetch(
        `${DRIVE_FILES_URL}?spaces=appDataFolder&q=name='${BACKUP_FILENAME}'&fields=files(id,name,modifiedTime)`,
        {
            headers: { Authorization: `Bearer ${accessToken}` },
        },
    );

    if (!response.ok) {
        throw new Error(`Drive API error: ${response.status} ${response.statusText}`);
    }

    const data: DriveFileListResponse = await response.json();
    return data.files.length > 0 ? data.files[0].id : null;
}

/**
 * Upload the backup payload to Google Drive's App Data folder.
 * Overwrites the existing file if it exists.
 */
async function uploadToDrive(payload: string, accessToken: string): Promise<void> {
    const existingFileId = await findBackupFile(accessToken);

    if (existingFileId) {
        // Update existing file (PATCH)
        const response = await fetch(
            `${DRIVE_UPLOAD_URL}/${existingFileId}?uploadType=media`,
            {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: payload,
            },
        );

        if (!response.ok) {
            throw new Error(`Drive upload failed: ${response.status}`);
        }
    } else {
        // Create new file (multipart upload)
        const metadata = {
            name: BACKUP_FILENAME,
            parents: ['appDataFolder'],
        };

        const boundary = '===backup_boundary===';
        const body =
            `--${boundary}\r\n` +
            `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
            `${JSON.stringify(metadata)}\r\n` +
            `--${boundary}\r\n` +
            `Content-Type: application/json\r\n\r\n` +
            `${payload}\r\n` +
            `--${boundary}--`;

        const response = await fetch(
            `${DRIVE_UPLOAD_URL}?uploadType=multipart`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': `multipart/related; boundary=${boundary}`,
                },
                body,
            },
        );

        if (!response.ok) {
            throw new Error(`Drive upload failed: ${response.status}`);
        }
    }
}

/**
 * Download the backup file from Google Drive.
 * Returns the JSON string, or null if no backup exists.
 */
async function downloadFromDrive(accessToken: string): Promise<string | null> {
    const fileId = await findBackupFile(accessToken);
    if (!fileId) return null;

    const response = await fetch(
        `${DRIVE_FILES_URL}/${fileId}?alt=media`,
        {
            headers: { Authorization: `Bearer ${accessToken}` },
        },
    );

    if (!response.ok) {
        throw new Error(`Drive download failed: ${response.status}`);
    }

    return response.text();
}

/**
 * Back up the current database to Google Drive.
 * Generates the export payload and uploads it to the App Data folder.
 */
export async function backupToCloud(): Promise<{ timestamp: string }> {
    const db = await getDatabase();
    if (!db) throw new Error('Database not available');

    const accessToken = await getAccessToken();
    const payload = await generateExportPayload();
    const payloadStr = JSON.stringify(payload);

    await uploadToDrive(payloadStr, accessToken);

    const timestamp = new Date().toISOString();

    // Update config with success status
    await db.runAsync(
        `UPDATE cloud_backup_config SET
            last_backup_at = ?,
            last_backup_status = 'success'
        WHERE id = 1`,
        [timestamp],
    );

    console.log(`[CloudBackup] Backup complete at ${timestamp}`);
    return { timestamp };
}

/**
 * Restore data from the cloud backup.
 * This is a DESTRUCTIVE operation — all existing data is replaced.
 *
 * @returns true if restore succeeded, false if no backup was found
 */
export async function restoreFromCloud(): Promise<boolean> {
    const accessToken = await getAccessToken();
    const content = await downloadFromDrive(accessToken);

    if (!content) {
        return false; // No backup found
    }

    // Parse and validate
    const payload = JSON.parse(content);

    if (!payload.meta || !payload.tables) {
        throw new Error('Invalid cloud backup: missing meta or tables');
    }

    if (payload.meta.platform !== 'workout-app') {
        throw new Error('Invalid cloud backup: not created by workout-app');
    }

    const db = await getDatabase();
    if (!db) throw new Error('Database not available');

    // Check schema version
    const versionRow = await db.getFirstAsync<{ user_version: number }>(
        'PRAGMA user_version;',
    );
    const currentVersion = versionRow?.user_version ?? 0;

    if (payload.meta.schemaVersion > currentVersion) {
        throw new Error(
            `This backup requires a newer app version ` +
            `(schema v${payload.meta.schemaVersion}, you have v${currentVersion}).`,
        );
    }

    // Use the same EXPORT_TABLES ordering as dataTransferService
    const RESTORE_TABLES = [
        'user_settings', 'exercises', 'templates', 'template_exercises',
        'splits', 'splits_templates', 'splits_schedule', 'workouts',
        'workout_exercises', 'workout_sets', 'personal_records',
        'measurements', 'progress_photos', 'goals', 'exercise_notes',
    ] as const;

    // Destructive restore
    await db.withTransactionAsync(async () => {
        // Clear in reverse FK order
        const reversed = [...RESTORE_TABLES].reverse();
        for (const table of reversed) {
            await db.execAsync(`DELETE FROM ${table};`);
        }

        // Insert all rows
        for (const table of RESTORE_TABLES) {
            const rows = payload.tables[table];
            if (!rows || rows.length === 0) continue;

            for (const row of rows) {
                const columns = Object.keys(row);
                const placeholders = columns.map(() => '?').join(', ');
                const values = columns.map((col: string) => {
                    const val = row[col];
                    if (val === null || val === undefined) return null;
                    if (typeof val === 'boolean') return val ? 1 : 0;
                    return val;
                });

                await db.runAsync(
                    `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
                    values as (string | number | null)[],
                );
            }
        }
    });

    console.log(`[CloudBackup] Restore complete from ${payload.meta.exportedAt}`);
    return true;
}

// ============================================================
// Settings
// ============================================================

/**
 * Toggle the auto-backup setting.
 */
export async function setAutoBackup(enabled: boolean): Promise<void> {
    const db = await getDatabase();
    if (!db) return;

    await db.runAsync(
        `UPDATE cloud_backup_config SET auto_backup_enabled = ? WHERE id = 1`,
        [enabled ? 1 : 0],
    );
}

// ============================================================
// Auto-Backup (Fire-and-Forget)
// ============================================================

/**
 * Fire-and-forget auto-backup trigger.
 * Called after saveWorkout() — non-blocking, no error propagation.
 *
 * Reads the config, and if auto-backup is enabled and a provider
 * is connected, uploads the backup in the background.
 */
export function triggerAutoBackupIfEnabled(): void {
    // Detached promise — intentionally not awaited
    (async () => {
        try {
            const config = await getCloudBackupConfig();
            if (!config?.autoBackupEnabled || !config.provider) return;

            await backupToCloud();
        } catch (error) {
            console.warn('[CloudBackup] Auto-backup failed:', error);

            // Update status to 'failed' so the UI shows a warning
            try {
                const db = await getDatabase();
                if (db) {
                    await db.runAsync(
                        `UPDATE cloud_backup_config SET last_backup_status = 'failed' WHERE id = 1`,
                    );
                }
            } catch {
                // Silently ignore — we're already in error handling
            }
        }
    })();
}
