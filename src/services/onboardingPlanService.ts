import { SEED_EXERCISES } from '../data/exercises';
import { STARTER_PLANS, type StarterPlanDefinition, type StarterWorkoutDefinition } from '../data/starterPlans';
import type { OnboardingAnswers, OnboardingEquipment } from '../models/onboarding';

export interface OnboardingRecommendation {
    plan: StarterPlanDefinition;
    reason: string;
}

const EXERCISES = new Map(SEED_EXERCISES.map(exercise => [exercise.id, exercise]));
const PLANS = new Map(STARTER_PLANS.map(plan => [plan.id, plan]));
type PlanExercise = StarterWorkoutDefinition['exercises'][number];

/** Each inner list is an alternative setup; every item in that setup is required. */
const EQUIPMENT_OVERRIDES: Record<string, readonly (readonly string[])[]> = {
    'bench-press-barbell': [['barbell', 'bench', 'squat_rack']],
    'incline-bench-press-barbell': [['barbell', 'bench', 'squat_rack']],
    'close-grip-bench': [['barbell', 'bench', 'squat_rack']],
    'squat-barbell': [['barbell', 'squat_rack']],
    'front-squat': [['barbell', 'squat_rack']],
    'good-morning': [['barbell', 'squat_rack']],
    'overhead-press-barbell': [['barbell', 'squat_rack']],
    'goblet-squat': [['dumbbell'], ['kettlebell']],
    'lat-pulldown': [['cable'], ['machine']],
    'upright-row': [['barbell'], ['cable']],
    'calf-raise-standing': [['machine']],
    'russian-twist': [[]],
    't-bar-row': [['barbell', 'landmine_attachment']],
    'outdoor-cycling': [['bicycle']],
};

/** Do not infer alternatives from the legacy equipment array (bench + weight is AND). */
export function getOnboardingExerciseEquipment(exerciseId: string): readonly (readonly string[])[] | null {
    const exercise = EXERCISES.get(exerciseId);
    if (!exercise) return null;
    return EQUIPMENT_OVERRIDES[exerciseId] ?? [exercise.equipment.filter(item =>
        item !== 'none' && item !== 'bodyweight' && item !== 'yoga_mat',
    )];
}

export function canDoOnboardingExercise(exerciseId: string, equipment: readonly OnboardingEquipment[]): boolean {
    const alternatives = getOnboardingExerciseEquipment(exerciseId);
    const available = new Set<string>(equipment);
    return alternatives?.some(required => required.every(item => available.has(item))) ?? false;
}

// These are practical movement substitutions, not claims of equivalent strength gains.
const MOVEMENT_ALTERNATIVES: readonly (readonly string[])[] = [
    ['bench-press-barbell', 'bench-press-dumbbell', 'incline-bench-press-barbell', 'incline-bench-press-dumbbell', 'machine-chest-press', 'dumbbell-floor-press', 'push-up'],
    ['chest-fly-dumbbell', 'cable-crossover', 'pec-deck', 'dumbbell-floor-press', 'push-up'],
    ['overhead-press-barbell', 'overhead-press-dumbbell', 'machine-shoulder-press', 'pike-push-up'],
    ['bent-over-row-barbell', 'bent-over-row-dumbbell', 'seated-cable-row', 'chest-supported-row', 't-bar-row', 'resistance-band-row', 'kettlebell-row', 'prone-y-raise'],
    ['lat-pulldown', 'machine-lat-pulldown', 'pull-up', 'chin-up', 'bent-over-row-dumbbell', 'resistance-band-row', 'kettlebell-row', 'bent-over-row-barbell', 'prone-y-raise'],
    ['straight-arm-lat-pulldown', 'bent-over-row-dumbbell', 'resistance-band-row', 'kettlebell-row', 'prone-y-raise'],
    ['squat-barbell', 'front-squat', 'leg-press', 'hack-squat', 'goblet-squat', 'dumbbell-goblet-squat', 'kettlebell-goblet-squat', 'bodyweight-squat'],
    ['lunge-dumbbell', 'bulgarian-split-squat', 'reverse-lunge-bodyweight', 'bodyweight-squat'],
    ['leg-extension', 'dumbbell-goblet-squat', 'kettlebell-goblet-squat', 'bodyweight-squat'],
    ['deadlift-conventional', 'romanian-deadlift', 'good-morning', 'dumbbell-romanian-deadlift', 'kettlebell-deadlift', 'glute-bridge'],
    ['leg-curl-seated', 'leg-curl-lying', 'hamstring-walkout'],
    ['hip-thrust-barbell', 'glute-bridge'],
    ['calf-raise-standing', 'calf-raise-seated', 'leg-press-calf-raise', 'bodyweight-calf-raise'],
    ['face-pull', 'rear-delt-fly', 'prone-y-raise'],
    ['lateral-raise', 'cable-lateral-raise'],
    ['barbell-curl', 'dumbbell-curl', 'hammer-curl', 'cable-curl', 'incline-dumbbell-curl'],
    ['tricep-pushdown', 'overhead-tricep-extension', 'tricep-kickback', 'close-grip-bench', 'push-up'],
    ['hanging-leg-raise', 'cable-crunch', 'crunch'],
    ['treadmill-run', 'stationary-bike', 'rowing-machine', 'outdoor-run', 'brisk-walk'],
];

