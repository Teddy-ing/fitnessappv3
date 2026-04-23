/**
 * useWeightUnit Hook
 *
 * Reads the user's weight unit preference from settings and provides
 * the unit label string ('lbs' | 'kg'). Replaces all hardcoded 'lbs'
 * strings across the UI (TD-004).
 *
 * Uses a module-level cache + subscriber pattern so that when the cache
 * is invalidated (e.g., from SettingsScreen), all mounted components
 * re-read the updated value.
 */

import { useState, useEffect, useCallback } from 'react';
import { getSettings } from '../services/preferencesService';

// ============================================================
// Module-level cache + subscriber list
// ============================================================

let cachedUnit: string | null = null;
let cachePromise: Promise<string> | null = null;

/** Set of subscriber callbacks — notified on cache invalidation */
const subscribers = new Set<(unit: string) => void>();

async function loadWeightUnit(): Promise<string> {
    if (cachedUnit) return cachedUnit;
    if (cachePromise) return cachePromise;

    cachePromise = getSettings()
        .then((s) => {
            cachedUnit = s.weightUnit;
            cachePromise = null;
            return cachedUnit;
        })
        .catch((err) => {
            console.warn('[useWeightUnit] Failed to load settings:', err);
            cachePromise = null; // Reset so next call retries
            return 'lbs'; // Fallback to default
        });

    return cachePromise;
}

/**
 * Invalidate cache when settings change (call from SettingsScreen).
 * Automatically re-reads from DB and notifies all mounted subscribers.
 */
export function invalidateWeightUnitCache(): void {
    cachedUnit = null;
    cachePromise = null;

    // Re-read from DB and notify all subscribers
    loadWeightUnit().then((unit) => {
        for (const fn of subscribers) {
            fn(unit);
        }
    });
}

// ============================================================
// Hook
// ============================================================

/**
 * Returns the user's preferred weight unit ('lbs' or 'kg').
 * Safe to call from any component — uses a module-level cache.
 * Automatically updates when the cache is invalidated.
 */
export function useWeightUnit(): string {
    const [unit, setUnit] = useState(cachedUnit ?? 'lbs');

    useEffect(() => {
        // Subscribe to future updates
        subscribers.add(setUnit);

        // Load the initial value (may already be cached)
        loadWeightUnit().then(setUnit);

        return () => {
            subscribers.delete(setUnit);
        };
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
