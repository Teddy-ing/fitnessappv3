import React from 'react';
import OnboardingGate from '../onboarding/OnboardingGate';
import { applyStoredOnboarding, getOnboardingProfile } from '../../services/onboardingService';
import { invalidateWeightUnitCache } from '../../hooks/useWeightUnit';
import { seedPremadeSplits } from '../../services/premadeSplits';
import { createOnboardingProfile } from '../../models/onboarding';

jest.mock('react-native', () => ({
    View: 'View', Text: 'Text', TouchableOpacity: 'TouchableOpacity', ActivityIndicator: 'ActivityIndicator',
    StyleSheet: { create: (value: unknown) => value },
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('../../screens/OnboardingScreen', () => 'OnboardingScreen');
jest.mock('../../services/premadeSplits', () => ({ seedPremadeSplits: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../hooks/useWeightUnit', () => ({ invalidateWeightUnitCache: jest.fn() }));
jest.mock('../../services/onboardingService', () => ({
    getOnboardingProfile: jest.fn(),
    applyStoredOnboarding: jest.fn().mockResolvedValue(false),
    shouldShowOnboarding: (profile: { status: string } | null) => !profile || profile.status === 'in_progress',
}));

const { create } = require('react-test-renderer');
const { act } = React;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let renderer: any;

beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(applyStoredOnboarding).mockResolvedValue(false);
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

async function mount() {
    await act(async () => { renderer = create(<OnboardingGate><>{'App content'}</></OnboardingGate>); });
}

it('waits for persisted preferences before mounting app content', async () => {
    let resolve: (value: null) => void = () => {};
    jest.mocked(getOnboardingProfile).mockReturnValue(new Promise(done => { resolve = done; }));
    await mount();
    expect(renderer.root.findAllByType('ActivityIndicator')).toHaveLength(1);
    expect(JSON.stringify(renderer.toJSON())).not.toContain('App content');
    await act(async () => { resolve(null); });
    expect(renderer.root.findByType('OnboardingScreen').props.initialProfile).toBeNull();
    await act(async () => { renderer.root.findByType('OnboardingScreen').props.onDone(); });
    expect(renderer.toJSON()).toBe('App content');
});

it.each(['completed', 'skipped'] as const)('does not automatically repeat %s onboarding', async status => {
    jest.mocked(getOnboardingProfile).mockResolvedValue({ ...createOnboardingProfile(), status });
    await mount();
    expect(renderer.toJSON()).toBe('App content');
});

it('finishes library updates and applies an older completed setup before showing the app', async () => {
    jest.mocked(applyStoredOnboarding).mockResolvedValue(true);
    jest.mocked(getOnboardingProfile).mockResolvedValue({ ...createOnboardingProfile(), status: 'completed' });
    await mount();
    expect(seedPremadeSplits).toHaveBeenCalledTimes(1);
    expect(applyStoredOnboarding).toHaveBeenCalledTimes(1);
    expect(invalidateWeightUnitCache).toHaveBeenCalledTimes(1);
    expect(renderer.toJSON()).toBe('App content');
});

it('passes a saved draft through for resume', async () => {
    const profile = { ...createOnboardingProfile(), step: 3 };
    jest.mocked(getOnboardingProfile).mockResolvedValue(profile);
    await mount();
    expect(renderer.root.findByType('OnboardingScreen').props.initialProfile).toEqual(profile);
});

it('offers retry and a way into the app after a load failure', async () => {
    jest.mocked(getOnboardingProfile).mockRejectedValueOnce(new Error('read failed')).mockResolvedValueOnce(null);
    await mount();
    await act(async () => { renderer.root.findAllByType('TouchableOpacity')[0].props.onPress(); });
    expect(getOnboardingProfile).toHaveBeenCalledTimes(2);
    expect(renderer.root.findAllByType('OnboardingScreen')).toHaveLength(1);

    await act(async () => { renderer.unmount(); });
    jest.mocked(getOnboardingProfile).mockRejectedValueOnce(new Error('read failed'));
    await mount();
    await act(async () => { renderer.root.findAllByType('TouchableOpacity')[1].props.onPress(); });
    expect(renderer.toJSON()).toBe('App content');
});

it('does not expose Continue after a preferences error until workout restoration settles', async () => {
    let finishRestoration!: () => void;
    const restoration = new Promise<void>(resolve => { finishRestoration = resolve; });
    jest.mocked(getOnboardingProfile).mockRejectedValueOnce(new Error('read failed'));
    await act(async () => {
        renderer = create(<OnboardingGate prepareApp={() => restoration}>App content</OnboardingGate>);
    });
    expect(renderer.root.findAllByType('ActivityIndicator')).toHaveLength(1);
    expect(renderer.root.findAllByType('TouchableOpacity')).toHaveLength(0);
    await act(async () => { finishRestoration(); });
    expect(renderer.root.findAllByType('TouchableOpacity')).toHaveLength(2);
});

it('does not mount app content before restored workout state is available', async () => {
    let finishRestoration!: () => void;
    const restoration = new Promise<void>(resolve => { finishRestoration = resolve; });
    jest.mocked(getOnboardingProfile).mockResolvedValue({ ...createOnboardingProfile(), status: 'completed' });
    await act(async () => {
        renderer = create(<OnboardingGate prepareApp={() => restoration}>App content</OnboardingGate>);
    });
    expect(JSON.stringify(renderer.toJSON())).not.toContain('App content');
    await act(async () => { finishRestoration(); });
    expect(renderer.toJSON()).toBe('App content');
});
