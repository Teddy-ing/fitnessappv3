/**
 * UUID v4 generator
 *
 * Shared utility for generating unique IDs across services.
 * Uses Math.random() — sufficient for local-only client-side IDs.
 */

export function generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
