/** Built-in program seeding and conservative upgrades of untouched shipped templates. */
import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from './database';
import { withWriteLock } from '../utils/dbMutex';
import { SEED_EXERCISES } from '../data/exercises';
import { STARTER_PLANS, type StarterPlanDefinition, type StarterWorkoutDefinition } from '../data/starterPlans';

// Immutable comparison snapshots of the original two shipped plans. These are
// used only to recognize unedited legacy data; the active catalog is STARTER_PLANS.
const LEGACY_SPLITS = [
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

interface TemplateRow {
    id: string;
    name: string;
    description: string | null;
}
interface SplitRow {
    id: string;
    name: string;
    description: string | null;
    is_built_in: number;
}
interface ScheduleRow {
    order_index: number;
    item_type: string;
    template_id: string | null;
}
interface ExerciseRow {
    exercise_id: string;
    exercise_name: string;
    exercise_category: string;
    exercise_muscle_groups: string;
    exercise_equipment: string;
    exercise_track_weight: number;
    exercise_track_reps: number;
    exercise_track_time: number;
    order_index: number;
    default_sets: number;
    note: string | null;
    superset_group_id: string | null;
}

function validatePlan(plan: StarterPlanDefinition): void {
    if (!plan.id || !plan.name || plan.workouts.length === 0 || plan.schedule.length !== 7
        || !plan.schedule.some(index => index !== null)
        || plan.schedule.some(index => index !== null && (!Number.isInteger(index) || index < 0 || index >= plan.workouts.length))) {
        throw new Error(`Invalid starter plan schedule: ${plan.id}`);
    }
    for (const workout of plan.workouts) {
        if (!workout.name || workout.exercises.length === 0) throw new Error(`Empty starter workout: ${plan.id}`);
        for (const exercise of workout.exercises) {
            if (!SEED_EXERCISES.some(item => item.id === exercise.id)) throw new Error(`Unknown starter exercise: ${exercise.id}`);
            if (!Number.isInteger(exercise.sets) || exercise.sets < 1 || typeof exercise.note !== 'string') {
                throw new Error(`Invalid starter exercise prescription: ${exercise.id}`);
            }
        }
    }
}

async function insertExercises(db: SQLiteDatabase, templateId: string, workout: StarterWorkoutDefinition): Promise<void> {
    for (let index = 0; index < workout.exercises.length; index++) {
        const prescription = workout.exercises[index];
        const exercise = SEED_EXERCISES.find(item => item.id === prescription.id);
        if (!exercise) throw new Error(`Unknown starter exercise: ${prescription.id}`);
        await db.runAsync(
            `INSERT INTO template_exercises (
                id, template_id, exercise_id, exercise_name, exercise_category,
                exercise_muscle_groups, exercise_equipment, exercise_track_weight,
                exercise_track_reps, exercise_track_time, order_index, default_sets, note
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [Crypto.randomUUID(), templateId, exercise.id, exercise.name, exercise.category,
                JSON.stringify(exercise.muscleGroups), JSON.stringify(exercise.equipment),
                exercise.trackWeight ? 1 : 0, exercise.trackReps ? 1 : 0, exercise.trackTime ? 1 : 0,
                index, prescription.sets, prescription.note],
        );
    }
}

async function insertTemplate(db: SQLiteDatabase, plan: StarterPlanDefinition, index: number, now: string): Promise<void> {
    const templateId = `${plan.id}_template_${index}`;
    await db.runAsync(
        'INSERT INTO templates (id, name, description, last_used_at, use_count, created_at, updated_at) VALUES (?, ?, ?, NULL, 0, ?, ?)',
        [templateId, plan.workouts[index].name, `Part of ${plan.name}. ${plan.description}`, now, now],
    );
    await insertExercises(db, templateId, plan.workouts[index]);
}

async function writeSchedule(db: SQLiteDatabase, plan: StarterPlanDefinition): Promise<void> {
    await db.runAsync('DELETE FROM splits_schedule WHERE split_id = ?', [plan.id]);
    await db.runAsync('DELETE FROM splits_templates WHERE split_id = ?', [plan.id]);
    let workoutIndex = 0;
    for (let day = 0; day < plan.schedule.length; day++) {
        const index = plan.schedule[day];
        const templateId = index === null ? null : `${plan.id}_template_${index}`;
        await db.runAsync(
            'INSERT INTO splits_schedule (id, split_id, order_index, item_type, template_id) VALUES (?, ?, ?, ?, ?)',
            [Crypto.randomUUID(), plan.id, day, index === null ? 'rest' : 'template', templateId],
        );
        if (templateId !== null) {
            await db.runAsync(
                'INSERT INTO splits_templates (id, split_id, template_id, order_index) VALUES (?, ?, ?, ?)',
                [Crypto.randomUUID(), plan.id, templateId, workoutIndex++],
            );
        }
    }
}

/** Caller owns the write lock and transaction. Any identity collision throws. */
export async function insertStarterPlanInTransaction(db: SQLiteDatabase, plan: StarterPlanDefinition, isBuiltIn: boolean): Promise<void> {
    validatePlan(plan);
    const now = new Date().toISOString();
    await db.runAsync(
        'INSERT INTO splits (id, name, description, is_built_in, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [plan.id, plan.name, plan.description, isBuiltIn ? 1 : 0, now, now],
    );
    for (let index = 0; index < plan.workouts.length; index++) {
        await insertTemplate(db, plan, index, now);
    }
    await writeSchedule(db, plan);
}

function isLegacyExercise(row: ExerciseRow, expected: { id: string; sets: number; index: number }): boolean {
    const exercise = SEED_EXERCISES.find(item => item.id === expected.id);
    if (!exercise) return false;
    return row.exercise_id === expected.id && row.default_sets === expected.sets && row.order_index === expected.index
        && row.note === null && row.superset_group_id === null
        && row.exercise_name === exercise.name && row.exercise_category === exercise.category
        && row.exercise_muscle_groups === JSON.stringify(exercise.muscleGroups)
        && row.exercise_equipment === JSON.stringify(exercise.equipment)
        && row.exercise_track_weight === (exercise.trackWeight ? 1 : 0)
        && row.exercise_track_reps === (exercise.trackReps ? 1 : 0)
        && row.exercise_track_time === (exercise.trackTime ? 1 : 0);
}

async function upgradeLegacyPlan(db: SQLiteDatabase, plan: StarterPlanDefinition, split: SplitRow): Promise<void> {
    const legacy = LEGACY_SPLITS.find(item => item.id === plan.id);
    if (!legacy || split.is_built_in !== 1) return;
    const now = new Date().toISOString();
    for (let index = 0; index < legacy.templates.length; index++) {
        const templateId = `${plan.id}_template_${index}`;
        const template = await db.getFirstAsync<TemplateRow>('SELECT id, name, description FROM templates WHERE id = ?', [templateId]);
        const original = legacy.templates[index];
        if (!template || template.name !== original.name || template.description !== `Part of ${legacy.name}`) continue;
        const rows = await db.getAllAsync<ExerciseRow>('SELECT * FROM template_exercises WHERE template_id = ? ORDER BY order_index', [templateId]);
        // The original seeder skipped unknown IDs (notably "leg-curl") without
        // renumbering the following rows. Match that exact shipped shape.
        const expected = original.exercises.map((exercise, position) => ({ ...exercise, index: position }))
            .filter(exercise => SEED_EXERCISES.some(item => item.id === exercise.id));
        if (rows.length !== expected.length || !rows.every((row, position) => isLegacyExercise(row, expected[position]))) continue;
        await db.runAsync('UPDATE templates SET name = ?, description = ?, updated_at = ? WHERE id = ?',
            [plan.workouts[index].name, `Part of ${plan.name}. ${plan.description}`, now, templateId]);
        await db.runAsync('DELETE FROM template_exercises WHERE template_id = ?', [templateId]);
        await insertExercises(db, templateId, plan.workouts[index]);
    }
    const schedule = await db.getAllAsync<ScheduleRow>('SELECT order_index, item_type, template_id FROM splits_schedule WHERE split_id = ? ORDER BY order_index', [plan.id]);
    const untouchedSchedule = schedule.length === legacy.templates.length && schedule.every((item, index) =>
        item.order_index === index && item.item_type === 'template' && item.template_id === `${plan.id}_template_${index}`);
    if (split.name !== legacy.name || split.description !== legacy.description || !untouchedSchedule) return;

    const settings = await db.getFirstAsync<{ active_split_id: string | null; current_template_index: number }>(
        'SELECT active_split_id, current_template_index FROM user_settings WHERE id = 1');
    await db.runAsync('UPDATE splits SET name = ?, description = ?, updated_at = ? WHERE id = ?', [plan.name, plan.description, now, plan.id]);
    await writeSchedule(db, plan);
    if (settings?.active_split_id === plan.id) {
        const nextTemplate = schedule[settings.current_template_index]?.template_id;
        const mappedIndex = plan.schedule.findIndex(index => index !== null && `${plan.id}_template_${index}` === nextTemplate);
        await db.runAsync('UPDATE user_settings SET current_template_index = ? WHERE id = 1', [Math.max(0, mappedIndex)]);
    }
}

/** Caller owns the write lock and transaction; existing custom content stays intact. */
export async function seedStarterPlansInTransaction(db: SQLiteDatabase): Promise<void> {
    // Validate the entire catalog before any writes; a bad entry must not be silently skipped.
    STARTER_PLANS.forEach(validatePlan);
    for (const plan of STARTER_PLANS) {
        const existing = await db.getFirstAsync<SplitRow>('SELECT id, name, description, is_built_in FROM splits WHERE id = ?', [plan.id]);
        if (existing) {
            await upgradeLegacyPlan(db, plan, existing);
            continue;
        }
        // Old imports may retain a template without its split. Reuse its identity
        // and content when rebuilding the missing split instead of overwriting it.
        const now = new Date().toISOString();
        await db.runAsync('INSERT INTO splits (id, name, description, is_built_in, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)',
            [plan.id, plan.name, plan.description, now, now]);
        for (let index = 0; index < plan.workouts.length; index++) {
            const template = await db.getFirstAsync<{ id: string }>('SELECT id FROM templates WHERE id = ?', [`${plan.id}_template_${index}`]);
            if (!template) await insertTemplate(db, plan, index, now);
        }
        await writeSchedule(db, plan);
    }
}

/** Incremental, idempotent seeding serialized with onboarding, restores and other writes. */
export async function seedPremadeSplits(): Promise<void> {
    return withWriteLock(async () => {
        const db = await getDatabase();
        if (!db) throw new Error('Database not available');
        await db.withTransactionAsync(() => seedStarterPlansInTransaction(db));
    });
}

export default { seedPremadeSplits };