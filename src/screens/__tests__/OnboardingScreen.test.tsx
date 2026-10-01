import React from 'react';
import { BackHandler } from 'react-native';
import OnboardingScreen from '../OnboardingScreen';
import { createOnboardingProfile, OnboardingProfile } from '../../models/onboarding';
import { getOnboardingProfile, saveOnboardingProfile } from '../../services/onboardingService';
import { getOnboardingRecommendation } from '../../services/onboardingPlanService';
import { updateSettings } from '../../services/preferencesService';

jest.mock('react-native', () => ({
    ActivityIndicator: 'ActivityIndicator', ScrollView: 'ScrollView',
    Text: 'Text', TouchableOpacity: 'TouchableOpacity', View: 'View',
    StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
    BackHandler: { addEventListener: jest.fn() },
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('@expo/vector-icons', () => ({ MaterialIcons: 'MaterialIcons' }));
jest.mock('../../services/onboardingService', () => ({
    getOnboardingProfile: jest.fn(), saveOnboardingProfile: jest.fn(),
}));
jest.mock('../../services/preferencesService', () => ({ updateSettings: jest.fn() }));
jest.mock('../../services/onboardingPlanService', () => ({ getOnboardingRecommendation: jest.fn() }));

const { create } = require('react-test-renderer');
const { act } = React;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let renderer: any;
const onDone = jest.fn();
const getProfile = jest.mocked(getOnboardingProfile);
const saveProfile = jest.mocked(saveOnboardingProfile);
const getRecommendation = jest.mocked(getOnboardingRecommendation);
const recommendation: NonNullable<ReturnType<typeof getOnboardingRecommendation>> = {
    plan: {
        id: 'test_full_body', name: 'Full Body Foundations', description: 'Three balanced workouts with rest between them.', goals: ['strength'],
        workouts: [
            { name: 'Full Body A', exercises: [] },
            { name: 'Full Body B', exercises: [] },
            { name: 'Full Body C', exercises: [] },
        ],
        schedule: [0, null, 1, null, 2, null, null],
    },
    reason: 'A steady start for three training days with your available equipment.',
};

async function render(initialProfile: OnboardingProfile | null | undefined = null, mode: 'setup' | 'edit' = 'setup') {
    await act(async () => { renderer = create(<OnboardingScreen initialProfile={initialProfile} onDone={onDone} mode={mode} />); });
}

function button(label: string) {
    return renderer.root.findByProps({ accessibilityLabel: label });
}

async function press(label: string) {
    await act(async () => { button(label).props.onPress(); });
}

function heading() {
    return renderer.root.findByProps({ accessibilityRole: 'header' }).props.children;
}

function lastSave() {
    return saveProfile.mock.calls[saveProfile.mock.calls.length - 1][0];
}

function textIncludes(value: string) {
    return renderer.root.findAllByType('Text').some((node: any) => String(node.props.children).includes(value));
}

function readyProfile(experience: 'beginner' | 'intermediate' | 'advanced'): OnboardingProfile {
    return {
        ...createOnboardingProfile(),
        step: 6,
        answers: {
            ...createOnboardingProfile().answers,
            experienceLevel: experience, primaryGoal: 'strength', trainingDaysPerWeek: 3, trainingLocation: 'home', availableEquipment: ['dumbbell'],
        },
    };
}

beforeEach(() => {
    jest.clearAllMocks();
    getProfile.mockResolvedValue(null);
    saveProfile.mockResolvedValue(undefined);
    getRecommendation.mockReturnValue(null);
    jest.mocked(BackHandler.addEventListener).mockReturnValue({ remove: jest.fn() });
    const originalError = console.error;
    jest.spyOn(console, 'error').mockImplementation((...args: any[]) => {
        if (String(args[0]).startsWith('react-test-renderer is deprecated')) return;
        originalError(...args);
    });
});

afterEach(async () => {
    if (renderer) await act(async () => { renderer.unmount(); });
    renderer = undefined;
    jest.restoreAllMocks();
});

it('collects optional preferences, retains them on Back, and delegates completion to the application service', async () => {
    await render();
    await press('Get started');
    await press('Weight: Kilograms (kg)');
    await press('Distance: Miles (mi)');
    await press('Body measurements: Centimeters (cm)');
    await press('Continue');
    expect(lastSave()).toMatchObject({ status: 'in_progress', step: 2, answers: { weightUnit: 'kg', distanceUnit: 'mi', measurementUnit: 'cm' } });
    await press('Back');
    expect(button('Weight: Kilograms (kg)').props.accessibilityState.selected).toBe(true);
    await press('Continue');
    await press('Training experience: Experienced lifter');
    await press('Continue');
    await press('Current phase: Recovery');
    await press('Continue');
    await press('Primary goal: Get stronger');
    await press('Continue');
    await press('Training days per week: 4');
    await press('Where you train: Home');
    await press('Continue');
    expect(heading()).toBe('A little more about you.');
    expect(textIncludes('Finishing applies the units and training phase you chose.')).toBe(true);
    expect(textIncludes('future personalization')).toBe(false);
    await press('Save preferences');
    expect(lastSave()).toEqual({
        version: 2, status: 'completed', step: 6, completedAt: expect.any(String),
        useRecommendedPlan: false, appliedAt: null, appliedSplitId: null,
        answers: { weightUnit: 'kg', distanceUnit: 'mi', measurementUnit: 'cm', experienceLevel: 'advanced', trainingPhase: 'recovery', primaryGoal: 'strength', trainingDaysPerWeek: 4, trainingLocation: 'home', availableEquipment: null },
    });
    expect(updateSettings).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalledTimes(1);
});

it('allows every question to remain unanswered', async () => {
    await render();
    await press('Get started');
    for (let question = 1; question <= 5; question += 1) await press('Continue');
    await press('Save preferences');
    expect(lastSave()).toMatchObject({ status: 'completed', answers: createOnboardingProfile().answers });
    expect(onDone).toHaveBeenCalledTimes(1);
});

it('skips from a question while retaining existing answers', async () => {
    const profile = createOnboardingProfile();
    profile.step = 2;
    profile.answers.weightUnit = 'kg';
    await render(profile);
    await press('Training experience: Some experience');
    await press('Skip setup');
    expect(lastSave()).toMatchObject({ status: 'skipped', step: 2, answers: { weightUnit: 'kg', experienceLevel: 'intermediate' } });
    expect(onDone).toHaveBeenCalledTimes(1);
});

it('resumes a saved draft at its saved step', async () => {
    const profile = createOnboardingProfile();
    profile.step = 3;
    profile.answers.trainingPhase = 'bulk';
    getProfile.mockResolvedValue(profile);
    await act(async () => { renderer = create(<OnboardingScreen onDone={onDone} />); });
    expect(getProfile).toHaveBeenCalledTimes(1);
    expect(heading()).toBe('What phase are you in?');
    expect(button('Current phase: Bulk').props.accessibilityState.selected).toBe(true);
    expect(saveProfile).not.toHaveBeenCalled();
});

it('keeps answers and the current step after a failed save, then retries the intended navigation', async () => {
    const profile = createOnboardingProfile();
    profile.step = 1;
    await render(profile);
    await press('Weight: Kilograms (kg)');
    saveProfile.mockRejectedValueOnce(new Error('disk full'));
    await press('Continue');
    expect(heading()).toBe('Which units feel familiar?');
    expect(button('Weight: Kilograms (kg)').props.accessibilityState.selected).toBe(true);
    expect(onDone).not.toHaveBeenCalled();
    await press('Try again');
    expect(heading()).toBe('Where are you in your training?');
    expect(lastSave()).toMatchObject({ step: 2, answers: { weightUnit: 'kg' } });
});

it('blocks double saves and Android Back until completion is persisted', async () => {
    const profile = createOnboardingProfile();
    profile.step = 6;
    await render(profile);
    let finishSave: () => void = () => {};
    saveProfile.mockReturnValue(new Promise<void>(resolve => { finishSave = resolve; }));
    await act(async () => {
        const finish = button('Save preferences').props.onPress;
        finish();
        finish();
    });
    expect(saveProfile).toHaveBeenCalledTimes(1);
    expect(button('Skip setup').props.disabled).toBe(true);
    const listeners = jest.mocked(BackHandler.addEventListener).mock.calls;
    await act(async () => { expect(listeners[listeners.length - 1][1]()).toBe(true); });
    expect(saveProfile).toHaveBeenCalledTimes(1);
    expect(onDone).not.toHaveBeenCalled();
    await act(async () => { finishSave(); });
    expect(onDone).toHaveBeenCalledTimes(1);
});

it('allows cancellation of an edited completed profile without overwriting saved answers', async () => {
    const profile: OnboardingProfile = { ...createOnboardingProfile(), status: 'completed', completedAt: '2026-09-29T00:00:00.000Z', step: 6 };
    profile.answers.weightUnit = 'lbs';
    await render(profile, 'edit');
    const editUnits = renderer.root.findAllByType('TouchableOpacity').find((node: any) => String(node.props.accessibilityLabel).startsWith('Edit Units:'));
    await act(async () => { editUnits.props.onPress(); });
    await press('Weight: Kilograms (kg)');
    await press('Back to review');
    expect(saveProfile).not.toHaveBeenCalled();
    await press('Cancel');
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(saveProfile).not.toHaveBeenCalled();
    expect(profile.answers.weightUnit).toBe('lbs');
});

it('saves reviewed edits only when explicitly completed and lets a selected answer be cleared', async () => {
    const profile: OnboardingProfile = { ...createOnboardingProfile(), status: 'completed', completedAt: '2026-09-29T00:00:00.000Z', step: 6 };
    profile.answers.weightUnit = 'lbs';
    await render(profile, 'edit');
    const editUnits = renderer.root.findAllByType('TouchableOpacity').find((node: any) => String(node.props.accessibilityLabel).startsWith('Edit Units:'));
    await act(async () => { editUnits.props.onPress(); });
    await press('Weight: Pounds (lbs)');
    await press('Distance: Kilometers (km)');
    await press('Back to review');
    expect(saveProfile).not.toHaveBeenCalled();
    await press('Save preferences');
    expect(saveProfile).toHaveBeenCalledTimes(1);
    expect(lastSave()).toMatchObject({ status: 'completed', answers: { weightUnit: null, distanceUnit: 'km' } });
    expect(updateSettings).not.toHaveBeenCalled();
});

it('lets a user enter the app when loading or saving is unavailable', async () => {
    getProfile.mockRejectedValueOnce(new Error('database unavailable'));
    await act(async () => { renderer = create(<OnboardingScreen onDone={onDone} />); });
    await press('Continue without saving');
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(saveProfile).not.toHaveBeenCalled();
});

it('collects multiple home equipment choices and distinguishes bodyweight only from an unanswered question', async () => {
    const profile = createOnboardingProfile();
    profile.step = 5;
    await render(profile);
    await press('Where you train: Home');
    expect(button('Home equipment: Bodyweight only').props.accessibilityState.checked).toBe(false);
    await press('Home equipment: Dumbbells');
    await press('Home equipment: Adjustable bench');
    expect(button('Home equipment: Dumbbells').props.accessibilityState.checked).toBe(true);
    expect(button('Home equipment: Adjustable bench').props.accessibilityState.checked).toBe(true);
    await press('Continue');
    expect(lastSave().answers.availableEquipment).toEqual(['dumbbell', 'bench']);
    await press('Back');
    await press('Home equipment: Bodyweight only');
    expect(button('Home equipment: Dumbbells').props.accessibilityState.checked).toBe(false);
    await press('Continue');
    expect(lastSave().answers.availableEquipment).toEqual([]);
    await press('Back');
    await press('Home equipment: Bodyweight only');
    await press('Continue');
    expect(lastSave().answers.availableEquipment).toBeNull();
});

it('asks about home equipment for Both and clears the hidden answer when switching to Gym', async () => {
    const profile = createOnboardingProfile();
    profile.step = 5;
    await render(profile);
    await press('Where you train: Both');
    expect(textIncludes('Your starting plan will also work there')).toBe(true);
    await press('Home equipment: Pull-up bar');
    await press('Where you train: Gym');
    expect(renderer.root.findAllByProps({ accessibilityLabel: 'Home equipment: Pull-up bar' })).toHaveLength(0);
    await press('Continue');
    expect(lastSave().answers.availableEquipment).toBeNull();
    expect(lastSave().answers.trainingLocation).toBe('gym');
});

it('previews the recommended week and includes it by default for a beginner', async () => {
    getRecommendation.mockReturnValue(recommendation);
    await render(readyProfile('beginner'));
    expect(textIncludes('Your starting plan')).toBe(true);
    expect(textIncludes('Full Body Foundations')).toBe(true);
    expect(textIncludes(recommendation.reason)).toBe(true);
    expect(textIncludes('Full Body A')).toBe(true);
    expect(textIncludes('Full Body B')).toBe(true);
    expect(textIncludes('Full Body C')).toBe(true);
    expect(renderer.root.findAllByType('Text').filter((node: any) => node.props.children === 'Rest')).toHaveLength(4);
    expect(button('Use this starting plan').props.accessibilityState.checked).toBe(true);
    await press('Save preferences');
    expect(lastSave()).toMatchObject({ status: 'completed', useRecommendedPlan: true });
    expect(updateSettings).not.toHaveBeenCalled();
});

it.each([
    ['beginner', true, false],
    ['intermediate', false, true],
] as const)('lets a %s change the suggested-plan default before saving', async (experience, initialChoice, finalChoice) => {
    getRecommendation.mockReturnValue(recommendation);
    await render(readyProfile(experience));
    expect(button('Use this starting plan').props.accessibilityState.checked).toBe(initialChoice);
    await press('Use this starting plan');
    expect(button('Use this starting plan').props.accessibilityState.checked).toBe(finalChoice);
    await press('Save preferences');
    expect(lastSave().useRecommendedPlan).toBe(finalChoice);
});

it('does not add a plan for intermediate lifters without their opt-in', async () => {
    getRecommendation.mockReturnValue(recommendation);
    await render(readyProfile('intermediate'));
    await press('Save preferences');
    expect(lastSave().useRecommendedPlan).toBe(false);
});

it('leaves advanced lifters with their own routine even if previous plan consent was true', async () => {
    getRecommendation.mockReturnValue(recommendation);
    await render({ ...readyProfile('advanced'), useRecommendedPlan: true });
    expect(textIncludes('Start with your own routine')).toBe(true);
    expect(renderer.root.findAllByProps({ accessibilityLabel: 'Use this starting plan' })).toHaveLength(0);
    await press('Save preferences');
    expect(lastSave().useRecommendedPlan).toBe(false);
});

it('explains missing plan answers while allowing the remaining preferences to be saved', async () => {
    const profile = readyProfile('beginner');
    profile.answers.primaryGoal = null;
    profile.answers.availableEquipment = null;
    await render(profile);
    expect(textIncludes('To suggest a split, add your main goal, home equipment.')).toBe(true);
    await press('Save preferences');
    expect(lastSave()).toMatchObject({ status: 'completed', useRecommendedPlan: false });
    expect(onDone).toHaveBeenCalledTimes(1);
});

it('retries failed completion with the same plan consent and prevents an early exit', async () => {
    getRecommendation.mockReturnValue(recommendation);
    await render(readyProfile('beginner'));
    saveProfile.mockRejectedValueOnce(new Error('transaction rolled back'));
    await press('Save preferences');
    const firstAttempt = lastSave();
    expect(onDone).not.toHaveBeenCalled();
    expect(button('Use this starting plan').props.accessibilityState.checked).toBe(true);
    await press('Try again');
    expect(lastSave()).toEqual(firstAttempt);
    expect(lastSave().useRecommendedPlan).toBe(true);
    expect(onDone).toHaveBeenCalledTimes(1);
});
