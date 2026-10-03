import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { OnboardingProfile } from '../../models/onboarding';
import { applyStoredOnboarding, getOnboardingProfile, shouldShowOnboarding } from '../../services/onboardingService';
import { seedPremadeSplits } from '../../services/premadeSplits';
import { invalidateWeightUnitCache } from '../../hooks/useWeightUnit';
import OnboardingScreen from '../../screens/OnboardingScreen';
import { spacing, createThemedStyles, useThemeColors } from '../../theme';
import { useStartup } from '../startup/StartupContext';

type GateState =
    | { status: 'loading' | 'ready' | 'error' }
    | { status: 'onboarding'; profile: OnboardingProfile | null };

/** Resolve the local profile before mounting the main app or requesting permissions. */
export default function OnboardingGate({ children, prepareApp }: {
    children: React.ReactNode;
    prepareApp?: () => Promise<void>;
}) {
    const styles = useStyles();
    const colors = useThemeColors();
    const [state, setState] = useState<GateState>({ status: 'loading' });
    const [attempt, setAttempt] = useState(0);
    const { onInitializationComplete } = useStartup();

    useEffect(() => {
        // Errors are a usable destination too: reveal the existing retry and
        // continue controls instead of leaving them behind the launch overlay.
        // The main app reports its own first-screen data readiness. Onboarding
        // and the recovery UI can be shown as soon as this gate resolves.
        if (state.status === 'onboarding' || state.status === 'error') onInitializationComplete();
    }, [state.status, onInitializationComplete]);

    useEffect(() => {
        let active = true;
        setState({ status: 'loading' });
        const load = async () => {
            await seedPremadeSplits();
            if (await applyStoredOnboarding()) invalidateWeightUnitCache();
            return getOnboardingProfile();
        };
        const initialize = async () => {
            // Restoration must settle even when preferences fail, so Continue
            // cannot race a late restoration and replace a newly started workout.
            const [preferences, preparation] = await Promise.allSettled([
                load(),
                Promise.resolve().then(() => prepareApp?.()),
            ]);
            if (preparation.status === 'rejected') throw preparation.reason;
            if (preferences.status === 'rejected') throw preferences.reason;
            return preferences.value;
        };
        initialize().then(profile => {
            if (active) setState(shouldShowOnboarding(profile)
                ? { status: 'onboarding', profile }
                : { status: 'ready' });
        }).catch(() => {
            if (active) setState({ status: 'error' });
        });
        return () => { active = false; };
    }, [attempt, prepareApp]);

    if (state.status === 'ready') return <>{children}</>;
    if (state.status === 'onboarding') {
        return <OnboardingScreen initialProfile={state.profile} onDone={() => {
            invalidateWeightUnitCache();
            setState({ status: 'ready' });
        }} />;
    }

    return (
        <SafeAreaView style={styles.container}>
            {state.status === 'loading' ? (
                <ActivityIndicator color={colors.accent.primary} size="large" accessibilityLabel="Loading preferences" />
            ) : (
                <View style={styles.message}>
                    <Text style={styles.title}>Preferences couldn’t be loaded</Text>
                    <Text style={styles.description}>Try again, or continue with your current settings. Setup will be checked again when you reopen the app.</Text>
                    <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={() => setAttempt(value => value + 1)}>
                        <Text style={styles.buttonText}>Try again</Text>
                    </TouchableOpacity>
                    <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={() => setState({ status: 'ready' })}>
                        <Text style={styles.buttonText}>Continue to app</Text>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}

const useStyles = createThemedStyles((colors) => ({
    container: { flex: 1, justifyContent: 'center', backgroundColor: colors.background.primary, padding: spacing.lg },
    message: { gap: spacing.md },
    title: { fontSize: 24, fontWeight: '700', color: colors.text.primary },
    description: { fontSize: 16, lineHeight: 24, color: colors.text.secondary },
    button: { minHeight: 48, justifyContent: 'center', alignItems: 'center', padding: spacing.md, borderRadius: 12, backgroundColor: colors.background.secondary },
    buttonText: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
}));
