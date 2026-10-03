jest.mock('react-native', () => ({
    AppState: {
        currentState: 'active',
        addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    },
}));
jest.mock('../../services/notificationService', () => ({
    scheduleRestTimerNotificationAt: jest.fn(async () => 'native-alarm'),
    cancelScheduledNotification: jest.fn(async () => {}),
    sendRestTimerNotification: jest.fn(async () => {}),
}));

import React, { act } from 'react';
const { create } = require('react-test-renderer');
import { AppState, AppStateStatus } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRestTimerLifecycle } from '../useRestTimerLifecycle';
import { useRestTimerStore } from '../../stores/restTimerStore';
import {
    scheduleRestTimerNotificationAt,
    cancelScheduledNotification,
    sendRestTimerNotification,
} from '../../services/notificationService';

function TimerLifecycle() {
    useRestTimerLifecycle();
    return null;
}

let renderer: { unmount: () => void };
const schedule = jest.mocked(scheduleRestTimerNotificationAt);
const cancel = jest.mocked(cancelScheduledNotification);
const appState = (next: AppStateStatus) => {
    const [, listener] = jest.mocked(AppState.addEventListener).mock.calls[0];
    listener(next);
};

beforeEach(async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    jest.clearAllMocks();
    schedule.mockReset().mockResolvedValue('native-alarm');
    cancel.mockReset().mockResolvedValue(undefined);
    jest.useFakeTimers().setSystemTime(100000);
    jest.mocked(Haptics.notificationAsync).mockResolvedValue(undefined);
    useRestTimerStore.setState({
        restTimerActive: false, restTimerEndTime: null, restTimerRemaining: 0,
        restTimerDuration: 120, timerCompletionReason: null, exerciseRestTimes: {},
        activeRestTimerExerciseId: null, activeRestTimerSetId: null,
    });
    await act(async () => { renderer = create(React.createElement(TimerLifecycle)); });
});
afterEach(async () => {
    await act(async () => renderer.unmount());
    jest.useRealTimers();
});

it('registers native alarms on start, adjustment, and changing the active exercise rest time', async () => {
    await act(async () => useRestTimerStore.getState().startRestTimer(120, 'ex-1', 'set-1'));
    expect(schedule).toHaveBeenLastCalledWith(220000, expect.any(Function));
    await act(async () => useRestTimerStore.getState().adjustRestTimer(30));
    expect(schedule).toHaveBeenLastCalledWith(250000, expect.any(Function));
    await act(async () => useRestTimerStore.getState().setExerciseRestTime('ex-1', 60));
    expect(schedule).toHaveBeenLastCalledWith(160000, expect.any(Function));
    expect(cancel).toHaveBeenCalledTimes(2);
    await act(async () => jest.advanceTimersByTime(1000));
    expect(schedule).toHaveBeenCalledTimes(3);
});

it('lets the native deadline own the alert when JS is suspended, without replaying it on resume', async () => {
    await act(async () => useRestTimerStore.getState().startRestTimer(120));
    expect(schedule).toHaveBeenCalledTimes(1);
    await act(async () => appState('background'));
    await act(async () => jest.advanceTimersByTime(130000));
    expect(useRestTimerStore.getState().restTimerRemaining).toBe(120);
    await act(async () => appState('active'));
    expect(useRestTimerStore.getState().restTimerRemaining).toBe(0);
    expect(useRestTimerStore.getState().restTimerActive).toBe(false);
    expect(schedule).toHaveBeenCalledTimes(1);
    expect(sendRestTimerNotification).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
});

it('preserves an existing alarm when returning from system settings before expiry', async () => {
    await act(async () => useRestTimerStore.getState().startRestTimer(120));
    await act(async () => appState('background'));
    await act(async () => jest.advanceTimersByTime(30000));
    await act(async () => appState('active'));
    expect(useRestTimerStore.getState().restTimerRemaining).toBe(90);
    expect(schedule).toHaveBeenCalledTimes(1);
    expect(schedule).toHaveBeenLastCalledWith(220000, expect.any(Function));
    expect(cancel).not.toHaveBeenCalled();
});

it('retries a missing alarm after notification access was initially denied', async () => {
    schedule.mockResolvedValueOnce(null);
    await act(async () => useRestTimerStore.getState().startRestTimer(120));
    await act(async () => appState('background'));
    await act(async () => jest.advanceTimersByTime(30000));
    await act(async () => appState('active'));
    expect(schedule).toHaveBeenCalledTimes(2);
    expect(schedule).toHaveBeenLastCalledWith(220000, expect.any(Function));
    expect(cancel).not.toHaveBeenCalled();
});

it('does not lose a native alarm when a resume permission check would cross its deadline', async () => {
    await act(async () => useRestTimerStore.getState().startRestTimer(120));
    await act(async () => appState('background'));
    await act(async () => jest.advanceTimersByTime(119900));
    // Replacing the valid alarm here would cancel it, then finish checking
    // permissions too late for notificationService to schedule another one.
    schedule.mockImplementationOnce(async () => {
        jest.setSystemTime(220500);
        return null;
    });
    await act(async () => appState('active'));
    await act(async () => jest.advanceTimersByTime(1000));
    expect(useRestTimerStore.getState().restTimerActive).toBe(false);
    expect(schedule).toHaveBeenCalledTimes(1);
    expect(cancel).not.toHaveBeenCalled();
    expect(sendRestTimerNotification).not.toHaveBeenCalled();
});

it('keeps a scheduled expiry alert and gives foreground haptic feedback once', async () => {
    await act(async () => useRestTimerStore.getState().startRestTimer(1));
    await act(async () => jest.advanceTimersByTime(1500));
    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
    expect(sendRestTimerNotification).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
});

it('cancels when Skip or workout completion stops the timer', async () => {
    await act(async () => useRestTimerStore.getState().startRestTimer(120));
    await act(async () => useRestTimerStore.getState().stopRestTimer());
    expect(cancel).toHaveBeenCalledWith('native-alarm');
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
});
