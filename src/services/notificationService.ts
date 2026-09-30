/**
 * Notification Service
 * 
 * Handles local notifications for the workout app.
 * Primary use: alerting user when rest timer completes.
 */

import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

export const REST_TIMER_CHANNEL_ID = 'rest-timer';
let permissionRequest: Promise<boolean> | null = null;

// Configure notification behavior (show even when app is in foreground)
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

/**
 * Request notification permissions
 */
export function requestNotificationPermissions(): Promise<boolean> {
    // Startup and the first timer can reach this together. Share the prompt,
    // but recheck on later calls in case permission changed in system settings.
    if (permissionRequest) return permissionRequest;
    permissionRequest = (async () => {
        try {
            // Android 13+ needs a channel before asking for notification access.
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync(REST_TIMER_CHANNEL_ID, {
                    name: 'Rest Timer',
                    importance: Notifications.AndroidImportance.HIGH,
                    vibrationPattern: [0, 250, 250, 250],
                    sound: 'default',
                });
            }

            const existing = await Notifications.getPermissionsAsync();
            if (existing.granted) return true;
            if (!existing.canAskAgain) return false;
            const requested = await Notifications.requestPermissionsAsync();
            return requested.granted;
        } catch (error) {
            console.error('[Notifications] Failed to request permissions:', error);
            return false;
        } finally {
            permissionRequest = null;
        }
    })();
    return permissionRequest;
}

/**
 * Send rest timer completion notification
 */
export async function sendRestTimerNotification(): Promise<void> {
    try {
        if (!await requestNotificationPermissions()) return;
        await Notifications.scheduleNotificationAsync({
            content: {
                title: "Rest Over! 💪",
                body: "Time for your next set",
                sound: 'default',
                priority: Notifications.AndroidNotificationPriority.HIGH,
            },
            trigger: Platform.OS === 'android' ? { channelId: REST_TIMER_CHANNEL_ID } : null,
        });
    } catch (error) {
        console.error('[Notifications] Failed to send notification:', error);
    }
}

/**
 * Schedule from the timer's absolute deadline, before JS can be suspended.
 * Android uses an exact native alarm when Alarms & reminders is allowed;
 * without that system permission Android may delay delivery.
 */
export async function scheduleRestTimerNotificationAt(
    endTime: number,
    isCurrent: () => boolean = () => true,
): Promise<string | null> {
    if (!Number.isFinite(endTime) || endTime <= Date.now()) return null;
    try {
        if (!await requestNotificationPermissions()) return null;
        // Permission prompts can outlast the rest or be followed by Skip/a new set.
        if (!isCurrent() || endTime <= Date.now()) return null;
        const identifier = await Notifications.scheduleNotificationAsync({
            content: {
                title: "Rest Over! 💪",
                body: "Time for your next set",
                sound: 'default',
                priority: Notifications.AndroidNotificationPriority.HIGH,
                data: { type: 'rest-timer', endTime },
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: endTime,
                channelId: REST_TIMER_CHANNEL_ID,
            },
        });
        return identifier;
    } catch (error) {
        console.error('[Notifications] Failed to schedule notification:', error);
        return null;
    }
}

export function scheduleRestTimerNotification(secondsRemaining: number): Promise<string | null> {
    return scheduleRestTimerNotificationAt(Date.now() + secondsRemaining * 1000);
}

/** Opens the system list; React Native's sendIntent cannot attach a package data URI. */
export async function openRestTimerAlarmSettings(): Promise<void> {
    if (Platform.OS === 'android' && Number(Platform.Version) >= 31) {
        try {
            await Linking.sendIntent('android.settings.REQUEST_SCHEDULE_EXACT_ALARM');
            return;
        } catch {
            // Some Android vendors do not expose this settings activity.
        }
    }
    await Linking.openSettings();
}

/**
 * Cancel a scheduled notification
 */
export async function cancelScheduledNotification(identifier: string): Promise<void> {
    try {
        await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch (error) {
        console.error('[Notifications] Failed to cancel notification:', error);
    }
}

/**
 * Clear all delivered notifications from the notification tray
 * Called when app comes to foreground
 */
export async function clearAllNotifications(): Promise<void> {
    try {
        await Notifications.dismissAllNotificationsAsync();
    } catch (error) {
        console.error('[Notifications] Failed to clear notifications:', error);
    }
}

export default {
    requestNotificationPermissions,
    sendRestTimerNotification,
    scheduleRestTimerNotification,
    scheduleRestTimerNotificationAt,
    cancelScheduledNotification,
    clearAllNotifications,
};
