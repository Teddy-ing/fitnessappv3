/**
 * Competitor Import Service
 *
 * Orchestrates the full import pipeline:
 * 1. Parse competitor CSV files via importParsers
 * 2. Generate exercise mappings (fuzzy matching)
 * 3. Execute batch INSERT of resolved data
 *
 * All imports are ADDITIVE — existing data is never cleared.
 * Batch inserts are chunked at 500 per Guardrail #8.
 */

import { getDatabase } from './database';
import { createCustomExercise } from './exerciseService';
import { toLocalISOString } from '../utils/localDate';
import { generateId } from '../utils/uuid';
import type {
    CompetitorSource,
    ParsedWorkout,
    ParsedExercise,
    ParsedMeasurement,
    ExerciseMapping,
    ImportSummary,
    ImportResult,
} from './importParsers/types';

// ============================================================
// Constants
// ============================================================

const BATCH_SIZE = 500;

// ============================================================
// Summary Generation
// ============================================================

/**
 * Compute a human-readable summary of the parsed import data.
 */
export function getImportSummary(
    source: CompetitorSource,
    workouts: ParsedWorkout[],
    measurements: ParsedMeasurement[],
    mappings: ExerciseMapping[],
): ImportSummary {
    let totalSets = 0;
    const exerciseNames = new Set<string>();

    for (const w of workouts) {
        for (const ex of w.exercises) {
            exerciseNames.add(ex.originalName);
            totalSets += ex.sets.length;
        }
    }

    const mapped = mappings.filter((m) => m.resolvedExerciseId != null).length;
    const skipped = mappings.filter((m) => m.action === 'skip').length;
    const unmapped = mappings.filter(
        (m) => m.resolvedExerciseId == null && m.action !== 'skip' && m.action !== 'create',
    ).length;

    const warnings: string[] = [];
    if (skipped > 0) {
        warnings.push(`${skipped} exercise(s) will be skipped and their sets excluded.`);
    }

    return {
        source,
        totalWorkouts: workouts.length,
        totalSets,
        totalExercises: exerciseNames.size,
        totalMeasurements: measurements.length,
        mappedExercises: mapped,
        unmappedExercises: unmapped,
        skippedExercises: skipped,
        warnings,
    };
}

// ============================================================
// Import Execution
// ============================================================

/**
 * Execute the competitor import — writes parsed data into the database.
 *
 * This is ADDITIVE — it does NOT clear existing data.
 * All inserts are wrapped in a single transaction.
 * Batch inserts are chunked at 500 rows per Guardrail #8.
 *
 * @param workouts - Parsed workout data from a competitor parser
 * @param mappings - Resolved exercise mappings (from user or auto-match)
 * @param measurements - Parsed measurement data (optional)
 * @returns Import result with counts
 */
