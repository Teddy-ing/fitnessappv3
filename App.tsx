/**
 * Workout App
 * 
 * A free, privacy-first workout tracking app that adapts to you over time.
 */

import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppNavigator } from './src/navigation';
import { requestNotificationPermissions, clearAllNotifications } from './src/services';
import { ErrorBoundary } from './src/components';
import GoalCelebrationOverlay from './src/components/goals/GoalCelebrationOverlay';
import { useWorkoutStore } from './src/stores/workoutStore';
import { useRestTimerLifecycle } from './src/hooks/useRestTimerLifecycle';
import OnboardingGate from './src/components/onboarding/OnboardingGate';
import TutorialProvider from './src/components/tutorial/TutorialProvider';

function ReadyApp() {
  useEffect(() => {
    requestNotificationPermissions().catch(error => {
      console.warn('[App] Notification setup failed:', error);
    });
  }, []);

  return <TutorialProvider><AppNavigator /><GoalCelebrationOverlay /></TutorialProvider>;
}

export default function App() {
  const appState = useRef(AppState.currentState);
  useRestTimerLifecycle();

  // Restore in-progress workout on app start. OnboardingGate prepares the starter library.
  useEffect(() => {
    useWorkoutStore.getState().restoreWorkout();
  }, []);

  // Clear notifications when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to foreground - clear all notifications
        clearAllNotifications();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <ErrorBoundary fallback="screen" label="App">
          <OnboardingGate><ReadyApp /></OnboardingGate>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
