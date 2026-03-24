/**
 * Local ISO String Utility
 *
 * Converts a Date to an ISO-format string using the device's LOCAL timezone
 * instead of UTC. This is critical for correct calendar date display:
 *
 * Example: User at 10:37 PM PDT on March 23
 *   - date.toISOString()       → "2026-03-24T05:37:00.000Z" (UTC — wrong date!)
 *   - toLocalISOString(date)   → "2026-03-23T22:37:00.000"  (local — correct date)
 *
 * SQLite's DATE() function extracts the YYYY-MM-DD prefix, so storing local
 * timestamps ensures calendar queries return the user's local date.
 */

export function toLocalISOString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    const ms = String(date.getMilliseconds()).padStart(3, '0');
    return `${y}-${m}-${d}T${h}:${min}:${s}.${ms}`;
}
