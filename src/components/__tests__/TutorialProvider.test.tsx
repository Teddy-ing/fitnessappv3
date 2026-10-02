import React from 'react';
import { Alert, Platform } from 'react-native';
import TutorialProvider, { useTutorial } from '../tutorial/TutorialProvider';
import { getTutorialProgress, saveTutorialProgress } from '../../services/tutorialService';
import { getOnboardingProfile } from '../../services/onboardingService';
import { getSettings, type UserSettings } from '../../services/preferencesService';
import { saveWorkout, updateWorkout } from '../../services/workoutService';
import { useWeightUnit } from '../../hooks/useWeightUnit';
import { navigateToWorkoutHome } from '../../navigation/navigationRef';
import { createOnboardingProfile } from '../../models/onboarding';
import { createTutorialProgress, type TutorialProgress } from '../../models/tutorial';

jest.mock('react-native', () => ({ Alert: { alert: jest.fn() }, Platform: { OS: 'android' } }));
jest.mock('../tutorial/QuickStartGuide', () => 'QuickStartGuide');
jest.mock('../../services/tutorialService', () => ({ getTutorialProgress: jest.fn(), saveTutorialProgress: jest.fn() }));
jest.mock('../../services/onboardingService', () => ({ getOnboardingProfile: jest.fn() }));
jest.mock('../../services/preferencesService', () => ({ getSettings: jest.fn() }));
jest.mock('../../services/workoutService', () => ({ saveWorkout: jest.fn(), updateWorkout: jest.fn() }));
jest.mock('../../hooks/useWeightUnit', () => ({ useWeightUnit: jest.fn() }));
jest.mock('../../navigation/navigationRef', () => ({ navigateToWorkoutHome: jest.fn() }));

const { create } = require('react-test-renderer');
const { act } = React;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let renderer: any;
let tutorial: ReturnType<typeof useTutorial>;

function Consumer() {
    tutorial = useTutorial();
    return <>{'App content'}</>;
}

async function mount() {
    await act(async () => { renderer = create(<TutorialProvider><Consumer /></TutorialProvider>); });
}

function guide() {
    return renderer.root.findByType('QuickStartGuide').props;
}

function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>(done => { resolve = done; });
    return { promise, resolve };
}

