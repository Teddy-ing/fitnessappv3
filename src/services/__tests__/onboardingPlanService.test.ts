import { SEED_EXERCISES } from '../../data/exercises';
import { STARTER_PLANS } from '../../data/starterPlans';
import { createOnboardingProfile, ONBOARDING_EQUIPMENT, type OnboardingAnswers, type OnboardingEquipment } from '../../models/onboarding';
import { canDoOnboardingExercise, getOnboardingExerciseEquipment, getOnboardingRecommendation } from '../onboardingPlanService';

const exercises = new Map(SEED_EXERCISES.map(exercise => [exercise.id, exercise]));
const catalogBefore = JSON.stringify(STARTER_PLANS);
const seedsBefore = JSON.stringify(SEED_EXERCISES);

function answers(changes: Partial<OnboardingAnswers> = {}): OnboardingAnswers {
    return {
        ...createOnboardingProfile().answers,
        experienceLevel: 'beginner', primaryGoal: 'strength', trainingDaysPerWeek: 3,
        trainingLocation: 'gym', availableEquipment: null,
        ...changes,
    };
}

function ensure(condition: unknown, detail: string): asserts condition {
    if (!condition) throw new Error(detail);
}

function validateRecommendation(input: OnboardingAnswers) {
    const recommendation = getOnboardingRecommendation(input);
    const label = JSON.stringify(input);
    if (input.experienceLevel === 'advanced') {
        ensure(recommendation === null, `Advanced lifter received plan: ${label}`);
        return;
    }
    ensure(recommendation, `Missing recommendation: ${label}`);
    const { plan } = recommendation;
    ensure(plan.schedule.length === 7, `Not a seven-day schedule: ${label}`);
    ensure(plan.schedule.filter(index => index !== null).length === input.trainingDaysPerWeek, `Wrong frequency: ${label}`);
    ensure(plan.workouts.length === input.trainingDaysPerWeek, `Unscheduled or missing workouts: ${label}`);
    for (const index of plan.schedule) ensure(index === null || (Number.isInteger(index) && index >= 0 && index < plan.workouts.length), `Invalid workout index: ${label}`);
    for (const workout of plan.workouts) {
        ensure(workout.exercises.length > 0, `Empty workout: ${label}`);
        ensure(new Set(workout.exercises.map(exercise => exercise.id)).size === workout.exercises.length, `Duplicate substituted exercise: ${label}`);
        for (const exercise of workout.exercises) {
            ensure(exercises.has(exercise.id), `Unknown exercise ${exercise.id}: ${label}`);
            ensure(Number.isInteger(exercise.sets) && exercise.sets > 0, `Invalid sets: ${label}`);
            ensure(exercise.note.length > 0, `Missing exercise guidance: ${label}`);
            if (input.trainingLocation !== 'gym') ensure(canDoOnboardingExercise(exercise.id, input.availableEquipment ?? []), `Unavailable equipment for ${exercise.id}: ${label}`);
        }
    }
    if (input.trainingPhase !== 'recovery' && ['strength', 'muscle', 'fitness'].includes(input.primaryGoal!)) {
        const trained = new Set(plan.workouts.flatMap(workout => workout.exercises.flatMap(item =>
            exercises.get(item.id)!.muscleGroups.map(group => group.muscle),
        )));
        ensure(trained.has('quads') && trained.has('hamstrings') && trained.has('glutes'), `Lower body dropped: ${label}`);
        ensure(trained.has('chest') && trained.has('back'), `Upper body dropped: ${label}`);
    }
    if (input.experienceLevel === 'beginner') {
        const hardDays = plan.workouts.filter(workout => !workout.name.startsWith('Easy')
            && workout.exercises.some(exercise => exercises.get(exercise.id)?.category === 'strength'));
        ensure(hardDays.length <= 3, `Too many beginner lifting days: ${label}`);
        for (const workout of hardDays) for (const exercise of workout.exercises) {
            if (exercises.get(exercise.id)?.category === 'strength') ensure(exercise.sets <= 2, `Excessive beginner starting sets: ${label}`);
        }
    }
}

