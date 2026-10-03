import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useRestTimerLifecycle } from '../../hooks/useRestTimerLifecycle';
import { requestNotificationPermissions } from '../../services/notificationService';

/** Mounted only after the startup overlay has left and onboarding is resolved. */
export default function StartupReadyEffects() {
    useRestTimerLifecycle();

    useEffect(() => {
        let requested = false;
        const request = () => {
            if (requested || (AppState.currentState && AppState.currentState !== 'active')) return;
            requested = true;
            void requestNotificationPermissions().catch(error => {
                console.warn('[App] Notification setup failed:', error);
            });
        };
        const subscription = AppState.addEventListener('change', nextState => {
            if (nextState === 'active') request();
        });
        request();
        return () => subscription.remove();
    }, []);

    return null;
}
