/** Read-side notification after a committed preference write, restore, or reset. */
const listeners = new Set<() => void>();

export function subscribeSettingsChanges(listener: () => void): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

export function notifySettingsChanged(): void {
    for (const listener of listeners) {
        try { listener(); }
        catch (error) { console.warn('[Settings] Refresh listener failed:', error); }
    }
}
