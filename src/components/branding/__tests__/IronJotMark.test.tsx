import React, { act } from 'react';
import { Animated } from 'react-native';
import { IronJotMark } from '../IronJotMark';

const { create } = require('react-test-renderer');

jest.mock('react-native', () => ({
  View: 'View',
  StyleSheet: { absoluteFill: {} },
  Easing: { cubic: 'cubic', out: (value: unknown) => value },
  Animated: {
    View: 'AnimatedView',
    Value: jest.fn().mockImplementation((initial: number) => ({
      current: initial,
      setValue: jest.fn(function (this: { current: number }, next: number) { this.current = next; }),
      stopAnimation: jest.fn(),
      interpolate: jest.fn(() => 0),
    })),
    timing: jest.fn(),
  },
}));
jest.mock('react-native-svg', () => ({ __esModule: true, default: 'Svg', Path: 'Path' }));

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

it('keeps the initial pose without starting motion, then reports layout readiness once', () => {
  const onReady = jest.fn();
  act(() => { renderer = create(<IronJotMark initialPose onReady={onReady} />); });
  expect(Animated.timing).not.toHaveBeenCalled();
  const value = jest.mocked(Animated.Value).mock.results[0].value;
  expect(value.current).toBe(0);
  const root = renderer!.root.findByType('View' as never);
  act(() => { root.props.onLayout(); root.props.onLayout(); });
  expect(onReady).toHaveBeenCalledTimes(1);
});

it('runs once and uses the latest completion callback without restarting on rerender', () => {
  const originalComplete = jest.fn();
  const latestComplete = jest.fn();
  act(() => { renderer = create(<IronJotMark animated onAnimationComplete={originalComplete} />); });
  act(() => { renderer!.update(<IronJotMark animated onAnimationComplete={latestComplete} />); });
  expect(Animated.timing).toHaveBeenCalledTimes(1);
  expect(Animated.timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
    duration: 1000, useNativeDriver: true,
  }));
  act(() => finish?.({ finished: true }));
  expect(originalComplete).not.toHaveBeenCalled();
  expect(latestComplete).toHaveBeenCalledTimes(1);
});

it('cancels running motion and snaps final without firing a stale completion callback', () => {
  const complete = jest.fn();
  act(() => { renderer = create(<IronJotMark animated onAnimationComplete={complete} />); });
  const staleFinish = finish;
  act(() => { renderer!.update(<IronJotMark animated={false} onAnimationComplete={complete} />); });
  const value = jest.mocked(Animated.Value).mock.results[0].value;
  expect(stop).toHaveBeenCalledTimes(1);
  expect(value.current).toBe(1);
  act(() => staleFinish?.({ finished: true }));
  expect(complete).not.toHaveBeenCalled();
});

it('ignores callbacks arriving after unmount', () => {
  const complete = jest.fn();
  act(() => { renderer = create(<IronJotMark animated onAnimationComplete={complete} />); });
  const staleFinish = finish;
  act(() => { renderer!.unmount(); renderer = undefined; });
  act(() => staleFinish?.({ finished: true }));
  expect(complete).not.toHaveBeenCalled();
});
