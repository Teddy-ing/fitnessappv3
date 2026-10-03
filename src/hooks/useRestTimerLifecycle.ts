import { useEffect } from 'react';
import { AppState } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRestTimerStore } from '../stores/restTimerStore';
import { cancelScheduledNotification, scheduleRestTimerNotificationAt } from '../services/notificationService';
import { createRestTimerNotificationController } from '../services/restTimerNotificationController';

/** Mount once at the app root so screen navigation never owns an active alarm. */
export function useRestTimerLifecycle(): void {
    useEffect(() => {
        const notifications = createRestTimerNotificationController({
            schedule: scheduleRestTimerNotificationAt,
            cancel: cancelScheduledNotification,
        });
        let appState = AppState.currentState;
        let synchronizing = false;
        let interval: ReturnType<typeof setInterval> | null = null;

        const syncClock = () => {
            synchronizing = true;
            useRestTimerStore.getState().tickRestTimer();
            synchronizing = false;
        };
        const updateInterval = () => {
            if (interval) clearInterval(interval);
            interval = null;
            if (appState === 'active' && useRestTimerStore.getState().restTimerActive) {
                interval = setInterval(() => useRestTimerStore.getState().tickRestTimer(), 250);
            }
        };

        // A cold/remounted view must not replay an already expired alert.
        syncClock();
        const initialState = useRestTimerStore.getState();
        if (initialState.restTimerActive && initialState.restTimerEndTime !== null) {
            void notifications.replace(initialState.restTimerEndTime);
        }
        updateInterval();

        const unsubscribe = useRestTimerStore.subscribe((state, previous) => {
            if (state.restTimerActive && state.restTimerEndTime !== null && (
                !previous.restTimerActive || state.restTimerEndTime !== previous.restTimerEndTime
            )) {
                void notifications.replace(state.restTimerEndTime);
            } else if (!state.restTimerActive && state.timerCompletionReason === 'skipped') {
                void notifications.cancel();
            }

            if (previous.restTimerActive && !state.restTimerActive &&
                state.timerCompletionReason === 'expired' && appState === 'active' && !synchronizing) {
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            }
            // The OS owns expiry alerts. Do not cancel or send another notification
            // when a JS tick catches up after the app has been suspended.
            if (state.restTimerActive !== previous.restTimerActive) updateInterval();
        });

        const subscription = AppState.addEventListener('change', nextState => {
            const wasActive = appState === 'active';
            appState = nextState;
            if (nextState === 'active' && !wasActive) {
                syncClock();
                const state = useRestTimerStore.getState();
                if (state.restTimerActive && state.restTimerEndTime !== null) {
                    // Retry missing alarms after permission changes, preserving an
                    // existing alarm even when resuming very close to its deadline.
                    // Exact-alarm access changes apply on the next scheduled rest.
                    void notifications.ensureScheduled(state.restTimerEndTime);
                }
            }
            updateInterval();
        });

        return () => {
            unsubscribe();
            subscription.remove();
            if (interval) clearInterval(interval);
            void notifications.cancel();
        };
    }, []);
}
