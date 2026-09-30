jest.unmock('../notificationService');
jest.mock('react-native', () => ({
    Platform: { OS: 'android', Version: 36 },
    Linking: { sendIntent: jest.fn(async () => {}), openSettings: jest.fn(async () => {}) },
}));
jest.mock('expo-notifications', () => ({
    setNotificationHandler: jest.fn(),
    setNotificationChannelAsync: jest.fn(async () => {}),
    getPermissionsAsync: jest.fn(),
    requestPermissionsAsync: jest.fn(),
    scheduleNotificationAsync: jest.fn(),
    AndroidImportance: { HIGH: 4 },
    AndroidNotificationPriority: { HIGH: 'high' },
    SchedulableTriggerInputTypes: { DATE: 'date' },
}));

import * as Notifications from 'expo-notifications';
import { Linking } from 'react-native';
import {
    requestNotificationPermissions,
    scheduleRestTimerNotificationAt,
    openRestTimerAlarmSettings,
} from '../notificationService';

const getPermissions = jest.mocked(Notifications.getPermissionsAsync);
const requestPermissions = jest.mocked(Notifications.requestPermissionsAsync);
const schedule = jest.mocked(Notifications.scheduleNotificationAsync);
const granted = { granted: true, canAskAgain: true, status: 'granted', expires: 'never' } as Notifications.NotificationPermissionsStatus;
const denied = { ...granted, granted: false, status: 'denied' } as Notifications.NotificationPermissionsStatus;

beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(100000);
    getPermissions.mockResolvedValue(granted);
    requestPermissions.mockResolvedValue(granted);
    schedule.mockResolvedValue('alarm');
});
afterEach(() => jest.useRealTimers());

it('creates the Android channel before requesting notification access, sharing concurrent prompts', async () => {
    getPermissions.mockResolvedValue(denied);
    await Promise.all([requestNotificationPermissions(), requestNotificationPermissions()]);
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledTimes(1);
    expect(requestPermissions).toHaveBeenCalledTimes(1);
    expect(jest.mocked(Notifications.setNotificationChannelAsync).mock.invocationCallOrder[0])
        .toBeLessThan(getPermissions.mock.invocationCallOrder[0]);
});

it('schedules the absolute deadline on the audible rest-timer channel', async () => {
    await scheduleRestTimerNotificationAt(220000);
    expect(schedule).toHaveBeenCalledWith(expect.objectContaining({
        content: expect.objectContaining({ sound: 'default', data: { type: 'rest-timer', endTime: 220000 } }),
        trigger: { type: 'date', date: 220000, channelId: 'rest-timer' },
    }));
});

it('does not shift the deadline by time spent granting permissions', async () => {
    getPermissions.mockImplementationOnce(async () => {
        jest.setSystemTime(115000);
        return granted;
    });
    await scheduleRestTimerNotificationAt(220000);
    expect(schedule.mock.calls[0][0].trigger).toEqual({ type: 'date', date: 220000, channelId: 'rest-timer' });
});

it('does not schedule when a pending permission request outlasts the timer', async () => {
    getPermissions.mockImplementationOnce(async () => {
        jest.setSystemTime(230000);
        return granted;
    });
    expect(await scheduleRestTimerNotificationAt(220000)).toBeNull();
    expect(schedule).not.toHaveBeenCalled();
});

it('does not schedule an alarm invalidated while waiting for permissions', async () => {
    expect(await scheduleRestTimerNotificationAt(220000, () => false)).toBeNull();
    expect(schedule).not.toHaveBeenCalled();
});

it('honors denied access and rechecks after the user changes system settings', async () => {
    getPermissions.mockResolvedValueOnce({ ...denied, canAskAgain: false });
    expect(await scheduleRestTimerNotificationAt(220000)).toBeNull();
    expect(requestPermissions).not.toHaveBeenCalled();
    expect(await scheduleRestTimerNotificationAt(220000)).toBe('alarm');
    expect(getPermissions).toHaveBeenCalledTimes(2);
});

it('handles native permission errors without an unhandled startup rejection', async () => {
    const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
    getPermissions.mockRejectedValueOnce(new Error('Native module unavailable'));
    await expect(requestNotificationPermissions()).resolves.toBe(false);
    await expect(requestNotificationPermissions()).resolves.toBe(true);
    errorLog.mockRestore();
});

it('opens the supported Android alarm list and falls back if unavailable', async () => {
    await openRestTimerAlarmSettings();
    expect(Linking.sendIntent).toHaveBeenCalledWith('android.settings.REQUEST_SCHEDULE_EXACT_ALARM');
    jest.mocked(Linking.sendIntent).mockRejectedValueOnce(new Error('No matching activity'));
    await openRestTimerAlarmSettings();
    expect(Linking.openSettings).toHaveBeenCalledTimes(1);
});