const OPTIONAL_ISOLATIONS = new Set(['lateral-raise', 'cable-lateral-raise', 'barbell-curl', 'dumbbell-curl', 'hammer-curl', 'cable-curl', 'incline-dumbbell-curl']);
const VERTICAL_PULLS = new Set(['lat-pulldown', 'machine-lat-pulldown', 'pull-up', 'chin-up', 'straight-arm-lat-pulldown']);
const LOADED_RESISTANCE = new Set<OnboardingEquipment>(['barbell', 'dumbbell', 'kettlebell', 'resistance_band', 'cable', 'machine']);

function catalog(id: string): StarterPlanDefinition {
    const plan = PLANS.get(id);
    if (!plan) throw new Error(`Starter plan not found: ${id}`);
    return plan;
}

function copyWorkout(workout: StarterWorkoutDefinition): StarterWorkoutDefinition {
    return { ...workout, exercises: workout.exercises.map(exercise => ({ ...exercise })) };
}

function cardioWorkout(equipment: readonly OnboardingEquipment[], easy = true): StarterWorkoutDefinition {
    const id = equipment.includes('stationary_bike') ? 'stationary-bike'
        : equipment.includes('treadmill') ? 'treadmill-run'
            : equipment.includes('rowing_machine') ? 'rowing-machine' : 'brisk-walk';
    return {
        name: easy ? 'Easy Cardio' : 'Steady Cardio',
        exercises: [{ id, sets: 1, note: easy
            ? 'Start with 10–20 minutes at an easy conversational pace. Walking is welcome; gradually add time as comfortable.'
            : 'Start with 15–30 minutes at a comfortable conversational pace. Build duration gradually before intensity.' }],
    };
}

function mobilityWorkout(index = 0): StarterWorkoutDefinition {
    const source = catalog('premade_mobility').workouts;
    const workout = copyWorkout(source[index % source.length]);
    workout.name = `Easy Mobility: ${workout.name}`;
    workout.exercises = workout.exercises.map(exercise => ({ ...exercise, sets: Math.min(exercise.sets, 2) }));
    return workout;
}

function bodyweightWorkout(index: number): StarterWorkoutDefinition {
    return {
        name: `Bodyweight Full Body ${['A', 'B', 'C'][index % 3]}`,
        exercises: [
            { id: index % 2 ? 'reverse-lunge-bodyweight' : 'bodyweight-squat', sets: 2, note: 'Start with 6–12 controlled reps; use a comfortable range and stop before form deteriorates.' },
            { id: 'glute-bridge', sets: 2, note: '8–15 controlled reps, without forcing the lower back.' },
            { id: 'hamstring-walkout', sets: 2, note: 'Start with a small heel walkout and 4–8 controlled reps. Shorten the range as needed.' },
            { id: 'push-up', sets: 2, note: '5–12 controlled reps. Use a wall or knees to make the movement manageable; leave a few reps in reserve.' },
            { id: 'prone-y-raise', sets: 2, note: '6–12 gentle controlled reps. This trains shoulder control; it does not replace loaded rows or pull-ups.' },
            { id: 'plank', sets: 2, note: 'Hold 10–30 seconds with comfortable breathing; use knees if needed.' },
        ],
    };
}

