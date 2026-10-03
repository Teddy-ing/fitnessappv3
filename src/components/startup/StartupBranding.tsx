import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import IronJotMark from '../branding/IronJotMark';
import geometry from '../../../assets/branding/ironjot.geometry.json';

export const IRONJOT_STARTUP_DURATION = 2500;
const TITLE_WIDTH = 288;
const TITLE_REVEAL_START = 850 / IRONJOT_STARTUP_DURATION;
const TITLE_REVEAL_END = 1750 / IRONJOT_STARTUP_DURATION;

interface StartupBrandingProps {
    size: number;
    animated?: boolean;
    initialPose?: boolean;
    onAnimationComplete?: () => void;
}

/** The icon assembles first; the wordmark wipes on, then both briefly hold. */
export default function StartupBranding({
    size, animated = false, initialPose = false, onAnimationComplete,
}: StartupBrandingProps) {
    const progress = useRef(new Animated.Value(animated || initialPose ? 0 : 1)).current;
    const complete = useRef(onAnimationComplete);
    complete.current = onAnimationComplete;

    useEffect(() => {
        let active = true;
        progress.stopAnimation();
        if (!animated) {
            progress.setValue(initialPose ? 0 : 1);
            return;
        }
        progress.setValue(0);
        const sequence = Animated.timing(progress, {
            toValue: 1,
            duration: IRONJOT_STARTUP_DURATION,
            easing: Easing.linear,
            useNativeDriver: true,
        });
        sequence.start(({ finished }) => {
            if (active && finished) complete.current?.();
        });
        return () => {
            active = false;
            sequence.stop();
        };
    }, [animated, initialPose, progress]);

    const inputRange = [0, TITLE_REVEAL_START, TITLE_REVEAL_END, 1];
    const maskTranslation = progress.interpolate({
        inputRange, outputRange: [-TITLE_WIDTH, -TITLE_WIDTH, 0, 0], extrapolate: 'clamp',
    });
    const textTranslation = progress.interpolate({
        inputRange, outputRange: [TITLE_WIDTH, TITLE_WIDTH, 0, 0], extrapolate: 'clamp',
    });

    return (
        <View style={styles.container} pointerEvents="none" accessible={false}>
            <View style={[styles.titlePosition, { marginBottom: size / 2 + 24 }]}>
                <Animated.View style={[styles.titleMask, { transform: [{ translateX: maskTranslation }] }]}>
                    <Animated.View style={{ transform: [{ translateX: textTranslation }] }}>
                        <Text style={styles.title} allowFontScaling={false} accessible={false}>IronJot</Text>
                    </Animated.View>
                </Animated.View>
            </View>
            <IronJotMark size={size} animated={animated} initialPose={initialPose} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    titlePosition: { position: 'absolute', bottom: '50%', width: TITLE_WIDTH, height: 64 },
    // Opposing translations keep the text stationary while its clipping window
    // moves across it; both transforms run on the native animation driver.
    titleMask: { width: TITLE_WIDTH, height: 64, overflow: 'hidden' },
    title: {
        width: TITLE_WIDTH,
        color: geometry.cream,
        fontSize: 48,
        fontWeight: '800',
        lineHeight: 64,
        textAlign: 'center',
        letterSpacing: -1.5,
    },
});
