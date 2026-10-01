import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { OnboardingProfile } from '../../models/onboarding';
import { applyStoredOnboarding, getOnboardingProfile, shouldShowOnboarding } from '../../services/onboardingService';
import { seedPremadeSplits } from '../../services/premadeSplits';
import { invalidateWeightUnitCache } from '../../hooks/useWeightUnit';
import OnboardingScreen from '../../screens/OnboardingScreen';
import { colors, spacing } from '../../theme';

type GateState =
    | { status: 'loading' | 'ready' | 'error' }
    | { status: 'onboarding'; profile: OnboardingProfile | null };

/** Resolve the local profile before mounting the main app or requesting permissions. */
export default function OnboardingGate({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<GateState>({ status: 'loading' });
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let active = true;
        setState({ status: 'loading' });
        const load = async () => {
            await seedPremadeSplits();
            if (await applyStoredOnboarding()) invalidateWeightUnitCache();
            return getOnboardingProfile();
        };
        load().then(profile => {
            if (active) setState(shouldShowOnboarding(profile)
                ? { status: 'onboarding', profile }
                : { status: 'ready' });
        }).catch(() => {
            if (active) setState({ status: 'error' });
        });
        return () => { active = false; };
    }, [attempt]);

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

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', backgroundColor: colors.background.primary, padding: spacing.lg },
    message: { gap: spacing.md },
    title: { fontSize: 24, fontWeight: '700', color: colors.text.primary },
    description: { fontSize: 16, lineHeight: 24, color: colors.text.secondary },
    button: { minHeight: 48, justifyContent: 'center', alignItems: 'center', padding: spacing.md, borderRadius: 12, backgroundColor: colors.background.secondary },
    buttonText: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
});
