/**
 * Hevy CSV Parser
 *
 * Parses Hevy's two CSV exports:
 * - workout_data.csv: exercise data grouped by workout
 * - measurement_data.csv: body measurements
 *
 * Hevy CSV specifics:
 * - Comma-delimited
 * - Date format: "DD Mon YYYY, HH:MM"
 * - weight_lbs column is already in lbs (no conversion needed)
 * - set_index is 0-based (we add 1)
 * - Workouts grouped by title + start_time combination
 */

import Papa from 'papaparse';
import { File } from 'expo-file-system';
import type {
    ParseResult,
    ParsedWorkout,
    ParsedExercise,
    ParsedSet,
    ParsedMeasurement,
} from './types';

// ============================================================
// Date Parsing
// ============================================================

const MONTH_MAP: Record<string, number> = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11,
};

/**
 * Parse Hevy's custom date format: "23 Apr 2026, 17:22"
 * Returns ISO date string "YYYY-MM-DD"
 */
function parseHevyDate(dateStr: string): string {
    const match = dateStr.match(/^(\d{1,2})\s+(\w{3})\s+(\d{4})/);
    if (!match) return dateStr; // fallback

    const day = match[1].padStart(2, '0');
    const monthNum = MONTH_MAP[match[2]];
    const year = match[3];

    if (monthNum === undefined) return dateStr;
    const month = String(monthNum + 1).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Parse Hevy's date format to a full Date object for duration calculations.
 * "23 Apr 2026, 17:22" → Date
 */
function parseHevyDateTime(dateStr: string): Date | null {
    const match = dateStr.match(/^(\d{1,2})\s+(\w{3})\s+(\d{4}),?\s+(\d{1,2}):(\d{2})/);
    if (!match) return null;

    const day = parseInt(match[1], 10);
    const monthNum = MONTH_MAP[match[2]];
    const year = parseInt(match[3], 10);
    const hour = parseInt(match[4], 10);
    const minute = parseInt(match[5], 10);

    if (monthNum === undefined) return null;
    return new Date(year, monthNum, day, hour, minute);
}

// ============================================================
// CSV Row Types
// ============================================================

interface HevyWorkoutRow {
    title: string;
    start_time: string;
    end_time: string;
    description: string;
    exercise_title: string;
    superset_id: string;
    exercise_notes: string;
    set_index: string;
    set_type: string;
    weight_lbs: string;
    reps: string;
    distance_miles: string;
    duration_seconds: string;
    rpe: string;
}

interface HevyMeasurementRow {
    date: string;
    weight_lbs: string;
    fat_percent: string;
    neck_in: string;
    shoulder_in: string;
    chest_in: string;
    left_bicep_in: string;
    right_bicep_in: string;
    left_forearm_in: string;
    right_forearm_in: string;
    abdomen_in: string;
    waist_in: string;
    hips_in: string;
    left_thigh_in: string;
    right_thigh_in: string;
    left_calf_in: string;
    right_calf_in: string;
}

// ============================================================
// Parser
// ============================================================

/**
 * Detect if a CSV file is a Hevy workout file or measurement file
 * based on the header row.
 */
function isWorkoutFile(headers: string[]): boolean {
    return headers.some((h) => h === 'exercise_title' || h === 'set_index');
}

function isMeasurementFile(headers: string[]): boolean {
    return headers.some((h) => h === 'weight_lbs' || h === 'fat_percent') &&
           !headers.some((h) => h === 'exercise_title');
}

/**
 * Parse Hevy CSV file(s) into standardized workout and measurement data.
 *
 * @param fileUris - Array of file URIs (workout CSV + optional measurement CSV)
 */
export async function parseHevyFiles(fileUris: string[]): Promise<ParseResult> {
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
            warnings.push(`Hevy CSV parse warnings: ${parsed.errors.map((e) => e.message).join(', ')}`);
        }

        const headers = parsed.meta.fields ?? [];

        if (isWorkoutFile(headers)) {
            const parsed_workouts = parseHevyWorkouts(parsed.data as unknown as HevyWorkoutRow[]);
            workouts.push(...parsed_workouts.workouts);
            warnings.push(...parsed_workouts.warnings);
        } else if (isMeasurementFile(headers)) {
            const parsed_measurements = parseHevyMeasurements(parsed.data as unknown as HevyMeasurementRow[]);
            measurements.push(...parsed_measurements);
        } else {
            warnings.push(`Unrecognized Hevy CSV file format. Expected workout or measurement data.`);
        }
    }

    return { workouts, measurements, warnings };
}