function adaptWorkout(workout: StarterWorkoutDefinition, answers: OnboardingAnswers, available: readonly OnboardingEquipment[]): StarterWorkoutDefinition {
    const result = copyWorkout(workout);
    const adapted: PlanExercise[] = [];
    for (const original of result.exercises) {
        if (!EXERCISES.has(original.id)) throw new Error(`Unknown starter exercise: ${original.id}`);
        let replacement = original.id;
        if (answers.trainingLocation !== 'gym' && !canDoOnboardingExercise(original.id, available)) {
            const choices = MOVEMENT_ALTERNATIVES.find(group => group.includes(original.id)) ?? [];
            replacement = choices.find(id => canDoOnboardingExercise(id, available)) ?? '';
            if (!replacement && OPTIONAL_ISOLATIONS.has(original.id)) continue;
            if (!replacement) throw new Error(`No equipment-compatible alternative for ${original.id}`);
        }
        const exercise = EXERCISES.get(replacement)!;
        let note = original.note;
        if (replacement !== original.id) {
            // Original equipment-specific instructions may be unsafe for a replacement.
            note = exercise.category === 'cardio'
                ? 'Start with 10–20 minutes at an easy conversational pace. Build duration gradually.'
                : 'Start with 6–12 controlled reps in a comfortable range; leave 2–3 reps in reserve.';
            if (replacement === 'prone-y-raise') note += ' Shoulder-control work only; not a substitute for loaded pulling.';
            else if (VERTICAL_PULLS.has(original.id) && !VERTICAL_PULLS.has(replacement)) note += ' Horizontal pulling replaces vertical pulling for your available equipment.';
            if (replacement === 'push-up') note += ' Use a wall or knees if needed.';
            if (replacement === 'pike-push-up') note += ' Start with a small range and stop if you cannot control the movement.';
            if (replacement === 'hamstring-walkout') note = 'Start with 4–8 slow walkouts from a glute bridge. Shorten the reach to make it manageable; stop before form deteriorates.';
        }
        if (homeEquipmentNeedsClarification(replacement)) note += replacement === 'overhead-press-dumbbell'
            ? ' Perform standing; no bench is needed.'
            : ' Use an unsupported hip hinge; no bench is needed.';
        const sets = answers.experienceLevel === 'beginner' && exercise.category === 'strength'
            ? Math.min(original.sets, 2) : original.sets;
        // Several machine exercises may resolve to the same home exercise; avoid multiplying its volume.
        const existing = adapted.find(item => item.id === replacement);
        if (existing) existing.sets = Math.max(existing.sets, sets);
        else adapted.push({ id: replacement, sets, note });
    }
    return { ...result, exercises: adapted };
}

function homeEquipmentNeedsClarification(exerciseId: string): boolean {
    return exerciseId === 'overhead-press-dumbbell' || exerciseId === 'bent-over-row-dumbbell';
}

const TRAINING_POSITIONS: Record<number, readonly number[]> = {
    1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 5],
    5: [0, 1, 3, 4, 5], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6],
};

/**
 * A conservative starting point, not a universally optimal program. Full-body and split
 * routines have similar outcomes when volume is matched (PMID 38595233). The ACSM 2026
 * position stand prioritizes consistency, progressive work and major muscle coverage;
 * a phase label alone does not justify changing a user's resistance-training split.
 * No persistence, settings changes, randomization or mutation of the shared catalog.
 */
