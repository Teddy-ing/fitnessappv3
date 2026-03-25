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
import { requestNotificationPermissions, clearAllNotifications, seedPremadeSplits } from './src/services';
import { ErrorBoundary } from './src/components';
import GoalCelebrationOverlay from './src/components/goals/GoalCelebrationOverlay';
import { useWorkoutStore } from './src/stores/workoutStore';

export default function App() {
  const appState = useRef(AppState.currentState);

  // Request notification permissions, seed premade splits, and restore in-progress workout on app start
  useEffect(() => {
    requestNotificationPermissions();
    seedPremadeSplits();
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
          <AppNavigator />
          <GoalCelebrationOverlay />
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
