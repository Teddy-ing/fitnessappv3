/**
 * Premade Splits Seeding
 * 
 * Seeds the database with premade splits (Arnold, PPL) that come with the app.
 * These are marked as isBuiltIn = true and shown with a "Pre-made" tag.
 */

import * as Crypto from 'expo-crypto';
import { getDatabase } from './database';
import { SEED_EXERCISES } from '../data/exercises';

/**
 * Premade split definitions with their template exercises
 */
const PREMADE_SPLITS = [
    {
        id: 'premade_ppl',
        name: 'Push Pull Legs',
        description: 'Classic 3-day split targeting push, pull, and leg movements',
        templates: [
            {
                name: 'Push Day',
                exercises: [
                    { id: 'bench-press-barbell', sets: 4 },
                    { id: 'incline-bench-press-dumbbell', sets: 3 },
                    { id: 'overhead-press-dumbbell', sets: 3 },
                    { id: 'lateral-raise', sets: 3 },
                    { id: 'tricep-pushdown', sets: 3 },
                    { id: 'overhead-tricep-extension', sets: 3 },
                ],
            },
            {
                name: 'Pull Day',
                exercises: [
                    { id: 'deadlift-conventional', sets: 3 },
                    { id: 'lat-pulldown', sets: 4 },
                    { id: 'bent-over-row-barbell', sets: 3 },
                    { id: 'seated-cable-row', sets: 3 },
                    { id: 'face-pull', sets: 3 },
                    { id: 'barbell-curl', sets: 3 },
                    { id: 'hammer-curl', sets: 3 },
                ],
            },
            {
                name: 'Leg Day',
                exercises: [
                    { id: 'squat-barbell', sets: 4 },
                    { id: 'romanian-deadlift', sets: 3 },
                    { id: 'leg-press', sets: 3 },
                    { id: 'leg-curl', sets: 3 },
                    { id: 'leg-extension', sets: 3 },
                    { id: 'calf-raise-standing', sets: 4 },
                ],
            },
        ],
    },
    {
        id: 'premade_arnold',
        name: 'Arnold Split',
        description: 'Arnold Schwarzenegger\'s classic 6-day double split routine',
        templates: [
            {
                name: 'Chest & Back',
                exercises: [
                    { id: 'bench-press-barbell', sets: 4 },
                    { id: 'incline-bench-press-dumbbell', sets: 3 },
                    { id: 'chest-fly-dumbbell', sets: 3 },
                    { id: 'pull-up', sets: 4 },
                    { id: 'bent-over-row-barbell', sets: 4 },
                    { id: 'seated-cable-row', sets: 3 },
                    { id: 'deadlift-conventional', sets: 3 },
                ],
            },
            {
                name: 'Shoulders & Arms',
                exercises: [
                    { id: 'overhead-press-barbell', sets: 4 },
                    { id: 'lateral-raise', sets: 4 },
                    { id: 'rear-delt-fly', sets: 3 },
                    { id: 'barbell-curl', sets: 3 },
                    { id: 'dumbbell-curl', sets: 3 },
                    { id: 'close-grip-bench', sets: 3 },
                    { id: 'tricep-pushdown', sets: 3 },
                ],
            },
            {
                name: 'Legs',
                exercises: [
                    { id: 'squat-barbell', sets: 5 },
                    { id: 'leg-press', sets: 4 },
                    { id: 'leg-extension', sets: 3 },
                    { id: 'leg-curl', sets: 4 },
                    { id: 'lunge-dumbbell', sets: 3 },
                    { id: 'calf-raise-standing', sets: 5 },
                ],
            },
        ],
    },
];

/**
 * Get exercise data by ID from seed exercises
 */
function getExerciseById(id: string) {
    return SEED_EXERCISES.find(ex => ex.id === id);
}

/**
 * Check if premade splits have already been seeded
 */
async function arePremadeSplitsSeeded(): Promise<boolean> {
    const db = await getDatabase();
    if (!db) return true; // Assume seeded if no db

    const result = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM splits WHERE id LIKE 'premade_%'`
    );

    return (result?.count ?? 0) > 0;
}

/**
 * Seed premade splits with templates to the database
 */
export async function seedPremadeSplits(): Promise<void> {
    const db = await getDatabase();
    if (!db) {
        console.log('[Seed] Database not available - skipping premade splits');
        return;
    }

    // Check if already seeded
    if (await arePremadeSplitsSeeded()) {
        console.log('[Seed] Premade splits already exist - skipping');
        return;
    }

    console.log('[Seed] Seeding premade splits...');
    const now = new Date().toISOString();

    for (const splitDef of PREMADE_SPLITS) {
        await db.withTransactionAsync(async () => {
            const templateIds: string[] = [];

            // Create templates for this split
            for (let tIdx = 0; tIdx < splitDef.templates.length; tIdx++) {
                const templateDef = splitDef.templates[tIdx];
                const templateId = `${splitDef.id}_template_${tIdx}`;
                templateIds.push(templateId);

                // Insert template
                await db.runAsync(
                    `INSERT INTO templates (id, name, description, last_used_at, use_count, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [templateId, templateDef.name, `Part of ${splitDef.name}`, null, 0, now, now]
                );

                // Insert template exercises
                for (let eIdx = 0; eIdx < templateDef.exercises.length; eIdx++) {
                    const exDef = templateDef.exercises[eIdx];
                    const exercise = getExerciseById(exDef.id);

                    if (!exercise) {
                        console.warn(`[Seed] Exercise not found: ${exDef.id}`);
                        continue;
                    }

                    const exerciseRowId = Crypto.randomUUID();
                    await db.runAsync(
                        `INSERT INTO template_exercises (
                            id, template_id, exercise_id, exercise_name, exercise_category,
                            exercise_muscle_groups, exercise_equipment, exercise_track_weight,
                            exercise_track_reps, exercise_track_time, order_index, default_sets, note
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            exerciseRowId,
                            templateId,
                            exercise.id,
                            exercise.name,
                            exercise.category,
                            JSON.stringify(exercise.muscleGroups),
                            JSON.stringify(exercise.equipment),
                            exercise.trackWeight ? 1 : 0,
                            exercise.trackReps ? 1 : 0,
                            exercise.trackTime ? 1 : 0,
                            eIdx,
                            exDef.sets,
                            null,
                        ]
                    );
                }
            }

            // Create the split
            await db.runAsync(
                `INSERT INTO splits (id, name, description, is_built_in, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [splitDef.id, splitDef.name, splitDef.description, 1, now, now]
            );

            // Insert schedule items (templates only, no rest days for premade)
            for (let i = 0; i < templateIds.length; i++) {
                const itemId = Crypto.randomUUID();
                await db.runAsync(
                    `INSERT INTO splits_schedule (id, split_id, order_index, item_type, template_id)
                     VALUES (?, ?, ?, ?, ?)`,
                    [itemId, splitDef.id, i, 'template', templateIds[i]]
                );

                // Also insert into legacy table
                const linkId = Crypto.randomUUID();
                await db.runAsync(
                    `INSERT INTO splits_templates (id, split_id, template_id, order_index)
                     VALUES (?, ?, ?, ?)`,
                    [linkId, splitDef.id, templateIds[i], i]
                );
            }
        });

        console.log(`[Seed] Created premade split: ${splitDef.name}`);
    }

    console.log('[Seed] Premade splits seeding complete!');
}

export default {
    seedPremadeSplits,
};