describe('onboarding recommendation decisions', () => {
    it.each(['experienceLevel', 'primaryGoal', 'trainingDaysPerWeek', 'trainingLocation'] as const)('requires %s before selecting a plan', field => {
        expect(getOnboardingRecommendation(answers({ [field]: null }))).toBeNull();
    });

    it('distinguishes unanswered home equipment from an explicit bodyweight-only answer', () => {
        for (const trainingLocation of ['home', 'both'] as const) {
            expect(getOnboardingRecommendation(answers({ trainingLocation, availableEquipment: null }))).toBeNull();
            expect(getOnboardingRecommendation(answers({ trainingLocation, availableEquipment: [] }))).not.toBeNull();
        }
    });

    it.each([0, 8, -1, 2.5, NaN])('rejects invalid frequency %s', trainingDaysPerWeek => {
        expect(getOnboardingRecommendation(answers({ trainingDaysPerWeek }))).toBeNull();
    });

    it.each([1, 2, 3, 4, 5, 6, 7])('leaves experienced lifters unassigned at %i days', trainingDaysPerWeek => {
        expect(getOnboardingRecommendation(answers({ experienceLevel: 'advanced', trainingDaysPerWeek }))).toBeNull();
    });

    it('selects balanced intermediate patterns instead of truncating PPL and dropping legs', () => {
        const choose = (days: number, primaryGoal: 'strength' | 'muscle' = 'strength') => getOnboardingRecommendation(answers({ experienceLevel: 'intermediate', trainingDaysPerWeek: days, primaryGoal }))!.plan;
        expect(choose(1).name).toContain('Full Body');
        expect(choose(3).name).toContain('Full Body');
        expect(choose(4).workouts.map(workout => workout.name)).toEqual(['Upper A', 'Lower A', 'Upper B', 'Lower B']);
        expect(choose(5).workouts.map(workout => workout.name)).toEqual(['Upper Body', 'Lower Body', 'Push', 'Pull', 'Legs']);
        expect(choose(6).name).toContain('Push Pull Legs');
        expect(choose(6, 'muscle').name).toContain('Arnold');
        expect(choose(7).workouts[6].name).toContain('Easy Mobility');
    });

    it('spaces beginner strength days and uses easier activity for extra days', () => {
        for (const days of [4, 5, 6, 7]) {
            const { plan } = getOnboardingRecommendation(answers({ trainingDaysPerWeek: days }))!;
            const liftingPositions = plan.schedule.flatMap((index, position) => index !== null && !plan.workouts[index].name.startsWith('Easy') ? [position] : []);
            expect(liftingPositions).toHaveLength(3);
            for (let i = 1; i < liftingPositions.length; i++) expect(liftingPositions[i] - liftingPositions[i - 1]).toBeGreaterThan(1);
        }
    });

    it('includes cardio at every general-fitness frequency, including one-day combined sessions', () => {
        for (const days of [1, 2, 3, 4, 5, 6, 7]) {
            const { plan } = getOnboardingRecommendation(answers({ primaryGoal: 'fitness', trainingDaysPerWeek: days }))!;
            const categories = plan.workouts.flatMap(workout => workout.exercises.map(exercise => exercises.get(exercise.id)!.category));
            expect(categories).toContain('cardio');
            expect(categories).toContain('strength');
        }
    });

    it('prioritizes cardio for endurance without inserting a heavy lifting split', () => {
        for (const days of [1, 2, 3, 4, 5, 6, 7]) {
            const { plan } = getOnboardingRecommendation(answers({ primaryGoal: 'endurance', trainingDaysPerWeek: days }))!;
            expect(plan.workouts.filter(workout => workout.exercises.some(exercise => exercises.get(exercise.id)!.category === 'cardio'))).toHaveLength(Math.min(days, 6));
            expect(plan.workouts.flatMap(workout => workout.exercises).some(exercise => getOnboardingExerciseEquipment(exercise.id)!.flat().includes('barbell'))).toBe(false);
        }
    });

    it('makes recovery days gentle for all goals instead of prescribing harder cut/bulk routines', () => {
        for (const primaryGoal of ['strength', 'muscle', 'fitness', 'endurance'] as const) {
            const { plan, reason } = getOnboardingRecommendation(answers({ primaryGoal, trainingPhase: 'recovery', trainingDaysPerWeek: 7 }))!;
            expect(reason).toContain('not injury rehabilitation');
            expect(plan.workouts.every(workout => workout.name.startsWith('Easy'))).toBe(true);
            expect(plan.workouts.flatMap(workout => workout.exercises).every(exercise => exercise.sets <= 2)).toBe(true);
            expect(plan.workouts.flatMap(workout => workout.exercises).every(exercise => canDoOnboardingExercise(exercise.id, []))).toBe(true);
        }
        const routine = (trainingPhase: 'bulk' | 'cut' | 'maintain') => getOnboardingRecommendation(answers({ trainingPhase }))!.plan.workouts;
        expect(routine('bulk')).toEqual(routine('maintain'));
        expect(routine('cut')).toEqual(routine('maintain'));
    });
});

