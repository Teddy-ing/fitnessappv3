import React, { act } from 'react';
import { Animated } from 'react-native';
import StartupBranding, { IRONJOT_STARTUP_DURATION } from '../StartupBranding';

const { create } = require('react-test-renderer');

jest.mock('react-native', () => ({
    View: 'View', Text: 'Text',
    StyleSheet: { create: (value: unknown) => value, absoluteFillObject: { position: 'absolute' } },
    Easing: { linear: 'linear' },
    Animated: {
        View: 'AnimatedView',
        Value: jest.fn().mockImplementation((initial: number) => ({
            current: initial,
            setValue: jest.fn(function (this: { current: number }, next: number) { this.current = next; }),
            stopAnimation: jest.fn(),
            interpolate: jest.fn((config: unknown) => config),
        })),
        timing: jest.fn(),
    },
}));
jest.mock('../../branding/IronJotMark', () => ({ __esModule: true, default: 'IronJotMark' }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let renderer: any;
let finish: ((result: { finished: boolean }) => void) | undefined;
const stop = jest.fn();

beforeEach(() => {
    jest.clearAllMocks();
    finish = undefined;
    jest.mocked(Animated.timing).mockImplementation(() => ({
        start: callback => { finish = callback; }, stop, reset: jest.fn(),
    }));
    const originalError = console.error;
    jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
        if (String(args[0]).startsWith('react-test-renderer is deprecated')) return;
        originalError(...args);
    });
});

afterEach(() => {
    act(() => renderer?.unmount());
    renderer = undefined;
    jest.restoreAllMocks();
});

it('owns a 2500ms native timeline while leaving the icon assembly duration unchanged', () => {
    const complete = jest.fn();
    act(() => { renderer = create(<StartupBranding size={160} animated onAnimationComplete={complete} />); });
    expect(IRONJOT_STARTUP_DURATION).toBe(2500);
    expect(Animated.timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        duration: 2500, useNativeDriver: true,
    }));
    const icon = renderer.root.findByType('IronJotMark');
    expect(icon.props.animated).toBe(true);
    expect(icon.props.onAnimationComplete).toBeUndefined();
    expect(complete).not.toHaveBeenCalled();
    act(() => finish?.({ finished: true }));
    expect(complete).toHaveBeenCalledTimes(1);
});

it('uses opposite transforms for a stationary left-to-right title reveal from 850 to 1750ms', () => {
    act(() => { renderer = create(<StartupBranding size={160} animated />); });
    const value = jest.mocked(Animated.Value).mock.results[0].value;
    expect(value.interpolate).toHaveBeenCalledWith({
        inputRange: [0, 850 / 2500, 1750 / 2500, 1],
        outputRange: [-288, -288, 0, 0],
        extrapolate: 'clamp',
    });
    expect(value.interpolate).toHaveBeenCalledWith({
        inputRange: [0, 850 / 2500, 1750 / 2500, 1],
        outputRange: [288, 288, 0, 0],
        extrapolate: 'clamp',
    });
    expect(renderer.root.findByType('Text').props.children).toBe('IronJot');
});

it('keeps the initial title hidden without running the timeline before handoff', () => {
    act(() => { renderer = create(<StartupBranding size={160} initialPose />); });
    expect(Animated.timing).not.toHaveBeenCalled();
    expect(jest.mocked(Animated.Value).mock.results[0].value.current).toBe(0);
    expect(renderer.root.findByType('IronJotMark').props.initialPose).toBe(true);
});

it('shows the final title and mark immediately for reduced motion or a slow-loading hold', () => {
    act(() => { renderer = create(<StartupBranding size={160} />); });
    expect(Animated.timing).not.toHaveBeenCalled();
    expect(jest.mocked(Animated.Value).mock.results[0].value.current).toBe(1);
    expect(renderer.root.findByType('IronJotMark').props.animated).toBe(false);
    expect(renderer.root.findByType('IronJotMark').props.initialPose).toBe(false);
});

it('snaps to the complete title on interruption and ignores the abandoned callback', () => {
    const complete = jest.fn();
    act(() => { renderer = create(<StartupBranding size={160} animated onAnimationComplete={complete} />); });
    const abandoned = finish;
    act(() => { renderer.update(<StartupBranding size={160} onAnimationComplete={complete} />); });
    expect(stop).toHaveBeenCalledTimes(1);
    expect(jest.mocked(Animated.Value).mock.results[0].value.current).toBe(1);
    act(() => abandoned?.({ finished: true }));
    expect(complete).not.toHaveBeenCalled();
});

it('does not restart when completion callback identity changes', () => {
    const original = jest.fn();
    const latest = jest.fn();
    act(() => { renderer = create(<StartupBranding size={160} animated onAnimationComplete={original} />); });
    act(() => { renderer.update(<StartupBranding size={160} animated onAnimationComplete={latest} />); });
    expect(Animated.timing).toHaveBeenCalledTimes(1);
    act(() => finish?.({ finished: true }));
    expect(original).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledTimes(1);
});
