/**
 * FitNotes CSV Parser
 *
 * Parses FitNotes' two CSV exports:
 * - FitNotes_Export.csv: workout data
 * - FitNotes_BodyTracker_Export.csv: body tracker measurements
 *
 * FitNotes CSV specifics:
 * - Comma-delimited
 * - No workout names — workouts are synthesized by grouping rows with same Date
 * - No workout duration, no RPE, no set type distinction
 * - Per-row Weight Unit column ("lbs" or "kg")
 * - Date format: "2025-07-22" (clean ISO)
 * - Time column for timed exercises: "H:MM:SS" format
 * - Category column can inform fuzzy matching
 *
 * WARNING: FitNotes' default export is a proprietary .fitnotes file.
 * Users must select "Export as Spreadsheet" to get CSV.
 */

import Papa from 'papaparse';
import { File } from 'expo-file-system';
import { toCanonicalWeight } from '../../utils/unitConversion';
import type {
    ParseResult,
    ParsedWorkout,
    ParsedExercise,
    ParsedSet,
    ParsedMeasurement,
} from './types';

// ============================================================
// CSV Row Types
// ============================================================

interface FitNotesWorkoutRow {
    Date: string;
    Exercise: string;
    Category: string;
    Weight: string;
    'Weight Unit': string;
    Reps: string;
    Distance: string;
    'Distance Unit': string;
    Time: string;
}

interface FitNotesBodyTrackerRow {
    Date: string;
    Time: string;
    Measurement: string;
    Value: string;
    Unit: string;
}

// ============================================================
// Helpers
// ============================================================

/**
 * Parse FitNotes time format "H:MM:SS" to seconds.
 * Returns null for empty/invalid values.
 */
function parseTimeDuration(timeStr: string | undefined): number | null {
    if (!timeStr || timeStr.trim() === '' || timeStr === '0:00:00') return null;

    const match = timeStr.match(/^(\d+):(\d{2}):(\d{2})$/);
    if (!match) return null;

    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const seconds = parseInt(match[3], 10);

    const total = hours * 3600 + minutes * 60 + seconds;
    return total > 0 ? total : null;
}

/**
 * Format an ISO date as a human-readable workout name.
 * "2025-07-22" → "Jul 22, 2025"
 */
function formatDateAsWorkoutName(isoDate: string): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;

    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return `${months[monthIdx]} ${day}, ${parts[0]}`;
}

/** FitNotes Measurement name → our measurement_type ID */
const FITNOTES_MEASUREMENT_MAP: Record<string, string> = {
    'Bodyweight': 'bodyweight',
    'Body Fat': 'body_fat',
    'Neck': 'neck',
    'Shoulders': 'shoulders',
    'Chest': 'chest',
    'Left Bicep': 'left_bicep',
    'Right Bicep': 'right_bicep',
    'Left Forearm': 'left_forearm',
    'Right Forearm': 'right_forearm',
    'Waist': 'waist',
    'Hips': 'hips',
    'Left Thigh': 'left_thigh',
    'Right Thigh': 'right_thigh',
    'Left Calf': 'left_calf',
    'Right Calf': 'right_calf',
};

// ============================================================
// Detection
// ============================================================

function isWorkoutFile(headers: string[]): boolean {
    return headers.some((h) => h === 'Exercise') && headers.some((h) => h === 'Category');
}

function isBodyTrackerFile(headers: string[]): boolean {
    return headers.some((h) => h === 'Measurement') && headers.some((h) => h === 'Value');
}

// ============================================================
// Parser
// ============================================================

/**
 * Parse FitNotes CSV file(s) into standardized workout and measurement data.
 *
 * @param fileUris - Array of file URIs (workout CSV + optional body tracker CSV)
 */