describe('home equipment and catalog safety', () => {
    it('requires all supporting equipment for barbell bench and squat', () => {
        expect(canDoOnboardingExercise('bench-press-barbell', ['barbell'])).toBe(false);
        expect(canDoOnboardingExercise('bench-press-barbell', ['barbell', 'bench'])).toBe(false);
        expect(canDoOnboardingExercise('bench-press-barbell', ['barbell', 'bench', 'squat_rack'])).toBe(true);
        expect(canDoOnboardingExercise('bench-press-dumbbell', ['dumbbell'])).toBe(false);
        expect(canDoOnboardingExercise('bench-press-dumbbell', ['dumbbell', 'bench'])).toBe(true);
        expect(canDoOnboardingExercise('squat-barbell', ['barbell'])).toBe(false);
        expect(canDoOnboardingExercise('squat-barbell', ['barbell', 'squat_rack'])).toBe(true);
        expect(canDoOnboardingExercise('pull-up', [])).toBe(false);
        expect(canDoOnboardingExercise('pull-up', ['pull_up_bar'])).toBe(true);
        expect(canDoOnboardingExercise('goblet-squat', ['dumbbell'])).toBe(true);
        expect(canDoOnboardingExercise('goblet-squat', ['kettlebell'])).toBe(true);
        expect(canDoOnboardingExercise('outdoor-cycling', [])).toBe(false);
        expect(canDoOnboardingExercise('does-not-exist', [...ONBOARDING_EQUIPMENT])).toBe(false);
    });

    it('uses dumbbells without silently requiring a bench or a rack', () => {
        const { plan } = getOnboardingRecommendation(answers({ trainingLocation: 'home', availableEquipment: ['dumbbell'] }))!;
        expect(plan.name).toContain('Dumbbell');
        const ids = plan.workouts.flatMap(workout => workout.exercises.map(exercise => exercise.id));
        expect(ids).toContain('dumbbell-floor-press');
        expect(ids).toContain('dumbbell-romanian-deadlift');
        expect(ids).not.toContain('bench-press-dumbbell');
    });

    it('uses available bands and kettlebells for actual pulling instead of claiming prone raises are equivalent', () => {
        for (const [equipment, row] of [['resistance_band', 'resistance-band-row'], ['kettlebell', 'kettlebell-row']] as const) {
            const { plan } = getOnboardingRecommendation(answers({ trainingLocation: 'home', availableEquipment: [equipment] }))!;
            expect(plan.workouts.flatMap(workout => workout.exercises.map(exercise => exercise.id))).toContain(row);
        }
    });

    it('provides a genuine no-equipment routine and explains its pulling limitation', () => {
        const { plan, reason } = getOnboardingRecommendation(answers({ trainingLocation: 'home', availableEquipment: [], trainingDaysPerWeek: 7 }))!;
        expect(reason).toContain('do not replace loaded rows or pull-ups');
        expect(plan.workouts.every(workout => workout.exercises.every(exercise => canDoOnboardingExercise(exercise.id, [])))).toBe(true);
        expect(plan.workouts.some(workout => workout.exercises.some(exercise => exercise.id === 'pull-up'))).toBe(false);
    });

    it('does not require gym-only equipment when the user trains both at home and the gym', () => {
        for (const primaryGoal of ['strength', 'muscle', 'fitness', 'endurance'] as const) validateRecommendation(answers({
            primaryGoal, experienceLevel: 'intermediate', trainingDaysPerWeek: 6,
            trainingLocation: 'both', availableEquipment: ['barbell'],
        }));
    });

    it('covers the experience, goal, phase, frequency and equipment matrix', () => {
        const equipmentCases: OnboardingEquipment[][] = [[], ...ONBOARDING_EQUIPMENT.map(item => [item]), ['dumbbell', 'bench'], ['barbell', 'bench'], ['barbell', 'squat_rack'], [...ONBOARDING_EQUIPMENT]];
        for (const experienceLevel of ['beginner', 'intermediate', 'advanced'] as const)
            for (const primaryGoal of ['strength', 'muscle', 'fitness', 'endurance'] as const)
                for (const trainingPhase of [null, 'bulk', 'cut', 'maintain', 'recovery', 'unsure'] as const)
                    for (const trainingDaysPerWeek of [1, 2, 3, 4, 5, 6, 7]) {
                        validateRecommendation(answers({ experienceLevel, primaryGoal, trainingPhase, trainingDaysPerWeek }));
                        for (const trainingLocation of ['home', 'both'] as const) for (const availableEquipment of equipmentCases)
                            validateRecommendation(answers({ experienceLevel, primaryGoal, trainingPhase, trainingDaysPerWeek, trainingLocation, availableEquipment }));
                    }
    });

    it('keeps every combination of the equipment checklist feasible for the two most complex split patterns', () => {
        for (let mask = 0; mask < 2 ** ONBOARDING_EQUIPMENT.length; mask++) {
            const availableEquipment = ONBOARDING_EQUIPMENT.filter((_, index) => (mask & (1 << index)) !== 0);
            for (const primaryGoal of ['strength', 'muscle'] as const) validateRecommendation(answers({
                experienceLevel: 'intermediate', primaryGoal, trainingDaysPerWeek: 6,
                trainingLocation: 'home', availableEquipment,
            }));
        }
    });

    it('never mutates shared plans or exercise data and returns independent editable copies', () => {
        const first = getOnboardingRecommendation(answers())!;
        first.plan.workouts[0].exercises[0].sets = 999;
        first.plan.schedule[0] = null;
        const second = getOnboardingRecommendation(answers())!;
        expect(second.plan.workouts[0].exercises[0].sets).toBe(2);
        expect(second.plan.schedule[0]).toBe(0);
        expect(JSON.stringify(STARTER_PLANS)).toBe(catalogBefore);
        expect(JSON.stringify(SEED_EXERCISES)).toBe(seedsBefore);
    });
});
