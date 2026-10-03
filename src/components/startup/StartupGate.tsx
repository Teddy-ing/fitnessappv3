import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, BackHandler, Platform, StyleSheet, View } from 'react-native';
import { IRONJOT_BACKGROUND } from '../branding/IronJotMark';
import StartupBranding, { IRONJOT_STARTUP_DURATION } from './StartupBranding';
import { StartupContext } from './StartupContext';
import { dismissNativeSplash } from './nativeSplash';
import { startupSession, type StartupSession } from './startupSession';

interface StartupGateProps {
    children: React.ReactNode;
    session?: StartupSession;
}

/** Keep real initialization and the one-time launch animation concurrent. */
export default function StartupGate({ children, session = startupSession }: StartupGateProps) {
    const [initialized, setInitialized] = useState(false);
    const [laidOut, setLaidOut] = useState(false);
    const [nativeDismissed, setNativeDismissed] = useState(false);
    const [motionAllowed, setMotionAllowed] = useState<boolean | null>(null);
    const [animationDone, setAnimationDone] = useState(false);
    const [animating, setAnimating] = useState(false);
    const claimed = useRef<boolean | null>(null);
    const finished = useRef(false);

    const finishAnimation = useCallback(() => {
        finished.current = true;
        setAnimating(false);
        setAnimationDone(true);
    }, []);
    const onInitializationComplete = useCallback(() => setInitialized(true), []);

    useEffect(() => {
        let active = true;
        // An effect-local claim would replay under StrictMode's effect remount.
        if (claimed.current === null) claimed.current = session.claimAnimation();
        if (!claimed.current || (AppState.currentState && AppState.currentState !== 'active')) {
            finishAnimation();
        }

        const stateSubscription = AppState.addEventListener('change', nextState => {
            // An interrupted launch is consumed. Returning to the app must show
            // the final pose or app content, never restart the assembly.
            if (nextState !== 'active') finishAnimation();
        });
        const motionSubscription = AccessibilityInfo.addEventListener('reduceMotionChanged', reduced => {
            if (reduced) finishAnimation();
            if (active) setMotionAllowed(!reduced);
        });
        const applyMotionPreference = (reduced: boolean) => {
            if (!active) return;
            if (reduced) finishAnimation();
            setMotionAllowed(!reduced);
        };
        // If the native accessibility query cannot answer, use the static mark
        // instead of holding the native splash or assuming motion is acceptable.
        const preferenceFallback = setTimeout(() => applyMotionPreference(true), 500);
        void AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
            clearTimeout(preferenceFallback);
            applyMotionPreference(reduced);
        }).catch(() => {
            clearTimeout(preferenceFallback);
            applyMotionPreference(true);
        });

        return () => {
            active = false;
            clearTimeout(preferenceFallback);
            stateSubscription.remove();
            motionSubscription.remove();
        };
    }, [finishAnimation, session]);

    useEffect(() => {
        if (!laidOut || motionAllowed === null) return;
        let active = true;
        void dismissNativeSplash().then(() => {
            if (!active) return;
            setNativeDismissed(true);
            if (!finished.current && motionAllowed && claimed.current) setAnimating(true);
        });
        return () => { active = false; };
    }, [laidOut, motionAllowed]);

    useEffect(() => {
        if (!animating) return;
        // The full sequence calls back at 2500ms. Missing/interrupted native
        // animation callbacks must not strand a ready app behind the overlay.
        const deadline = setTimeout(finishAnimation, IRONJOT_STARTUP_DURATION + 200);
        return () => clearTimeout(deadline);
    }, [animating, finishAnimation]);

    const visible = !initialized || !animationDone || !nativeDismissed;
    useEffect(() => {
        if (!visible) return;
        const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
        return () => subscription.remove();
    }, [visible]);

    const context = useMemo(() => ({
        isComplete: !visible,
        onInitializationComplete,
    }), [visible, onInitializationComplete]);

    return (
        <StartupContext.Provider value={context}>
            <View style={styles.container}>
                <View
                    testID="startup-content"
                    style={styles.container}
                    pointerEvents={visible ? 'none' : 'auto'}
                    accessibilityElementsHidden={visible}
                    importantForAccessibility={visible ? 'no-hide-descendants' : 'auto'}
                >
                    {children}
                </View>
                {visible && (
                    <View
                        testID="startup-overlay"
                        style={styles.overlay}
                        onLayout={() => setLaidOut(true)}
                        accessible
                        accessibilityLabel="IronJot is starting"
                        accessibilityViewIsModal
                    >
                        <StartupBranding
                            size={Platform.OS === 'android' ? 160 : 240}
                            animated={animating}
                            initialPose={!animationDone && !animating}
                            onAnimationComplete={finishAnimation}
                        />
                    </View>
                )}
            </View>
        </StartupContext.Provider>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: IRONJOT_BACKGROUND,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
});
