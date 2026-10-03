import React from 'react';
import StartupGate from '../StartupGate';
import StartupReadyEffects from '../StartupReadyEffects';
import { useStartup } from '../StartupContext';
import { createStartupSession } from '../startupSession';
import OnboardingGate from '../../onboarding/OnboardingGate';
import { createOnboardingProfile } from '../../../models/onboarding';
import { applyStoredOnboarding, getOnboardingProfile } from '../../../services/onboardingService';
import { seedPremadeSplits } from '../../../services/premadeSplits';
import { requestNotificationPermissions } from '../../../services/notificationService';
import { useRestTimerLifecycle } from '../../../hooks/useRestTimerLifecycle';
import * as SplashScreen from 'expo-splash-screen';

jest.mock('react-native', () => {
    const listeners = new Set<(state: string) => void>();
    const motionListeners = new Set<(reduced: boolean) => void>();
    const backListeners = new Set<() => boolean>();
    const AppState = {
        currentState: 'active',
        addEventListener: jest.fn((_event: string, listener: (state: string) => void) => {
            listeners.add(listener);
            return { remove: () => listeners.delete(listener) };
        }),
    };
    return {
        View: 'View', Text: 'Text', ActivityIndicator: 'ActivityIndicator', TouchableOpacity: 'TouchableOpacity',
        StyleSheet: { create: (value: unknown) => value, absoluteFillObject: { position: 'absolute' } },
        Platform: { OS: 'android' },
        AppState,
        AccessibilityInfo: {
            isReduceMotionEnabled: jest.fn().mockResolvedValue(false),
            addEventListener: jest.fn((_event: string, listener: (reduced: boolean) => void) => {
                motionListeners.add(listener);
                return { remove: () => motionListeners.delete(listener) };
            }),
        },
        BackHandler: {
            addEventListener: jest.fn((_event: string, listener: () => boolean) => {
                backListeners.add(listener);
                return { remove: () => backListeners.delete(listener) };
            }),
        },
        emitState: (state: string) => { AppState.currentState = state; listeners.forEach(listener => listener(state)); },
        emitMotion: (reduced: boolean) => motionListeners.forEach(listener => listener(reduced)),
        emitBack: () => [...backListeners].some(listener => listener()),
    };
});
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn().mockResolvedValue(true), hideAsync: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../nativeSplash', () => ({ dismissNativeSplash: () => require('expo-splash-screen').hideAsync() }));
jest.mock('../../branding/IronJotMark', () => ({
    __esModule: true, default: 'IronJotMark', IRONJOT_ANIMATION_DURATION: 1000, IRONJOT_BACKGROUND: '#252E33',
}));
jest.mock('../StartupBranding', () => ({
    __esModule: true, default: 'StartupBranding', IRONJOT_STARTUP_DURATION: 2500,
}));
jest.mock('../../../screens/OnboardingScreen', () => 'OnboardingScreen');
jest.mock('../../../services/premadeSplits', () => ({ seedPremadeSplits: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../../hooks/useWeightUnit', () => ({ invalidateWeightUnitCache: jest.fn() }));
jest.mock('../../../hooks/useRestTimerLifecycle', () => ({ useRestTimerLifecycle: jest.fn() }));
jest.mock('../../../services/onboardingService', () => ({
    getOnboardingProfile: jest.fn(),
    applyStoredOnboarding: jest.fn().mockResolvedValue(false),
    shouldShowOnboarding: (profile: { status: string } | null) => !profile || profile.status === 'in_progress',
}));

const { create } = require('react-test-renderer');
const native = require('react-native');
const { act } = React;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let renderer: any;

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason: Error) => void;
    const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
    return { promise, resolve, reject };
}

function AppContent({ ready = true }: { ready?: boolean }) {
    const { isComplete, onInitializationComplete } = useStartup();
    React.useEffect(() => { if (ready) onInitializationComplete(); }, [ready, onInitializationComplete]);
    return <>{'Ready app'}{isComplete && <StartupReadyEffects />}</>;
}

beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    native.AppState.currentState = 'active';
    native.AccessibilityInfo.isReduceMotionEnabled.mockResolvedValue(false);
    jest.mocked(getOnboardingProfile).mockResolvedValue({ ...createOnboardingProfile(), status: 'completed' });
    jest.mocked(seedPremadeSplits).mockResolvedValue(undefined);
    jest.mocked(applyStoredOnboarding).mockResolvedValue(false);
    jest.mocked(requestNotificationPermissions).mockResolvedValue(true);
    jest.mocked(SplashScreen.hideAsync).mockResolvedValue(undefined);
    const originalError = console.error;
    jest.spyOn(console, 'error').mockImplementation((...args: any[]) => {
        if (String(args[0]).startsWith('react-test-renderer is deprecated')) return;
        originalError(...args);
    });
});

