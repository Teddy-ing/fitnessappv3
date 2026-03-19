/**
 * Measurement Models
 *
 * Canonical types for body measurements, progress photos,
 * and the measurement type catalog.
 */

// ============================================================
// Measurement Type (catalog entry)
// ============================================================

export type MeasurementCategory = 'core' | 'torso' | 'arms' | 'legs' | 'other';

export interface MeasurementType {
    id: string;
    name: string;
    category: MeasurementCategory;
    unitImperial: string;   // 'lbs', 'in', '%'
    unitMetric: string;     // 'kg', 'cm', '%'
    defaultVisible: boolean;
    orderIndex: number;
}

// ============================================================
// Measurement (user-recorded value)
// ============================================================

export interface Measurement {
    id: string;
    measurementTypeId: string;
    value: number;
    recordedAt: string;     // ISO date string (YYYY-MM-DD)
    note: string | null;
    createdAt: string;
}

// ============================================================
// Progress Photo
// ============================================================

export interface ProgressPhoto {
    id: string;
    filePath: string;       // Relative path under documentDirectory
    recordedAt: string;     // Date the photo represents
    bodyweight: number | null;  // Snapshot of bodyweight on that date
    note: string | null;
    createdAt: string;
}
