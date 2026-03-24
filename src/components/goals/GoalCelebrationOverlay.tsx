/**
 * GoalCelebrationOverlay
 *
 * Global overlay that shows a celebratory toast when a goal is completed.
 * Reads from goalCelebrationStore's FIFO queue and auto-dismisses
 * after 4 seconds. Shows one celebration at a time.
 *
 * Mount once at the app root (App.tsx) so it's visible on any screen.
 */

import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    TouchableOpacity,
    Dimensions,
} from 'react-native';

import { colors, spacing, borderRadius, typography } from '../../theme';
import { useGoalCelebrationStore } from '../../stores/goalCelebrationStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOAST_WIDTH = SCREEN_WIDTH - spacing.lg * 2;
const AUTO_DISMISS_MS = 4000;

export default function GoalCelebrationOverlay() {
    const queue = useGoalCelebrationStore((s) => s.queue);
    const dismiss = useGoalCelebrationStore((s) => s.dismiss);

    const currentGoal = queue[0] ?? null;
    const slideAnim = useRef(new Animated.Value(-120)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (currentGoal) {
            // Slide in
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 80,
                    friction: 10,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();

            // Auto-dismiss after 4s
            timerRef.current = setTimeout(() => {
                handleDismiss();
            }, AUTO_DISMISS_MS);
        }

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [currentGoal?.id]);

    const handleDismiss = () => {
        if (timerRef.current) clearTimeout(timerRef.current);

        // Slide out
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: -120,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            dismiss();
            // Reset for next item
            slideAnim.setValue(-120);
            opacityAnim.setValue(0);
        });
    };

    if (!currentGoal) return null;

    const goalLabel = currentGoal.label
        ? `"${currentGoal.label}"`
        : `Target: ${currentGoal.targetValue}`;

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    transform: [{ translateY: slideAnim }],
                    opacity: opacityAnim,
                },
            ]}
        >
            <TouchableOpacity
                style={styles.toast}
                onPress={handleDismiss}
                activeOpacity={0.9}
            >
                <Text style={styles.emoji}>🏆</Text>
                <View style={styles.textContainer}>
                    <Text style={styles.title}>Goal Achieved!</Text>
                    <Text style={styles.subtitle} numberOfLines={1}>
                        {goalLabel}
                    </Text>
                </View>
                <Text style={styles.tapHint}>Tap to dismiss</Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 60,
        left: spacing.lg,
        right: spacing.lg,
        zIndex: 9999,
        elevation: 9999,
    },
    toast: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: '#f59e0b40',
        // Gold shadow
        shadowColor: '#f59e0b',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 12,
    },
    emoji: {
        fontSize: 32,
        marginRight: spacing.md,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.bold,
        color: '#f59e0b',
        marginBottom: 2,
    },
    subtitle: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
    },
    tapHint: {
        fontSize: typography.size.xs,
        color: colors.text.disabled,
        marginLeft: spacing.sm,
    },
});
