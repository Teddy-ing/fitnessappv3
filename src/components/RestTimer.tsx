/**
 * RestTimer Component
 * 
 * Floating overlay that displays the rest timer countdown.
 * Features:
 * - Large countdown visible from arm's length
 * - Quick adjust buttons (+30s, -30s)
 * - Skip button to dismiss early
 */

import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { useWorkoutStore } from '../stores';
import { colors, spacing, borderRadius, typography } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function RestTimer() {
    const {
        restTimerActive,
        restTimerRemaining,
        restTimerDuration,
        stopRestTimer,
        adjustRestTimer,
        tickRestTimer,
    } = useWorkoutStore();

    // Tick the timer every second
    useEffect(() => {
        if (!restTimerActive) return;

        const interval = setInterval(() => {
            tickRestTimer();
        }, 1000);

        return () => clearInterval(interval);
    }, [restTimerActive, tickRestTimer]);

    // Don't render if timer is not active
    if (!restTimerActive) return null;

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

const styles = StyleSheet.create({
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
});