export function getOnboardingRecommendation(answers: OnboardingAnswers): OnboardingRecommendation | null {
    const { experienceLevel, primaryGoal, trainingDaysPerWeek: days, trainingLocation, availableEquipment } = answers;
    if (!experienceLevel || experienceLevel === 'advanced' || !primaryGoal || !days || !trainingLocation
        || !Number.isInteger(days) || days < 1 || days > 7) return null;
    if (trainingLocation !== 'gym' && availableEquipment == null) return null;

    const equipment = availableEquipment ?? [];
    const home = trainingLocation !== 'gym';
    const noExternalResistance = home && !equipment.some(item => LOADED_RESISTANCE.has(item));
    // A bar alone provides no scalable assistance for someone just getting started.
    const bodyweightOnly = noExternalResistance && (!equipment.includes('pull_up_bar') || experienceLevel === 'beginner');
    let source = catalog('premade_full_body');
    if (home && equipment.includes('dumbbell') && !(equipment.includes('barbell') && equipment.includes('squat_rack'))) source = catalog('premade_home_dumbbell');
    else if (home && equipment.includes('pull_up_bar') && !equipment.some(item => LOADED_RESISTANCE.has(item))) source = catalog('premade_calisthenics');

    let name: string;
    let explanation: string;
    let workouts: StarterWorkoutDefinition[];
    const fullBody = (index: number) => bodyweightOnly ? bodyweightWorkout(index) : copyWorkout(source.workouts[index % source.workouts.length]);
    const extraDay = (index: number) => Math.floor(index / 2) % 2 ? mobilityWorkout(index) : cardioWorkout(equipment);

    if (answers.trainingPhase === 'recovery') {
        name = 'Easy Movement & Mobility';
        workouts = Array.from({ length: days }, (_, index) => index % 2 ? cardioWorkout(equipment) : mobilityWorkout(index));
        explanation = 'Your recovery phase gets easy movement and gentle mobility, with no hard lifting. Adjust or rest as needed; this is a general routine, not injury rehabilitation.';
    } else if (primaryGoal === 'endurance') {
        name = 'Endurance Foundation';
        workouts = Array.from({ length: days }, (_, index) => days === 7 && index === 6 ? mobilityWorkout() : cardioWorkout(equipment, experienceLevel === 'beginner' || index % 2 === 0));
        explanation = 'Cardio takes priority for endurance. Start at a conversational pace and build time gradually; a seven-day routine includes a gentle mobility day.';
    } else if (primaryGoal === 'fitness') {
        name = 'Strength & Cardio';
        if (days <= 2) {
            workouts = Array.from({ length: days }, (_, index) => {
                const workout = fullBody(index);
                workout.exercises.push(...cardioWorkout(equipment).exercises);
                return workout;
            });
        } else {
            workouts = Array.from({ length: days }, (_, index) => index % 2 === 0 && index < 5
                ? fullBody(index / 2) : index < 5 ? cardioWorkout(equipment) : mobilityWorkout(index));
            if (days === 3) workouts[1] = cardioWorkout(equipment);
        }
        explanation = 'Balanced full-body sessions and comfortable cardio support general fitness. Extra days stay easy instead of adding more hard lifting.';
    } else if (experienceLevel === 'beginner' || noExternalResistance || days <= 3) {
        name = bodyweightOnly ? 'Bodyweight Foundation' : source.name;
        workouts = days <= 3
            ? Array.from({ length: days }, (_, index) => fullBody(index))
            : days === 4
                ? [fullBody(0), cardioWorkout(equipment), fullBody(1), fullBody(2)]
                : Array.from({ length: days }, (_, index) => index % 2 === 0 && index < 5 ? fullBody(index / 2) : extraDay(index));
        explanation = `${Math.min(days, 3)} balanced full-body ${days === 1 ? 'session covers' : 'sessions cover'} upper and lower body. ${days > 3 ? 'Additional days are easy cardio or mobility so the plan does not become seven hard workouts.' : days === 1 ? 'One day is a useful start; add another strength day when it fits your week.' : 'Spacing the sessions gives you time to recover and practice the movements.'}`;
    } else {
        source = catalog(days === 4 ? 'premade_upper_lower' : days === 5 ? 'premade_bodybuilding'
            : primaryGoal === 'muscle' ? 'premade_arnold' : 'premade_ppl');
        name = source.name;
        workouts = Array.from({ length: Math.min(days, 6) }, (_, index) => copyWorkout(source.workouts[index % source.workouts.length]));
        if (days === 7) workouts.push(mobilityWorkout());
        explanation = days === 4 ? 'Upper/lower fits four days while keeping both upper and lower body twice each week.'
            : days === 5 ? 'Upper/lower plus push, pull and legs fits five days without dropping a leg session.'
                : `This ${primaryGoal === 'muscle' ? 'Arnold-style' : 'push/pull/legs'} routine distributes upper and lower body across six sessions.${days === 7 ? ' The seventh day is gentle mobility.' : ''} Start conservatively and reduce volume if recovery suffers.`;
    }

    workouts = workouts.map(workout => adaptWorkout(workout, answers, equipment));
    const limitedPulling = workouts.some(workout => workout.exercises.some(exercise => exercise.id === 'prone-y-raise'))
        && !workouts.some(workout => workout.exercises.some(exercise => /row|pull-up|chin-up|pulldown/.test(exercise.id) && exercise.id !== 'rowing-machine'));
    if (home) explanation += ' Every exercise fits the equipment you selected for home.';
    if (limitedPulling && answers.trainingPhase !== 'recovery') explanation += equipment.includes('pull_up_bar')
        ? ' Prone raises start shoulder-control practice; they do not replace pulling. Add controlled bar work when you can manage it, or use a resistance band to make pulling scalable.'
        : ' Pulling is limited without resistance equipment or a pull-up bar. Prone raises train shoulder control; they do not replace loaded rows or pull-ups.';
    if (answers.trainingPhase === 'cut') explanation += ' Cutting does not require extra hard days; keep recovery and manageable effort in mind.';

    const schedule: (number | null)[] = Array(7).fill(null);
    TRAINING_POSITIONS[days].forEach((position, index) => { schedule[position] = index; });
    const plan: StarterPlanDefinition = {
        id: `onboarding_${source.id}_${primaryGoal}_${days}`,
        name: `${name} · ${days} ${days === 1 ? 'day' : 'days'}`,
        description: `${explanation} Begin with a few minutes of easy movement and lighter practice sets before loaded exercises. Progress gradually while keeping the movements controlled.`,
        goals: answers.trainingPhase === 'recovery' ? ['mobility'] : [primaryGoal],
        workouts,
        schedule,
    };
    return { plan, reason: explanation };
}