function parseHevyWorkouts(rows: HevyWorkoutRow[]): { workouts: ParsedWorkout[]; warnings: string[] } {
    const warnings: string[] = [];
    const workoutMap = new Map<string, { rows: HevyWorkoutRow[]; startTime: string; endTime: string; description: string }>();

    // Group rows by workout identity (title + start_time)
    for (const row of rows) {
        if (!row.exercise_title || !row.start_time) continue;

        const key = `${row.title}|${row.start_time}`;
        if (!workoutMap.has(key)) {
            workoutMap.set(key, {
                rows: [],
                startTime: row.start_time,
                endTime: row.end_time,
                description: row.description,
            });
        }
        workoutMap.get(key)!.rows.push(row);
    }

    const workouts: ParsedWorkout[] = [];

    for (const [, workout] of workoutMap) {
        // Calculate duration
        const startDate = parseHevyDateTime(workout.startTime);
        const endDate = parseHevyDateTime(workout.endTime);
        const duration = startDate && endDate
            ? Math.round((endDate.getTime() - startDate.getTime()) / 1000)
            : null;

        // Group rows by exercise within this workout
        const exerciseMap = new Map<string, HevyWorkoutRow[]>();
        for (const row of workout.rows) {
            const exKey = row.exercise_title;
            if (!exerciseMap.has(exKey)) {
                exerciseMap.set(exKey, []);
            }
            exerciseMap.get(exKey)!.push(row);
        }

        const exercises: ParsedExercise[] = [];
        for (const [exerciseName, exRows] of exerciseMap) {
            const sets: ParsedSet[] = exRows.map((r) => ({
                setNumber: (parseInt(r.set_index, 10) || 0) + 1, // 0-indexed → 1-indexed
                weight: r.weight_lbs ? parseFloat(r.weight_lbs) : null,
                reps: r.reps ? parseInt(r.reps, 10) : null,
                duration: r.duration_seconds ? parseFloat(r.duration_seconds) : null,
                type: r.set_type === 'warmup' ? 'warmup' as const : 'working' as const,
                rpe: r.rpe ? parseFloat(r.rpe) : null,
            }));

            exercises.push({
                originalName: exerciseName,
                mappedExerciseId: null,
                sets,
            });
        }

        workouts.push({
            date: parseHevyDate(workout.startTime),
            name: workout.rows[0]?.title || 'Workout',
            duration,
            exercises,
            notes: workout.description || null,
        });
    }

    return { workouts, warnings };
}

// Mapping of Hevy measurement columns to our measurement_type IDs
const HEVY_MEASUREMENT_MAP: Record<string, { type: string; unit: string }> = {
    weight_lbs: { type: 'bodyweight', unit: 'lbs' },
    fat_percent: { type: 'body_fat', unit: '%' },
    neck_in: { type: 'neck', unit: 'in' },
    shoulder_in: { type: 'shoulders', unit: 'in' },
    chest_in: { type: 'chest', unit: 'in' },
    right_bicep_in: { type: 'right_bicep', unit: 'in' },
    left_bicep_in: { type: 'left_bicep', unit: 'in' },
    right_forearm_in: { type: 'right_forearm', unit: 'in' },
    left_forearm_in: { type: 'left_forearm', unit: 'in' },
    abdomen_in: { type: 'waist', unit: 'in' },  // abdomen → waist (closest match)
    // BH-064: waist_in intentionally omitted — both abdomen_in and waist_in
    // map to the same 'waist' type, producing duplicate measurements.
    hips_in: { type: 'hips', unit: 'in' },
    right_thigh_in: { type: 'right_thigh', unit: 'in' },
    left_thigh_in: { type: 'left_thigh', unit: 'in' },
    right_calf_in: { type: 'right_calf', unit: 'in' },
    left_calf_in: { type: 'left_calf', unit: 'in' },
};

function parseHevyMeasurements(rows: HevyMeasurementRow[]): ParsedMeasurement[] {
    const measurements: ParsedMeasurement[] = [];

    for (const row of rows) {
        const date = parseHevyDate(row.date);

        for (const [column, mapping] of Object.entries(HEVY_MEASUREMENT_MAP)) {
            const value = (row as unknown as Record<string, string>)[column];
            if (value && value.trim() !== '') {
                const numValue = parseFloat(value);
                if (!isNaN(numValue)) {
                    measurements.push({
                        date,
                        type: mapping.type,
                        value: numValue,
                        unit: mapping.unit,
                    });
                }
            }
        }
    }

    return measurements;
}