export async function parseFitNotesFiles(fileUris: string[]): Promise<ParseResult> {
    const workouts: ParsedWorkout[] = [];
    const measurements: ParsedMeasurement[] = [];
    const warnings: string[] = [];

    for (const uri of fileUris) {
        const file = new File(uri);
        const content = await file.text();

        const parsed = Papa.parse<Record<string, string>>(content, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (h: string) => h.trim(),
        });

        if (parsed.errors.length > 0) {
            warnings.push(`FitNotes CSV parse warnings: ${parsed.errors.map((e) => e.message).join(', ')}`);
        }

        const headers = parsed.meta.fields ?? [];

        if (isWorkoutFile(headers)) {
            const result = parseFitNotesWorkouts(parsed.data as unknown as FitNotesWorkoutRow[]);
            workouts.push(...result.workouts);
            warnings.push(...result.warnings);
        } else if (isBodyTrackerFile(headers)) {
            const result = parseFitNotesBodyTracker(parsed.data as unknown as FitNotesBodyTrackerRow[]);
            measurements.push(...result);
        } else {
            warnings.push(
                'Unrecognized FitNotes file format. Make sure you export using "Export as Spreadsheet" — not the default .fitnotes format.',
            );
        }
    }

    return { workouts, measurements, warnings };
}

function parseFitNotesWorkouts(rows: FitNotesWorkoutRow[]): { workouts: ParsedWorkout[]; warnings: string[] } {
    const warnings: string[] = [];

    // Group rows by Date (FitNotes has no workout names)
    const dateMap = new Map<string, FitNotesWorkoutRow[]>();
    for (const row of rows) {
        const date = row.Date?.trim();
        if (!date || !row.Exercise) continue;

        if (!dateMap.has(date)) {
            dateMap.set(date, []);
        }
        dateMap.get(date)!.push(row);
    }

    const workouts: ParsedWorkout[] = [];

    for (const [date, dayRows] of dateMap) {
        // Group by exercise within this day
        const exerciseMap = new Map<string, FitNotesWorkoutRow[]>();
        for (const row of dayRows) {
            const exName = row.Exercise.trim();
            if (!exerciseMap.has(exName)) {
                exerciseMap.set(exName, []);
            }
            exerciseMap.get(exName)!.push(row);
        }

        const exercises: ParsedExercise[] = [];
        for (const [exerciseName, exRows] of exerciseMap) {
            let setNum = 0;
            const sets: ParsedSet[] = exRows.map((r) => {
                setNum++;

                // Per-row weight unit
                const rawWeight = r.Weight ? parseFloat(r.Weight) : null;
                const weightUnit = r['Weight Unit']?.trim()?.toLowerCase() ?? 'lbs';
                const weight = rawWeight != null
                    ? (weightUnit === 'kg' ? toCanonicalWeight(rawWeight, 'kg') : rawWeight)
                    : null;

                return {
                    setNumber: setNum,
                    weight,
                    reps: r.Reps ? parseInt(r.Reps, 10) : null,
                    duration: parseTimeDuration(r.Time),
                    type: 'working' as const, // FitNotes doesn't distinguish
                    rpe: null, // FitNotes doesn't track RPE
                };
            });

            exercises.push({
                originalName: exerciseName,
                mappedExerciseId: null,
                sets,
            });
        }

        workouts.push({
            date,
            name: formatDateAsWorkoutName(date),
            duration: null, // FitNotes doesn't track workout duration
            exercises,
            notes: null,
        });
    }

    return { workouts, warnings };
}

function parseFitNotesBodyTracker(rows: FitNotesBodyTrackerRow[]): ParsedMeasurement[] {
    const measurements: ParsedMeasurement[] = [];

    for (const row of rows) {
        const date = row.Date?.trim();
        const measurementName = row.Measurement?.trim();
        const value = row.Value ? parseFloat(row.Value) : null;
        const unit = row.Unit?.trim() ?? '';

        if (!date || !measurementName || value == null || isNaN(value)) continue;

        // Map FitNotes measurement name to our type ID
        const typeId = FITNOTES_MEASUREMENT_MAP[measurementName];
        if (typeId) {
            measurements.push({
                date,
                type: typeId,
                value,
                unit,
            });
        }
        // Skip unknown measurement types silently
    }

    return measurements;
}
