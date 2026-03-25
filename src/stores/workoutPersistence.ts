/**
 * Workout Persistence (TD-021)
 *
 * Persists the active workout to disk so it survives app kills and crashes.
 * Uses expo-file-system (new File/Paths API) to write a JSON snapshot.
 *
 * Design:
 * - Debounced writes (1s) to avoid excessive I/O during rapid set logging
 * - Date objects are serialized to ISO strings and restored on load
 * - Only persists workout-relevant state, not ephemeral signals
 */

import { File, Paths } from 'expo-file-system';

// ============================================================
// Constants
// ============================================================

const FILE_NAME = 'active-workout.json';
const DEBOUNCE_MS = 1000;

// Lazily created file handle
function getFile(): File {
    return new File(Paths.document, FILE_NAME);
}

// ============================================================
// Types
// ============================================================

/** The subset of workout store state that gets persisted */
export interface PersistedWorkoutState {
    activeWorkout: unknown; // Serialized Workout (Dates → ISO strings)
    isEditMode: boolean;
    originalDuration: number | null;
    originalCompletedAt: string | null; // ISO string
    originalStartedAt: string | null;   // ISO string
}

// ============================================================
// Date serialization helpers
// ============================================================

/**
 * JSON replacer: converts Date instances to ISO strings.
 */
function dateReplacer(_key: string, value: unknown): unknown {
    if (value instanceof Date) {
        return value.toISOString();
    }
    return value;
}

/**
 * ISO 8601 date pattern for the reviver.
 */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

/**
 * JSON reviver: converts ISO date strings back to Date objects.
 * Only targets keys that are known date fields to avoid false positives.
 */
const DATE_KEYS = new Set([
    'startedAt', 'completedAt', 'createdAt', 'updatedAt',
    'originalCompletedAt', 'originalStartedAt',
]);

function dateReviver(key: string, value: unknown): unknown {
    if (typeof value === 'string' && DATE_KEYS.has(key) && ISO_DATE_RE.test(value)) {
        return new Date(value);
    }
    return value;
}

// ============================================================
// Debounce
// ============================================================

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// ============================================================
// Public API
// ============================================================

/**
 * Persist the active workout state to disk (debounced).
 * Call this on every store mutation.
 */
export function persistWorkoutState(state: {
    activeWorkout: unknown;
    isEditMode: boolean;
    originalDuration: number | null;
    originalCompletedAt: Date | null;
    originalStartedAt: Date | null;
}): void {
    if (debounceTimer) clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
        try {
            if (!state.activeWorkout) {
                // No active workout — clear persisted file
                clearPersistedWorkout();
                return;
            }

            const payload: PersistedWorkoutState = {
                activeWorkout: state.activeWorkout,
                isEditMode: state.isEditMode,
                originalDuration: state.originalDuration,
                originalCompletedAt: state.originalCompletedAt?.toISOString() ?? null,
                originalStartedAt: state.originalStartedAt?.toISOString() ?? null,
            };

            const json = JSON.stringify(payload, dateReplacer);
            getFile().write(json);
            console.log('[WorkoutPersistence] State saved to disk');
        } catch (err) {
            console.warn('[WorkoutPersistence] Failed to persist workout:', err);
        }
    }, DEBOUNCE_MS);
}

/**
 * Load the persisted workout state from disk.
 * Returns null if no persisted state exists or if parsing fails.
 */
export async function loadPersistedWorkout(): Promise<{
    activeWorkout: unknown;
    isEditMode: boolean;
    originalDuration: number | null;
    originalCompletedAt: Date | null;
    originalStartedAt: Date | null;
} | null> {
    try {
        const file = getFile();
        if (!file.exists) return null;

        const json = await file.text();
        const parsed = JSON.parse(json, dateReviver) as PersistedWorkoutState;

        if (!parsed.activeWorkout) return null;

        return {
            activeWorkout: parsed.activeWorkout,
            isEditMode: parsed.isEditMode,
            originalDuration: parsed.originalDuration,
            originalCompletedAt: parsed.originalCompletedAt
                ? new Date(parsed.originalCompletedAt)
                : null,
            originalStartedAt: parsed.originalStartedAt
                ? new Date(parsed.originalStartedAt)
                : null,
        };
    } catch (err) {
        console.warn('[WorkoutPersistence] Failed to load persisted workout:', err);
        return null;
    }
}

/**
 * Delete the persisted workout file.
 * Called when a workout is finished or discarded.
 */
export function clearPersistedWorkout(): void {
    try {
        const file = getFile();
        if (file.exists) {
            file.delete();
            console.log('[WorkoutPersistence] Cleared persisted workout');
        }
    } catch (err) {
        console.warn('[WorkoutPersistence] Failed to clear persisted workout:', err);
    }
}

