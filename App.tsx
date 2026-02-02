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

export default function App() {
  const appState = useRef(AppState.currentState);

  // Request notification permissions and seed premade splits on app start
  useEffect(() => {
    requestNotificationPermissions();
    seedPremadeSplits();
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
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