afterEach(async () => {
    if (renderer) await act(async () => renderer.unmount());
    renderer = undefined;
    jest.useRealTimers();
    jest.restoreAllMocks();
});

const overlay = () => renderer.root.findAllByProps({ testID: 'startup-overlay' });
const mark = () => renderer.root.findByType('StartupBranding');
async function mount(session = createStartupSession(), prepareApp?: () => Promise<void>, screenReady = true) {
    await act(async () => {
        renderer = create(<StartupGate session={session}>
            <OnboardingGate prepareApp={prepareApp}><AppContent ready={screenReady} /></OnboardingGate>
        </StartupGate>);
    });
    return session;
}
async function layout() {
    await act(async () => { overlay()[0].props.onLayout(); });
}
async function finishAnimation() {
    await act(async () => { mark().props.onAnimationComplete(); });
}

it('prepares real app content concurrently, then exposes it and requests permissions after animation', async () => {
    await mount();
    expect(JSON.stringify(renderer.toJSON())).toContain('Ready app');
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
    expect(mark().props.initialPose).toBe(true);
    expect(renderer.root.findByProps({ testID: 'startup-content' }).props.pointerEvents).toBe('none');
    expect(native.emitBack()).toBe(true);
    expect(requestNotificationPermissions).not.toHaveBeenCalled();
    expect(useRestTimerLifecycle).not.toHaveBeenCalled();
    await layout();
    expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
    expect(mark().props.animated).toBe(true);
    await finishAnimation();
    expect(overlay()).toHaveLength(0);
    expect(renderer.root.findByProps({ testID: 'startup-content' }).props.importantForAccessibility).toBe('auto');
    expect(native.emitBack()).toBe(false);
    expect(requestNotificationPermissions).toHaveBeenCalledTimes(1);
    expect(useRestTimerLifecycle).toHaveBeenCalledTimes(1);
});

it('holds the final static pose until slow library preparation and workout restoration both finish', async () => {
    const library = deferred<void>();
    const restoration = deferred<void>();
    const restore = jest.fn(() => restoration.promise);
    jest.mocked(seedPremadeSplits).mockReturnValue(library.promise);
    await mount(createStartupSession(), restore);
    await layout();
    expect(restore).toHaveBeenCalledTimes(1);
    await finishAnimation();
    expect(mark().props.animated).toBe(false);
    expect(mark().props.initialPose).toBe(false);
    expect(overlay()).toHaveLength(1);
    await act(async () => { library.resolve(); });
    expect(overlay()).toHaveLength(1);
    expect(JSON.stringify(renderer.toJSON())).not.toContain('Ready app');
    await act(async () => { restoration.resolve(); });
    expect(overlay()).toHaveLength(0);
});

it('waits for the mounted home screen to finish consuming its persisted data', async () => {
    const session = await mount(createStartupSession(), undefined, false);
    await layout();
    await finishAnimation();
    expect(overlay()).toHaveLength(1);
    expect(mark().props.animated).toBe(false);
    expect(requestNotificationPermissions).not.toHaveBeenCalled();
    await act(async () => {
        renderer.update(<StartupGate session={session}>
            <OnboardingGate><AppContent ready /></OnboardingGate>
        </StartupGate>);
    });
    expect(overlay()).toHaveLength(0);
    expect(requestNotificationPermissions).toHaveBeenCalledTimes(1);
});

it('never replays on app switching, sleep, or remount within the same runtime', async () => {
    const session = await mount();
    await layout();
    await finishAnimation();
    await act(async () => { native.emitState('inactive'); native.emitState('background'); native.emitState('active'); });
    expect(overlay()).toHaveLength(0);
    expect(requestNotificationPermissions).toHaveBeenCalledTimes(1);
    await act(async () => renderer.unmount());
    await mount(session);
    expect(mark().props.initialPose).toBe(false);
    await layout();
    expect(overlay()).toHaveLength(0);
});

