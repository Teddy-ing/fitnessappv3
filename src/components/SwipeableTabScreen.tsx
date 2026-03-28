/**
 * SwipeableTabScreen
 *
 * Wraps a tab screen's content to enable horizontal fling-to-navigate
 * between adjacent tabs. Uses Gesture.Fling() so it won't conflict
 * with vertical ScrollViews inside the screen content.
 *
 * Also applies a subtle slide-in entrance animation when the screen
 * becomes active (via tab change or swipe).
 */

import React, { useEffect, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector, Directions } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    runOnJS,
    Easing,
} from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';

const SLIDE_DISTANCE = 40; // How far the slide animation travels (subtle)
const ANIMATION_DURATION = 250;

interface SwipeableTabScreenProps {
    children: React.ReactNode;
    /** Navigate to the tab on the left (swipe right). Undefined if this is the leftmost tab. */
    onSwipeRight?: () => void;
    /** Navigate to the tab on the right (swipe left). Undefined if this is the rightmost tab. */
    onSwipeLeft?: () => void;
}

export default function SwipeableTabScreen({
    children,
    onSwipeRight,
    onSwipeLeft,
}: SwipeableTabScreenProps) {
    const isFocused = useIsFocused();
    const translateX = useSharedValue(0);
    const opacity = useSharedValue(1);

    // Entrance animation when this tab becomes focused
    useEffect(() => {
        if (isFocused) {
            // Reset and fade in
            translateX.value = 0;
            opacity.value = 0.85;
            opacity.value = withTiming(1, {
                duration: ANIMATION_DURATION,
                easing: Easing.out(Easing.cubic),
            });
        }
    }, [isFocused, translateX, opacity]);

    // Wrap navigation calls so they can be called from worklet via runOnJS
    const doSwipeRight = useCallback(() => {
        onSwipeRight?.();
    }, [onSwipeRight]);

    const doSwipeLeft = useCallback(() => {
        onSwipeLeft?.();
    }, [onSwipeLeft]);

    // Fling right → go to left tab
    const flingRight = Gesture.Fling()
        .direction(Directions.RIGHT)
        .enabled(!!onSwipeRight)
        .onEnd(() => {
            // Animate current screen sliding out to the right
            translateX.value = withTiming(SLIDE_DISTANCE, {
                duration: ANIMATION_DURATION / 2,
                easing: Easing.in(Easing.cubic),
            });
            opacity.value = withTiming(0.7, {
                duration: ANIMATION_DURATION / 2,
            });
            // Navigate on JS thread
            runOnJS(doSwipeRight)();
        });

    // Fling left → go to right tab
    const flingLeft = Gesture.Fling()
        .direction(Directions.LEFT)
        .enabled(!!onSwipeLeft)
        .onEnd(() => {
            translateX.value = withTiming(-SLIDE_DISTANCE, {
                duration: ANIMATION_DURATION / 2,
                easing: Easing.in(Easing.cubic),
            });
            opacity.value = withTiming(0.7, {
                duration: ANIMATION_DURATION / 2,
            });
            runOnJS(doSwipeLeft)();
        });

    const composed = Gesture.Race(flingLeft, flingRight);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
        opacity: opacity.value,
    }));

    return (
        <GestureDetector gesture={composed}>
            <Animated.View style={[styles.container, animatedStyle]}>
                {children}
            </Animated.View>
        </GestureDetector>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
