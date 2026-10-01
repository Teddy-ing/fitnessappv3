/** Equipment explicitly available at home; bodyweight needs no equipment. */
export const ONBOARDING_EQUIPMENT = [
    'dumbbell', 'barbell', 'bench', 'squat_rack', 'pull_up_bar', 'resistance_band',
    'kettlebell', 'cable', 'machine', 'treadmill', 'stationary_bike', 'rowing_machine',
] as const;
export type OnboardingEquipment = typeof ONBOARDING_EQUIPMENT[number];

/** Optional answers used to set preferences and choose an initial training plan. */
export interface OnboardingAnswers {
    weightUnit: 'lbs' | 'kg' | null;
    distanceUnit: 'mi' | 'km' | null;
    measurementUnit: 'in' | 'cm' | null;
    experienceLevel: 'beginner' | 'intermediate' | 'advanced' | null;
    trainingPhase: 'bulk' | 'cut' | 'maintain' | 'recovery' | 'unsure' | null;
    primaryGoal: 'strength' | 'muscle' | 'fitness' | 'endurance' | null;
    trainingDaysPerWeek: number | null;
    trainingLocation: 'gym' | 'home' | 'both' | null;
    availableEquipment: OnboardingEquipment[] | null;
}

export interface OnboardingProfile {
    version: 2;
    status: 'in_progress' | 'skipped' | 'completed';
    /** Welcome, units, experience, phase, goal, routine, review. */
    step: number;
    answers: OnboardingAnswers;
    completedAt: string | null;
    /** Null uses the experience default: beginner on, intermediate off. */
    useRecommendedPlan: boolean | null;
    /** Written atomically with preferences and the initial plan; prevents repeat application. */
    appliedAt: string | null;
    appliedSplitId: string | null;
}

export function createOnboardingProfile(): OnboardingProfile {
    return {
        version: 2,
        status: 'in_progress',
        step: 0,
        answers: {
            weightUnit: null,
            distanceUnit: null,
            measurementUnit: null,
            experienceLevel: null,
            trainingPhase: null,
            primaryGoal: null,
            trainingDaysPerWeek: null,
            trainingLocation: null,
            availableEquipment: null,
        },
        completedAt: null,
        useRecommendedPlan: null,
        appliedAt: null,
        appliedSplitId: null,
    };
}

export function createSkippedOnboardingProfile(): OnboardingProfile {
    return { ...createOnboardingProfile(), status: 'skipped' };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isChoice<T extends string>(value: unknown, options: readonly T[]): value is T | null {
    return value === null || (typeof value === 'string' && options.includes(value as T));
}

/** Reject malformed/unsupported persisted data instead of trusting a JSON type assertion. */
export function parseOnboardingProfile(raw: unknown): OnboardingProfile | null {
    let value: unknown = raw;
    if (typeof raw === 'string') {
        try {
            value = JSON.parse(raw);
        } catch {
            return null;
        }
    }
    if (!isRecord(value) || ![1, 2].includes(value.version as number) || !isRecord(value.answers)) return null;
    if (!['in_progress', 'skipped', 'completed'].includes(value.status as string)) return null;
    if (typeof value.step !== 'number' || !Number.isInteger(value.step) || value.step < 0 || value.step > 6) return null;
    if (value.completedAt !== null && (typeof value.completedAt !== 'string' || !Number.isFinite(Date.parse(value.completedAt)))) return null;
    if (value.status === 'completed' && value.completedAt === null) return null;

    const legacy = value.version === 1;
    const availableEquipment = legacy ? null : value.answers.availableEquipment;
    if (availableEquipment !== null && (!Array.isArray(availableEquipment)
        || !availableEquipment.every(item => ONBOARDING_EQUIPMENT.includes(item as OnboardingEquipment)))) return null;
    const useRecommendedPlan = legacy ? null : value.useRecommendedPlan;
    if (useRecommendedPlan !== null && typeof useRecommendedPlan !== 'boolean') return null;
    const appliedAt = legacy ? null : value.appliedAt;
    if (appliedAt !== null && (typeof appliedAt !== 'string' || !Number.isFinite(Date.parse(appliedAt)))) return null;
    const appliedSplitId = legacy ? null : value.appliedSplitId;
    if (appliedSplitId !== null && (typeof appliedSplitId !== 'string' || appliedSplitId.length === 0)) return null;
    if (value.status !== 'completed' && (appliedAt !== null || appliedSplitId !== null)) return null;
    if (appliedSplitId !== null && appliedAt === null) return null;

    const answers = value.answers;
    if (!isChoice(answers.weightUnit, ['lbs', 'kg'])) return null;
    if (!isChoice(answers.distanceUnit, ['mi', 'km'])) return null;
    if (!isChoice(answers.measurementUnit, ['in', 'cm'])) return null;
    if (!isChoice(answers.experienceLevel, ['beginner', 'intermediate', 'advanced'])) return null;
    if (!isChoice(answers.trainingPhase, ['bulk', 'cut', 'maintain', 'recovery', 'unsure'])) return null;
    if (!isChoice(answers.primaryGoal, ['strength', 'muscle', 'fitness', 'endurance'])) return null;
    if (!isChoice(answers.trainingLocation, ['gym', 'home', 'both'])) return null;
    if (answers.trainingDaysPerWeek !== null && (
        typeof answers.trainingDaysPerWeek !== 'number' || !Number.isInteger(answers.trainingDaysPerWeek)
        || answers.trainingDaysPerWeek < 1 || answers.trainingDaysPerWeek > 7
    )) return null;

    // Copy only documented fields, so extra imported properties never become app state.
    return {
        version: 2,
        status: value.status as OnboardingProfile['status'],
        step: value.step,
        completedAt: value.completedAt as string | null,
        useRecommendedPlan,
        appliedAt,
        appliedSplitId,
        answers: {
            weightUnit: answers.weightUnit,
            distanceUnit: answers.distanceUnit,
            measurementUnit: answers.measurementUnit,
            experienceLevel: answers.experienceLevel,
            trainingPhase: answers.trainingPhase,
            primaryGoal: answers.primaryGoal,
            trainingDaysPerWeek: answers.trainingDaysPerWeek as number | null,
            trainingLocation: answers.trainingLocation,
            availableEquipment: availableEquipment === null ? null : [...new Set(availableEquipment)] as OnboardingEquipment[],
        },
    };
}
