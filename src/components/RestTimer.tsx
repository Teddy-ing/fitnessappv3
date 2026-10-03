/**
 * RestTimer Component
 * 
 * Floating overlay that displays the rest timer countdown.
 * Native alarm scheduling and the foreground clock live at the app root.
 * 
 * Features:
 * - Large countdown visible from arm's length
 * - Quick adjust buttons (+30s, -30s)
 * - Skip button to dismiss early
 * - Continues running when screen is off
 * - Auto-starts when a set is completed (via lastCompletedSet signal)
 * - Fires haptics and notifications when timer reaches 0
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, AppState, AppStateStatus } from 'react-native';
import { useWorkoutStore } from '../stores';
import { useRestTimerStore } from '../stores/restTimerStore';
import { createThemedStyles, spacing, borderRadius, typography } from '../theme';

interface RestTimerProps {
    autoStartRestTimer?: boolean;
    defaultRestTime?: number;
}

export default function RestTimer({
    autoStartRestTimer = true,
    defaultRestTime = 120,
}: RestTimerProps) {
    const styles = useStyles();
    // PP-009 fix: Fine-grained selectors to avoid full-store subscription
    const restTimerActive = useRestTimerStore(s => s.restTimerActive);
    const restTimerRemaining = useRestTimerStore(s => s.restTimerRemaining);
    const restTimerDuration = useRestTimerStore(s => s.restTimerDuration);
    const stopRestTimer = useRestTimerStore(s => s.stopRestTimer);
    const adjustRestTimer = useRestTimerStore(s => s.adjustRestTimer);
    const startRestTimer = useRestTimerStore(s => s.startRestTimer);

    // Watch the workout store's completion signal for auto-start
    const lastCompletedSet = useWorkoutStore(s => s.lastCompletedSet);
    const [isInForeground, setIsInForeground] = React.useState(AppState.currentState === 'active');

    // Auto-start timer when a set is completed (gated by setting)
    // Returning to the workout must not restart the last completed set's timer.
    const prevTimestamp = useRef<number | null>(lastCompletedSet?.timestamp ?? null);
    useEffect(() => {
        if (!lastCompletedSet) return;
        if (lastCompletedSet.timestamp === prevTimestamp.current) return;
        prevTimestamp.current = lastCompletedSet.timestamp;

        // Only auto-start if the setting is enabled
        if (!autoStartRestTimer) return;

        // Check if exercise has a custom rest time set in the store,
        // otherwise fall back to the user's configured default
        const { exerciseRestTimes } = useRestTimerStore.getState();
        const customTime = exerciseRestTimes[lastCompletedSet.exerciseId];
        const restDuration = customTime ?? defaultRestTime;
        startRestTimer(restDuration, lastCompletedSet.exerciseId, lastCompletedSet.setId);

    }, [lastCompletedSet, autoStartRestTimer, defaultRestTime, startRestTimer]);

    // Handle app state changes
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            setIsInForeground(nextAppState === 'active');
        });

        return () => {
            subscription.remove();
        };
    }, []);

    // Don't render if timer is not active OR if app is in foreground
    // (inline timers handle the foreground display now)
    if (!restTimerActive || isInForeground) return null;

    // Format time as MM:SS
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Calculate progress (0 to 1)
    const progress = restTimerDuration > 0
        ? (restTimerDuration - restTimerRemaining) / restTimerDuration
        : 0;

    return (
        <View style={styles.container}>
            <View style={styles.timerCard}>
                {/* Header */}
                <Text style={styles.label}>REST TIMER</Text>

                {/* Countdown */}
                <Text style={styles.countdown}>{formatTime(restTimerRemaining)}</Text>

                {/* Progress bar */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <View
                            style={[
                                styles.progressFill,
                                { width: `${progress * 100}%` }
                            ]}
                        />
                    </View>
                </View>

                {/* Adjust buttons */}
                <View style={styles.adjustButtons}>
                    <TouchableOpacity
                        style={styles.adjustButton}
                        onPress={() => adjustRestTimer(-30)}
                    >
                        <Text style={styles.adjustButtonText}>-30s</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.adjustButton}
                        onPress={() => adjustRestTimer(30)}
                    >
                        <Text style={styles.adjustButtonText}>+30s</Text>
                    </TouchableOpacity>
                </View>

                {/* Skip button */}
                <TouchableOpacity
                    style={styles.skipButton}
                    onPress={stopRestTimer}
                >
                    <Text style={styles.skipButtonText}>Skip Rest</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const useStyles = createThemedStyles((colors) => ({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.lg,
    },
    timerCard: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.accent.primary,
        shadowColor: colors.accent.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },

    // Label
    label: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        letterSpacing: 1,
        marginBottom: spacing.sm,
    },

    // Countdown
    countdown: {
        color: colors.text.primary,
        fontSize: 64,
        fontWeight: typography.weight.bold,
        fontVariant: ['tabular-nums'],
    },

    // Progress bar
    progressContainer: {
        width: '100%',
        marginTop: spacing.md,
        marginBottom: spacing.lg,
    },
    progressBar: {
        height: 6,
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.full,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.accent.primary,
        borderRadius: borderRadius.full,
    },

    // Adjust buttons
    adjustButtons: {
        flexDirection: 'row',
        marginBottom: spacing.md,
    },
    adjustButton: {
        backgroundColor: colors.background.tertiary,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.lg,
        marginHorizontal: spacing.sm,
    },
    adjustButtonText: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
    },

    // Skip button
    skipButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
    },
    skipButtonText: {
        color: colors.accent.error,
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
    },
}));