it('consumes early backgrounding and waits for foreground before requesting permission', async () => {
    const restoration = deferred<void>();
    await mount(createStartupSession(), () => restoration.promise);
    await layout();
    expect(mark().props.animated).toBe(true);
    await act(async () => { native.emitState('background'); });
    expect(mark().props.animated).toBe(false);
    expect(mark().props.initialPose).toBe(false);
    await act(async () => { restoration.resolve(); });
    expect(overlay()).toHaveLength(0);
    expect(requestNotificationPermissions).not.toHaveBeenCalled();
    await act(async () => { native.emitState('active'); });
    expect(overlay()).toHaveLength(0);
    expect(requestNotificationPermissions).toHaveBeenCalledTimes(1);
});

it('does not start animation when backgrounded before native handoff', async () => {
    const nativeHide = deferred<void>();
    jest.mocked(SplashScreen.hideAsync).mockReturnValue(nativeHide.promise);
    await mount();
    await layout();
    await act(async () => { native.emitState('background'); });
    await act(async () => { nativeHide.resolve(); });
    expect(overlay()).toHaveLength(0);
    await act(async () => { native.emitState('active'); });
    expect(overlay()).toHaveLength(0);
});

it('shows the static final icon with reduced motion and skips the artificial animation wait', async () => {
    native.AccessibilityInfo.isReduceMotionEnabled.mockResolvedValue(true);
    const restoration = deferred<void>();
    await mount(createStartupSession(), () => restoration.promise);
    expect(mark().props.animated).toBe(false);
    expect(mark().props.initialPose).toBe(false);
    await layout();
    await act(async () => { restoration.resolve(); });
    expect(overlay()).toHaveLength(0);
});

it('stops motion when the accessibility preference changes during launch', async () => {
    await mount();
    await layout();
    expect(mark().props.animated).toBe(true);
    await act(async () => { native.emitMotion(true); });
    expect(overlay()).toHaveLength(0);
});

it('uses a static mark if the accessibility query stalls', async () => {
    native.AccessibilityInfo.isReduceMotionEnabled.mockReturnValue(new Promise(() => {}));
    await mount();
    await layout();
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
    await act(async () => { jest.advanceTimersByTime(500); });
    expect(overlay()).toHaveLength(0);
});

it('unblocks a ready app if an animation completion callback is lost', async () => {
    await mount();
    await layout();
    await act(async () => { jest.advanceTimersByTime(2699); });
    expect(overlay()).toHaveLength(1);
    await act(async () => { jest.advanceTimersByTime(1); });
    expect(overlay()).toHaveLength(0);
});

it('reveals initialization errors and preserves working retry and continue controls', async () => {
    jest.mocked(getOnboardingProfile).mockRejectedValueOnce(new Error('read failed'));
    await mount();
    await layout();
    await finishAnimation();
    expect(overlay()).toHaveLength(0);
    expect(JSON.stringify(renderer.toJSON())).toContain('Preferences couldn’t be loaded');
    expect(requestNotificationPermissions).not.toHaveBeenCalled();
    await act(async () => { renderer.root.findAllByType('TouchableOpacity')[0].props.onPress(); });
    expect(JSON.stringify(renderer.toJSON())).toContain('Ready app');
    expect(overlay()).toHaveLength(0);
    expect(requestNotificationPermissions).toHaveBeenCalledTimes(1);

    await act(async () => renderer.unmount());
    jest.mocked(getOnboardingProfile).mockRejectedValueOnce(new Error('read failed'));
    await mount();
    await layout();
    await finishAnimation();
    await act(async () => { renderer.root.findAllByType('TouchableOpacity')[1].props.onPress(); });
    expect(JSON.stringify(renderer.toJSON())).toContain('Ready app');
});

it('reveals first-run onboarding after assembly without requesting notification access', async () => {
    jest.mocked(getOnboardingProfile).mockResolvedValue(null);
    await mount();
    await layout();
    expect(renderer.root.findAllByType('OnboardingScreen')).toHaveLength(1);
    await finishAnimation();
    expect(overlay()).toHaveLength(0);
    expect(requestNotificationPermissions).not.toHaveBeenCalled();
    await act(async () => { renderer.root.findByType('OnboardingScreen').props.onDone(); });
    expect(requestNotificationPermissions).toHaveBeenCalledTimes(1);
});
