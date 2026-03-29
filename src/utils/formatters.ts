/**
 * Formatters
 *
 * Shared display formatting utilities used across calendar components
 * and workout detail views.
 */

/** Format seconds → "1h 05m" or "45m". Returns fallback for null/zero. */
export function formatDuration(seconds: number | null, fallback: string = '—'): string {
    if (!seconds || seconds <= 0) return fallback;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
    return `${m}m`;
}

/** Format volume → "12,500 lbs". Returns fallback for null/zero. */
export function formatVolume(volume: number | null, fallback: string = '—', unit?: string): string {
    if (!volume || volume <= 0) return fallback;
    return volume.toLocaleString() + ' ' + (unit ?? 'lbs');
}

/** Format a Date to ISO date string (YYYY-MM-DD), timezone-safe. */
export function formatISODate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/** Format volume compactly for widget contexts: "12k", "1.5k", "450". No unit suffix. */
export function formatCompactVolume(v: number): string {
    if (v >= 10000) return `${(v / 1000).toFixed(0)}k`;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
    return Math.round(v).toString();
}
