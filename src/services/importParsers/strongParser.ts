/**
 * Strong CSV Parser
 *
 * Parses Strong's single CSV export file.
 *
 * Strong CSV specifics:
 * - Semicolon-delimited (NOT comma)
 * - All values are double-quoted
 * - Weight is ALWAYS in kg (column header: "Weight (kg)")
 * - "Rest Timer" rows in Set Order must be filtered out
 * - Workouts grouped by "Workout #" column
 * - No measurement data, no warmup/working distinction
 * - Date format: "2026-01-06 14:19:10" (standard, parseable)
 */

import Papa from 'papaparse';
import { File } from 'expo-file-system';
import { toCanonicalWeight } from '../../utils/unitConversion';
import type {
    ParseResult,
    ParsedWorkout,
    ParsedExercise,
    ParsedSet,
} from './types';

// ============================================================
// CSV Row Type
// ============================================================

interface StrongRow {
    'Workout #': string;
    'Date': string;
    'Workout Name': string;
    'Duration (sec)': string;
    'Exercise Name': string;
    'Set Order': string;
    'Weight (kg)': string;
    'Reps': string;
    'RPE': string;
    'Distance (meters)': string;
    'Seconds': string;
    'Notes': string;
    'Workout Notes': string;
}

// ============================================================
// Parser
// ============================================================

/**
 * Parse a Strong CSV file into standardized workout data.
 *
 * @param fileUris - Array containing a single file URI
 */
export async function parseStrongFiles(fileUris: string[]): Promise<ParseResult> {
    const warnings: string[] = [];

    if (fileUris.length === 0) {
        return { workouts: [], measurements: [], warnings: ['No file provided'] };
    }

    const file = new File(fileUris[0]);
    const content = await file.text();

    const parsed = Papa.parse<StrongRow>(content, {
        header: true,
        delimiter: ';', // Strong uses semicolons
        skipEmptyLines: true,
        transformHeader: (h: string) => h.trim(),
    });

    if (parsed.errors.length > 0) {
        warnings.push(`Strong CSV parse warnings: ${parsed.errors.map((e) => e.message).join(', ')}`);
    }

    // Group rows by Workout #
    const workoutMap = new Map<string, StrongRow[]>();
    let restTimerRowsSkipped = 0;

    for (const row of parsed.data) {
        // Filter out "Rest Timer" rows
        if (row['Set Order']?.trim() === 'Rest Timer') {
            restTimerRowsSkipped++;
            continue;
        }

        const workoutNum = row['Workout #'];
        if (!workoutNum) continue;

        if (!workoutMap.has(workoutNum)) {
            workoutMap.set(workoutNum, []);
        }
        workoutMap.get(workoutNum)!.push(row);
    }

    if (restTimerRowsSkipped > 0) {
        warnings.push(`Skipped ${restTimerRowsSkipped} rest timer rows.`);
    }

    // Convert each workout group
    const workouts: ParsedWorkout[] = [];

    for (const [, rows] of workoutMap) {
        if (rows.length === 0) continue;

        const firstRow = rows[0];
        const dateStr = firstRow['Date']?.trim();
        const date = dateStr ? dateStr.split(' ')[0] : ''; // "2026-01-06 14:19:10" → "2026-01-06"

        const durationSec = firstRow['Duration (sec)']
            ? parseInt(firstRow['Duration (sec)'], 10)
            : null;

        // Group rows by exercise within this workout
        const exerciseMap = new Map<string, StrongRow[]>();
        for (const row of rows) {
            const exName = row['Exercise Name']?.trim();
            if (!exName) continue;

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
                const weightKg = r['Weight (kg)'] ? parseFloat(r['Weight (kg)']) : null;
                // Strong always exports in kg — convert to canonical lbs
                const weightLbs = weightKg != null ? toCanonicalWeight(weightKg, 'kg') : null;

                return {
                    setNumber: setNum,
                    weight: weightLbs,
                    reps: r['Reps'] ? parseInt(r['Reps'], 10) : null,
                    duration: r['Seconds'] ? parseFloat(r['Seconds']) : null,
                    type: 'working' as const, // Strong doesn't distinguish
                    rpe: r['RPE'] ? parseFloat(r['RPE']) : null,
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
            name: firstRow['Workout Name']?.trim() || 'Workout',
            duration: durationSec,
            exercises,
            notes: firstRow['Workout Notes']?.trim() || null,
        });
    }

    // Strong has no measurement data
    return { workouts, measurements: [], warnings };
}
