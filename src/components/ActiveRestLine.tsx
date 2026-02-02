/**
 * ActiveRestLine Component
 * 
 * An inline rest timer that appears between completed sets.
 * Displays as a subtle animated "fuse" burning down from left to right.
 * 
 * Features:
 * - Subtle horizontal progress bar
 * - Time display on left
 * - Long-press anywhere to open adjustment popup
 * - 15s increment adjustments that ADD to remaining time
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Modal, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius, typography } from '../theme';

const TIME_INCREMENT = 15; // 15 second increments

interface ActiveRestLineProps {
    duration: number;                    // Total duration in seconds
    remaining: number;                   // Remaining time in seconds
    isActive: boolean;                   // Whether this timer is currently running
    onAdjustTime: (delta: number) => void;  // Called to add/subtract time (e.g., +15, -15)
    onSkip?: () => void;                 // Called when user skips the timer
}

export default function ActiveRestLine({
    duration,
    remaining,
    isActive,
    onAdjustTime,
    onSkip,
}: ActiveRestLineProps) {
    const progressAnim = useRef(new Animated.Value(1)).current;
    const [showAdjustModal, setShowAdjustModal] = useState(false);

    // Animate progress based on remaining time
    useEffect(() => {
        if (!isActive || duration <= 0) {
            progressAnim.setValue(1);
            return;
        }

        const progress = remaining / duration;

        // Animate to current progress over 1 second (smooth countdown)
        Animated.timing(progressAnim, {
            toValue: progress,
            duration: 1000,
            useNativeDriver: false, // width animation requires non-native
        }).start();
    }, [remaining, duration, isActive]);

    // Format seconds to MM:SS
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(Math.max(0, seconds) / 60);
        const secs = Math.max(0, seconds) % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Handle long press to show adjustment modal
    const handleLongPress = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setShowAdjustModal(true);
    }, []);

    // Handle time adjustment (add or subtract)
    const handleAdjust = useCallback((delta: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onAdjustTime(delta);
    }, [onAdjustTime]);

    // Close the modal
    const closeModal = useCallback(() => {
        setShowAdjustModal(false);
    }, []);

    // Calculate animated width
    const animatedWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    // Determine if timer is complete
    const isComplete = isActive && remaining <= 0;

    // Don't show if not active
    if (!isActive) {
        return null;
    }

    return (
        <>
            <Pressable
                style={styles.container}
                onLongPress={handleLongPress}
                delayLongPress={300}
            >
                {/* Time display */}
                <Text style={[styles.timeText, isComplete && styles.timeTextComplete]}>
                    {formatTime(remaining)}
                </Text>

                {/* Progress bar track */}
                <View style={styles.trackContainer}>
                    <View style={styles.track}>
                        <Animated.View
                            style={[
                                styles.progress,
                                { width: animatedWidth },
                                isComplete && styles.progressComplete
                            ]}
                        />
                    </View>
                </View>

                {/* Hold hint */}
                <Text style={styles.hintText}>hold</Text>

                {/* Skip button */}
                {onSkip && (
                    <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
                        <Text style={styles.skipText}>✕</Text>
                    </TouchableOpacity>
                )}
            </Pressable>

            {/* Time Adjustment Modal */}
            <Modal
                visible={showAdjustModal}
                transparent={true}
                animationType="fade"
                onRequestClose={closeModal}
            >
                <Pressable style={styles.modalOverlay} onPress={closeModal}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Adjust Rest Time</Text>

                        {/* Current remaining time */}
                        <Text style={styles.modalTime}>{formatTime(remaining)}</Text>

                        {/* Adjustment buttons */}
                        <View style={styles.adjustRow}>
                            <TouchableOpacity
                                style={styles.adjustButton}
                                onPress={() => handleAdjust(-TIME_INCREMENT)}
                            >
                                <Text style={styles.adjustButtonText}>-{TIME_INCREMENT}s</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.adjustButton}
                                onPress={() => handleAdjust(TIME_INCREMENT)}
                            >
                                <Text style={styles.adjustButtonText}>+{TIME_INCREMENT}s</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Larger increments */}
                        <View style={styles.adjustRow}>
                            <TouchableOpacity
                                style={[styles.adjustButton, styles.adjustButtonLarge]}
                                onPress={() => handleAdjust(-60)}
                            >
                                <Text style={styles.adjustButtonText}>-1:00</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.adjustButton, styles.adjustButtonLarge]}
                                onPress={() => handleAdjust(60)}
                            >
                                <Text style={styles.adjustButtonText}>+1:00</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Done button */}
                        <TouchableOpacity style={styles.doneButton} onPress={closeModal}>
                            <Text style={styles.doneButtonText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        marginVertical: spacing.xs,
    },

    // Time countdown on left
    timeText: {
        color: colors.accent.primary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        fontVariant: ['tabular-nums'],
        width: 40,
    },
    timeTextComplete: {
        color: colors.accent.success,
    },

    // Progress bar track
    trackContainer: {
        flex: 1,
        height: 20,
        justifyContent: 'center',
        marginHorizontal: spacing.sm,
    },
    track: {
        height: 3,
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.full,
        overflow: 'hidden',
    },
    progress: {
        height: '100%',
        backgroundColor: colors.accent.primary,
        borderRadius: borderRadius.full,
        opacity: 0.6, // Subtle styling
    },
    progressComplete: {
        backgroundColor: colors.accent.success,
        opacity: 1,
    },

    // Hint text
    hintText: {
        color: colors.text.disabled,
        fontSize: typography.size.xs,
        marginRight: spacing.xs,
    },

    // Skip button
    skipButton: {
        paddingHorizontal: spacing.xs,
        paddingVertical: spacing.xs,
    },
    skipText: {
        color: colors.text.disabled,
        fontSize: typography.size.sm,
    },

    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        minWidth: 250,
        alignItems: 'center',
    },
    modalTitle: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        marginBottom: spacing.sm,
    },
    modalTime: {
        color: colors.text.primary,
        fontSize: 48,
        fontWeight: typography.weight.bold,
        fontVariant: ['tabular-nums'],
        marginBottom: spacing.lg,
    },
    adjustRow: {
        flexDirection: 'row',
        marginBottom: spacing.md,
    },
    adjustButton: {
        backgroundColor: colors.background.tertiary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.lg,
        marginHorizontal: spacing.xs,
        minWidth: 80,
        alignItems: 'center',
    },
    adjustButtonLarge: {
        backgroundColor: colors.background.primary,
    },
    adjustButtonText: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
    },
    doneButton: {
        backgroundColor: colors.accent.primary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: borderRadius.lg,
        marginTop: spacing.sm,
    },
    doneButtonText: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
    },
});
