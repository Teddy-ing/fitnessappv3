/**
 * Unit Conversion Utilities
 *
 * Provides conversion factors for weight, distance, and measurement
 * unit display. Historical data is stored as raw numbers (no unit tag),
 * so conversion is applied at the display layer.
 *
 * Convention: data is assumed to be stored in imperial units (lbs, mi, in)
 * since those are the app's defaults. When the user switches to metric,
 * we apply a conversion factor for display.
 */

// ============================================================
// Conversion factors (imperial → metric)
// ============================================================

const LBS_TO_KG = 0.453592;
const MI_TO_KM = 1.60934;
const IN_TO_CM = 2.54;

// ============================================================
// Weight conversion
// ============================================================

/**
 * Convert a weight value from the storage unit (lbs) to the display unit.
 * If displayUnit is 'lbs', returns the value unchanged.
 */
export function convertWeight(value: number, displayUnit: string): number {
    if (displayUnit === 'kg') {
        return value * LBS_TO_KG;
    }
    return value;
}

/**
 * Convert a weight value from the display unit to the canonical storage unit (lbs).
 * This is the inverse of convertWeight — used at the input boundary (keyboard).
 * If displayUnit is 'lbs', returns the value unchanged.
 */
export function toCanonicalWeight(value: number, displayUnit: string): number {
    if (displayUnit === 'kg') {
        return value / LBS_TO_KG;
    }
    return value;
}

/**
 * Convert a distance value from the storage unit (mi) to the display unit.
 * If displayUnit is 'mi', returns the value unchanged.
 */
export function convertDistance(value: number, displayUnit: string): number {
    if (displayUnit === 'km') {
        return value * MI_TO_KM;
    }
    return value;
}

/**
 * Convert a measurement value from the storage unit (in) to the display unit.
 * If displayUnit is 'in', returns the value unchanged.
 */
export function convertMeasurement(value: number, displayUnit: string): number {
    if (displayUnit === 'cm') {
        return value * IN_TO_CM;
    }
    return value;
}
