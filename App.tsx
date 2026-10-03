/**
 * IronJot
 * 
 * A free, privacy-first workout tracking app that adapts to you over time.
 */

import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppNavigator } from './src/navigation';
import { clearAllNotifications } from './src/services';
import { ErrorBoundary } from './src/components';
import GoalCelebrationOverlay from './src/components/goals/GoalCelebrationOverlay';
import { useWorkoutStore } from './src/stores/workoutStore';
import OnboardingGate from './src/components/onboarding/OnboardingGate';
import TutorialProvider from './src/components/tutorial/TutorialProvider';
import StartupGate from './src/components/startup/StartupGate';
import StartupReadyEffects from './src/components/startup/StartupReadyEffects';
import { useStartup } from './src/components/startup/StartupContext';
import { startupSession } from './src/components/startup/startupSession';
import { dismissNativeSplash } from './src/components/startup/nativeSplash';
import AppThemeProvider from './src/components/theme/AppThemeProvider';

const prepareApp = () => startupSession.prepare(() => useWorkoutStore.getState().restoreWorkout());

function ReadyApp() {
  const { isComplete } = useStartup();

  return <TutorialProvider>
    <AppNavigator />
    <GoalCelebrationOverlay />
    {isComplete && <StartupReadyEffects />}
  </TutorialProvider>;
}

export default function App() {
  const appState = useRef(AppState.currentState);

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
        <ErrorBoundary fallback="screen" label="App" onError={() => { void dismissNativeSplash(); }}>
          <StartupGate>
            <AppThemeProvider>
              <OnboardingGate prepareApp={prepareApp}><ReadyApp /></OnboardingGate>
            </AppThemeProvider>
          </StartupGate>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
