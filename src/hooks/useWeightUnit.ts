/**
 * useWeightUnit Hook
 *
 * Reads the user's weight unit preference from settings and provides
 * the unit label string ('lbs' | 'kg'). Replaces all hardcoded 'lbs'
 * strings across the UI (TD-004).
 *
 * Caches the result in module scope so only one DB query is made per
 * app session, regardless of how many components call the hook.
 */

import { useState, useEffect } from 'react';
import { getSettings } from '../services/preferencesService';

// ============================================================
// Module-level cache (avoids repeated DB reads)
// ============================================================

let cachedUnit: string | null = null;
let cachePromise: Promise<string> | null = null;

async function loadWeightUnit(): Promise<string> {
    if (cachedUnit) return cachedUnit;
    if (cachePromise) return cachePromise;

    cachePromise = getSettings().then((s) => {
        cachedUnit = s.weightUnit;
        cachePromise = null;
        return cachedUnit;
    });

    return cachePromise;
}

/** Invalidate cache when settings change (call from SettingsScreen). */
export function invalidateWeightUnitCache(): void {
    cachedUnit = null;
    cachePromise = null;
}

// ============================================================
// Hook
// ============================================================

/**
 * Returns the user's preferred weight unit ('lbs' or 'kg').
 * Safe to call from any component — uses a module-level cache.
 */
export function useWeightUnit(): string {
    const [unit, setUnit] = useState(cachedUnit ?? 'lbs');

    useEffect(() => {
        loadWeightUnit().then(setUnit);
    }, []);

    return unit;
}

/**
 * Synchronous accessor for non-component contexts (formatters, utils).
 * Returns 'lbs' if the cache hasn't been populated yet.
 */
export function getWeightUnitSync(): string {
    return cachedUnit ?? 'lbs';
}
