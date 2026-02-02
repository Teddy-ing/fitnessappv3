/**
 * Notification Service
 * 
 * Handles local notifications for the workout app.
 * Primary use: alerting user when rest timer completes.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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
export async function requestNotificationPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('[Notifications] Permission not granted');
        return false;
    }

    // Android needs a notification channel
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('rest-timer', {
            name: 'Rest Timer',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            sound: 'default',
        });
    }

    return true;
}

/**
 * Send rest timer completion notification
 */
export async function sendRestTimerNotification(): Promise<void> {
    try {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: "Rest Over! 💪",
                body: "Time for your next set",
                sound: 'default',
                priority: Notifications.AndroidNotificationPriority.HIGH,
            },
            trigger: null, // Send immediately
        });
    } catch (error) {
        console.error('[Notifications] Failed to send notification:', error);
    }
}

/**
 * Schedule a notification for when rest timer will end
 * Used when app goes to background
 */
export async function scheduleRestTimerNotification(secondsRemaining: number): Promise<string | null> {
    if (secondsRemaining <= 0) return null;

    try {
        const identifier = await Notifications.scheduleNotificationAsync({
            content: {
                title: "Rest Over! 💪",
                body: "Time for your next set",
                sound: 'default',
                priority: Notifications.AndroidNotificationPriority.HIGH,
            },
            trigger: {
                seconds: secondsRemaining,
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            },
        });
        return identifier;
    } catch (error) {
        console.error('[Notifications] Failed to schedule notification:', error);
        return null;
    }
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
    cancelScheduledNotification,
    clearAllNotifications,
};