beforeEach(() => {
    jest.resetAllMocks();
    Platform.OS = 'android';
    jest.mocked(getTutorialProgress).mockResolvedValue(createTutorialProgress());
    jest.mocked(saveTutorialProgress).mockResolvedValue(undefined);
    jest.mocked(getOnboardingProfile).mockResolvedValue(null);
    jest.mocked(getSettings).mockResolvedValue({ activeSplitId: null } as UserSettings);
    jest.mocked(useWeightUnit).mockReturnValue('lbs');
    const originalError = console.error;
    jest.spyOn(console, 'error').mockImplementation((...args: any[]) => {
        if (String(args[0]).startsWith('react-test-renderer is deprecated')) return;
        originalError(...args);
    });
    jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(async () => {
    if (renderer) await act(async () => { renderer.unmount(); });
    renderer = undefined;
    jest.restoreAllMocks();
});

it.each(['available', 'active', 'skipped', 'completed'] as const)('loads %s without opening a modal or writing progress', async status => {
    jest.mocked(getTutorialProgress).mockResolvedValue(createTutorialProgress(status));
    await mount();
    expect(JSON.stringify(renderer.toJSON())).toContain('App content');
    expect(tutorial.status).toBe(status);
    expect(guide().visible).toBe(false);
    expect(saveTutorialProgress).not.toHaveBeenCalled();
    expect(navigateToWorkoutHome).not.toHaveBeenCalled();
});

it('opens the overview without changing progress or creating a workout', async () => {
    await mount();
    await act(async () => { tutorial.openGuide(); });
    expect(guide().visible).toBe(true);
    expect(tutorial.status).toBe('available');
    expect(tutorial.requestedAction).toBeNull();
    expect(saveTutorialProgress).not.toHaveBeenCalled();
    expect(saveWorkout).not.toHaveBeenCalled();
    expect(updateWorkout).not.toHaveBeenCalled();
    expect(navigateToWorkoutHome).not.toHaveBeenCalled();
});

it('persists Skip, closes the overview, and leaves app content usable', async () => {
    await mount();
    await act(async () => { tutorial.openGuide(); });
    await act(async () => { guide().onSkip(); });
    expect(guide().visible).toBe(false);
    expect(tutorial.status).toBe('skipped');
    expect(jest.mocked(saveTutorialProgress).mock.calls).toEqual([['skipped']]);
    expect(tutorial.requestedAction).toBeNull();
    expect(navigateToWorkoutHome).not.toHaveBeenCalled();
    expect(JSON.stringify(renderer.toJSON())).toContain('App content');
});

it('can replay a completed guide without immediately reenabling contextual tips', async () => {
    jest.mocked(getTutorialProgress).mockResolvedValue(createTutorialProgress('completed'));
    await mount();
    await act(async () => { tutorial.openGuide(); });
    expect(guide().visible).toBe(true);
    expect(tutorial.status).toBe('completed');
    expect(saveTutorialProgress).not.toHaveBeenCalled();
    await act(async () => { guide().onStartWorkout(); });
    expect(tutorial.status).toBe('active');
    expect(tutorial.requestedAction).toBe('workout');
    expect(jest.mocked(navigateToWorkoutHome).mock.calls).toEqual([[]]);
});

it('dispatches an explicit guided workout once despite a double tap and consumes its request', async () => {
    await mount();
    await act(async () => { tutorial.openGuide(); });
    const start = guide().onStartWorkout;
    await act(async () => { start(); start(); });
    expect(jest.mocked(saveTutorialProgress).mock.calls).toEqual([['active']]);
    expect(jest.mocked(navigateToWorkoutHome).mock.calls).toEqual([[]]);
    expect(tutorial.requestedAction).toBe('workout');
    expect(guide().visible).toBe(false);
    await act(async () => { tutorial.consumeAction(); });
    expect(tutorial.requestedAction).toBeNull();
    expect(saveTutorialProgress).toHaveBeenCalledTimes(1);
});

it.each(['onCreateSplit', 'onDone'] as const)('%s completes the overview without making any workout writes', async callback => {
    await mount();
    await act(async () => { tutorial.openGuide(); });
    const finish = guide()[callback];
    await act(async () => { finish(); finish(); });
    expect(tutorial.status).toBe('completed');
    expect(jest.mocked(saveTutorialProgress).mock.calls).toEqual([['completed']]);
    expect(guide().visible).toBe(false);
    expect(saveWorkout).not.toHaveBeenCalled();
    expect(updateWorkout).not.toHaveBeenCalled();
    if (callback === 'onCreateSplit') {
        expect(tutorial.requestedAction).toBe('split');
        expect(jest.mocked(navigateToWorkoutHome).mock.calls).toEqual([[]]);
    } else {
        expect(tutorial.requestedAction).toBeNull();
        expect(navigateToWorkoutHome).not.toHaveBeenCalled();
    }
});

it('uses saved experience, current plan and weight unit to tailor the overview', async () => {
    const profile = createOnboardingProfile();
    profile.answers.experienceLevel = 'advanced';
    jest.mocked(getOnboardingProfile).mockResolvedValue(profile);
    jest.mocked(useWeightUnit).mockReturnValue('kg');
    jest.mocked(getSettings).mockResolvedValueOnce({ activeSplitId: 'my-plan' } as UserSettings);
    await mount();
    await act(async () => { tutorial.openGuide(); });
    expect(guide()).toMatchObject({ experienced: true, hasPlan: true, weightUnit: 'kg' });
    await act(async () => { guide().onSkip(); });
    await act(async () => { tutorial.openGuide(); });
    expect(guide().hasPlan).toBe(false);
    expect(getSettings).toHaveBeenCalledTimes(2);
});

it('does not let a late initial read overwrite a newer user choice', async () => {
    const initialRead = deferred<TutorialProgress>();
    jest.mocked(getTutorialProgress).mockReturnValue(initialRead.promise);
    await mount();
    expect(tutorial.status).toBeNull();
    expect(JSON.stringify(renderer.toJSON())).toContain('App content');
    await act(async () => { tutorial.skip(); });
    await act(async () => { initialRead.resolve(createTutorialProgress('available')); });
    expect(tutorial.status).toBe('skipped');
    expect(guide().visible).toBe(false);
    expect(jest.mocked(saveTutorialProgress).mock.calls).toEqual([['skipped']]);
});

it('keeps children and explicit actions usable when progress and personalization cannot load', async () => {
    jest.mocked(getTutorialProgress).mockRejectedValue(new Error('read failed'));
    jest.mocked(getOnboardingProfile).mockRejectedValue(new Error('profile unavailable'));
    jest.mocked(getSettings).mockRejectedValue(new Error('settings unavailable'));
    await mount();
    expect(JSON.stringify(renderer.toJSON())).toContain('App content');
    expect(guide().visible).toBe(false);
    await act(async () => { tutorial.openGuide(); });
    expect(guide()).toMatchObject({ visible: true, experienced: false, hasPlan: false });
    await act(async () => { guide().onStartWorkout(); });
    expect(tutorial.status).toBe('active');
    expect(tutorial.requestedAction).toBe('workout');
    expect(jest.mocked(navigateToWorkoutHome).mock.calls).toEqual([[]]);
});

it('keeps an explicit action usable and reports when the progress write fails', async () => {
    jest.mocked(saveTutorialProgress).mockRejectedValue(new Error('disk full'));
    await mount();
    await act(async () => { tutorial.openGuide(); });
    await act(async () => { guide().onStartWorkout(); });
    expect(tutorial.status).toBe('active');
    expect(tutorial.requestedAction).toBe('workout');
    expect(jest.mocked(navigateToWorkoutHome).mock.calls).toEqual([[]]);
    expect(Alert.alert).toHaveBeenCalledWith('Tutorial preference not saved', expect.any(String));
    expect(JSON.stringify(renderer.toJSON())).toContain('App content');
});

it.each(['available', 'active', 'skipped', 'completed'] as const)('completes %s progress only after the explicit completion callback and only when eligible', async status => {
    jest.mocked(getTutorialProgress).mockResolvedValue(createTutorialProgress(status));
    await mount();
    expect(saveTutorialProgress).not.toHaveBeenCalled();
    await act(async () => { tutorial.complete(); tutorial.complete(); });
    if (status === 'available' || status === 'active') {
        expect(jest.mocked(saveTutorialProgress).mock.calls).toEqual([['completed']]);
        expect(tutorial.status).toBe('completed');
    } else {
        expect(saveTutorialProgress).not.toHaveBeenCalled();
        expect(tutorial.status).toBe(status);
    }
});

it('does not mark an unresolved progress read complete', async () => {
    const initialRead = deferred<TutorialProgress>();
    jest.mocked(getTutorialProgress).mockReturnValue(initialRead.promise);
    await mount();
    await act(async () => { tutorial.complete(); });
    expect(saveTutorialProgress).not.toHaveBeenCalled();
    await act(async () => { initialRead.resolve(createTutorialProgress('skipped')); });
    expect(tutorial.status).toBe('skipped');
});

it.each([
    ['onStartWorkout', 'workout', 'active'],
    ['onCreateSplit', 'split', 'completed'],
] as const)('on iOS, %s waits for native dismissal and dispatches only once', async (callback, action, status) => {
    Platform.OS = 'ios';
    await mount();
    await act(async () => { tutorial.openGuide(); });
    const finish = guide()[callback];
    await act(async () => { finish(); finish(); });
    expect(tutorial.status).toBe(status);
    expect(jest.mocked(saveTutorialProgress).mock.calls).toEqual([[status]]);
    expect(guide().visible).toBe(false);
    expect(tutorial.requestedAction).toBeNull();
    expect(navigateToWorkoutHome).not.toHaveBeenCalled();
    await act(async () => { guide().onDismiss(); guide().onDismiss(); });
    expect(tutorial.requestedAction).toBe(action);
    expect(jest.mocked(navigateToWorkoutHome).mock.calls).toEqual([[]]);
});

it.each(['onSkip', 'onDone'] as const)('on iOS, dismissing after %s does not dispatch an action', async callback => {
    Platform.OS = 'ios';
    await mount();
    await act(async () => { tutorial.openGuide(); });
    await act(async () => { guide()[callback](); });
    await act(async () => { guide().onDismiss(); });
    expect(tutorial.requestedAction).toBeNull();
    expect(navigateToWorkoutHome).not.toHaveBeenCalled();
});

it('cancels a pending iOS launch when Skip arrives before native dismissal', async () => {
    Platform.OS = 'ios';
    await mount();
    await act(async () => { tutorial.openGuide(); });
    await act(async () => { guide().onStartWorkout(); guide().onSkip(); });
    await act(async () => { guide().onDismiss(); });
    expect(tutorial.status).toBe('skipped');
    expect(tutorial.requestedAction).toBeNull();
    expect(navigateToWorkoutHome).not.toHaveBeenCalled();
});