export async function executeCompetitorImport(
    workouts: ParsedWorkout[],
    mappings: ExerciseMapping[],
    measurements: ParsedMeasurement[],
): Promise<ImportResult> {
    const db = await getDatabase();
    if (!db) throw new Error('Database not available');

    // Build a lookup: original exercise name → resolved exercise ID
    const exerciseIdMap = new Map<string, string>();
    const exercisesToCreate: ExerciseMapping[] = [];

    for (const m of mappings) {
        if (m.action === 'skip') continue;

        if (m.action === 'create') {
            exercisesToCreate.push(m);
        } else if (m.resolvedExerciseId) {
            exerciseIdMap.set(m.originalName, m.resolvedExerciseId);
        }
    }

    // Create custom exercises first (outside the main transaction)
    for (const m of exercisesToCreate) {
        const created = await createCustomExercise(
            m.originalName,
            'strength', // Default category — user can edit later
            [],         // No muscle groups
            ['none'],   // No equipment
        );
        if (created) {
            exerciseIdMap.set(m.originalName, created.id);
            m.resolvedExerciseId = created.id;
        }
    }

    // Prepare batch data
    const workoutValues: (string | number | null)[][] = [];
    const exerciseValues: (string | number | null)[][] = [];
    const setValues: (string | number | null)[][] = [];
    const measurementValues: (string | number | null)[][] = [];

    const now = toLocalISOString(new Date());
    let workoutsInserted = 0;
    let setsInserted = 0;
    let exercisesCreated = exercisesToCreate.filter((m) => m.resolvedExerciseId).length;

    for (const workout of workouts) {
        const workoutId = generateId();
        const date = workout.date;

        // Filter exercises to only those with resolved mappings
        const resolvedExercises: { exercise: ParsedExercise; exerciseId: string }[] = [];
        for (const ex of workout.exercises) {
            const exId = exerciseIdMap.get(ex.originalName);
            if (exId) {
                resolvedExercises.push({ exercise: ex, exerciseId: exId });
            }
        }

        if (resolvedExercises.length === 0) continue; // Skip workouts with no valid exercises

        // Calculate total volume and sets
        let totalVolume = 0;
        let totalSets = 0;
        for (const { exercise } of resolvedExercises) {
            for (const set of exercise.sets) {
                totalSets++;
                if (set.weight != null && set.reps != null) {
                    totalVolume += set.weight * set.reps;
                }
            }
        }

        workoutValues.push([
            workoutId,
            workout.name,
            'completed',
            `${date}T09:00:00`,  // Synthetic start time
            `${date}T10:00:00`,  // Synthetic end time
            workout.duration,
            totalVolume > 0 ? totalVolume : null,
            totalSets,
            '[]',    // muscle_groups_worked — not computed for imports
            null,    // location
            workout.notes,
            null,    // template_id
            new Date(date).getDay(),
            now,
            now,
        ]);
        workoutsInserted++;

        for (let exIdx = 0; exIdx < resolvedExercises.length; exIdx++) {
            const { exercise, exerciseId } = resolvedExercises[exIdx];
            const workoutExerciseId = generateId();

            exerciseValues.push([
                workoutExerciseId,
                workoutId,
                exerciseId,
                exercise.originalName,
                'strength',  // Default — snapshot only
                '[]',        // muscle_groups
                '[]',        // equipment
                1,           // track_weight
                1,           // track_reps
                0,           // track_time
                exIdx,       // order_index
                null,        // superset_group_id
                null,        // note
            ]);

            for (const set of exercise.sets) {
                setValues.push([
                    generateId(),
                    workoutExerciseId,
                    set.setNumber - 1, // order_index is 0-based
                    set.weight,
                    set.reps,
                    set.duration,
                    null,        // distance
                    set.type,
                    'completed',
                    set.rpe,
                    null,        // rir
                    null,        // suggested_weight
                    null,        // suggested_reps
                    null,        // note
                    `${date}T09:00:00`, // completed_at
                    null,        // rest_duration
                ]);
                setsInserted++;
            }
        }
    }

    // Prepare measurement values
    let measurementsInserted = 0;
    for (const m of measurements) {
        measurementValues.push([
            generateId(),
            m.type,
            m.value,
            m.date,
            null,  // note
            now,   // created_at
        ]);
        measurementsInserted++;
    }

    // Execute all inserts in a single transaction, batched
    await db.withTransactionAsync(async () => {
        // Insert workouts
        for (let i = 0; i < workoutValues.length; i += BATCH_SIZE) {
            const batch = workoutValues.slice(i, i + BATCH_SIZE);
            for (const row of batch) {
                await db.runAsync(
                    `INSERT INTO workouts (
                        id, name, status, started_at, completed_at, total_duration,
                        total_volume, total_sets, muscle_groups_worked, location,
                        note, template_id, day_of_week, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    row,
                );
            }
        }

        // Insert workout exercises
        for (let i = 0; i < exerciseValues.length; i += BATCH_SIZE) {
            const batch = exerciseValues.slice(i, i + BATCH_SIZE);
            for (const row of batch) {
                await db.runAsync(
                    `INSERT INTO workout_exercises (
                        id, workout_id, exercise_id, exercise_name, exercise_category,
                        exercise_muscle_groups, exercise_equipment, exercise_track_weight,
                        exercise_track_reps, exercise_track_time, order_index,
                        superset_group_id, note
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    row,
                );
            }
        }

        // Insert workout sets
        for (let i = 0; i < setValues.length; i += BATCH_SIZE) {
            const batch = setValues.slice(i, i + BATCH_SIZE);
            for (const row of batch) {
                await db.runAsync(
                    `INSERT INTO workout_sets (
                        id, workout_exercise_id, order_index, weight, reps,
                        duration, distance, type, status, rpe, rir,
                        suggested_weight, suggested_reps, note, completed_at, rest_duration
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    row,
                );
            }
        }

        // Insert measurements
        for (let i = 0; i < measurementValues.length; i += BATCH_SIZE) {
            const batch = measurementValues.slice(i, i + BATCH_SIZE);
            for (const row of batch) {
                await db.runAsync(
                    `INSERT INTO measurements (
                        id, measurement_type_id, value, recorded_at, note, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?)`,
                    row,
                );
            }
        }
    });

    console.log(`[CompetitorImport] Imported ${workoutsInserted} workouts, ${setsInserted} sets, ${exercisesCreated} new exercises, ${measurementsInserted} measurements`);

    return {
        workoutsInserted,
        setsInserted,
        exercisesCreated,
        measurementsInserted,
    };
}
