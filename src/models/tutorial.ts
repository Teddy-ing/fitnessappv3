export type TutorialStatus = 'available' | 'active' | 'skipped' | 'completed';

/** Only the invitation and opt-in persist; the short guide always opens at its start. */
export interface TutorialProgress {
    version: 1;
    status: TutorialStatus;
}

export function createTutorialProgress(status: TutorialStatus = 'available'): TutorialProgress {
    return { version: 1, status };
}

export function parseTutorialProgress(value: unknown): TutorialProgress | null {
    if (typeof value === 'string') {
        try {
            value = JSON.parse(value);
        } catch {
            return null;
        }
    }
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
    const candidate = value as Record<string, unknown>;
    if (candidate.version !== 1 || !['available', 'active', 'skipped', 'completed'].includes(candidate.status as string)) {
        return null;
    }
    return createTutorialProgress(candidate.status as TutorialStatus);
}
