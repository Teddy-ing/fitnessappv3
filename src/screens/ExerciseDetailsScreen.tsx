/**
 * Exercise Details Screen ("Master Guide")
 *
 * Comprehensive per-exercise reference with four tabs:
 * - About:   Form guide, instructions, persistent exercise notes
 * - History: Timeline of every session this exercise appeared in
 * - Charts:  Est. 1RM, Max Weight, Volume line/bar charts
 * - Records: Best weight at each rep count with calculated Est. 1RM
 *
 * Navigation paths:
 * - Path A: Analytics > Exercises tab > tap row (default: About tab)
 * - Path B: Active workout > info icon (default: About tab)
 * - Path C: Pinned Exercise widget deep-link (default: Charts tab)
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, spacing, borderRadius, typography } from '../theme';
import type { ProfileStackParamList } from '../navigation/AppNavigator';
import { navigateToTab } from '../navigation/navigationRef';
import AboutTab from '../components/exerciseDetails/AboutTab';
import HistoryTab from '../components/exerciseDetails/HistoryTab';
import ChartsTab from '../components/exerciseDetails/ChartsTab';
import RecordsTab from '../components/exerciseDetails/RecordsTab';

// ============================================================
// Types
// ============================================================

export type ExerciseDetailsTab = 'about' | 'history' | 'charts' | 'records';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ExerciseDetails'>;

// ============================================================
// Sub-components
// ============================================================

/** Top-level tab switcher matching AnalyticsScreen style */
function TabControl({
    activeTab,
    onTabChange,
}: {
    activeTab: ExerciseDetailsTab;
    onTabChange: (tab: ExerciseDetailsTab) => void;
}) {
    const tabs: { key: ExerciseDetailsTab; label: string }[] = [
        { key: 'about', label: 'About' },
        { key: 'history', label: 'History' },
        { key: 'charts', label: 'Charts' },
        { key: 'records', label: 'Records' },
    ];

    return (
        <View style={styles.tabControl}>
            {tabs.map((t) => (
                <TouchableOpacity
                    key={t.key}
                    style={[styles.tab, activeTab === t.key && styles.tabActive]}
                    onPress={() => onTabChange(t.key)}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>
                        {t.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

// ============================================================
// Main Screen
// ============================================================

export default function ExerciseDetailsScreen({ route, navigation }: Props) {
    const { exerciseId, exerciseName, initialTab, source } = route.params;
    const [activeTab, setActiveTab] = useState<ExerciseDetailsTab>(initialTab ?? 'about');
    const cameFromWorkout = source === 'workout';

    // Navigate back to the Workout tab (for workout-sourced navigation)
    const goBackToWorkout = useCallback(() => {
        navigateToTab('Workout');
    }, []);

    // Override header back button when opened from a workout
    useEffect(() => {
        if (cameFromWorkout) {
            navigation.setOptions({
                headerLeft: () => (
                    <TouchableOpacity onPress={goBackToWorkout} style={{ paddingRight: spacing.sm }}>
                        <Text style={{ color: colors.text.primary, fontSize: 28 }}>‹</Text>
                    </TouchableOpacity>
                ),
            });
        }
    }, [cameFromWorkout, navigation, goBackToWorkout]);

    // Android hardware back → return to workout instead of triggering discard dialog
    useEffect(() => {
        if (!cameFromWorkout) return;

        const handler = BackHandler.addEventListener('hardwareBackPress', () => {
            goBackToWorkout();
            return true; // Consume the event — don't propagate to WorkoutScreen's handler
        });

        return () => handler.remove();
    }, [cameFromWorkout, goBackToWorkout]);

    const tabContent = useMemo(() => {
        switch (activeTab) {
            case 'about':
                return <AboutTab exerciseId={exerciseId} />;
            case 'history':
                return <HistoryTab exerciseId={exerciseId} />;
            case 'charts':
                return <ChartsTab exerciseId={exerciseId} />;
            case 'records':
                return <RecordsTab exerciseId={exerciseId} />;
        }
    }, [activeTab, exerciseId]);

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <View style={styles.tabBarContainer}>
                <TabControl activeTab={activeTab} onTabChange={setActiveTab} />
            </View>
            {tabContent}
        </SafeAreaView>
    );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.primary,
    },
    tabBarContainer: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
        paddingBottom: spacing.sm,
    },

    // Tab control — matches AnalyticsScreen style
    tabControl: {
        flexDirection: 'row',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.xs,
    },
    tab: {
        flex: 1,
        paddingVertical: spacing.sm + 2,
        alignItems: 'center',
        borderRadius: borderRadius.md,
    },
    tabActive: {
        backgroundColor: colors.accent.primary,
    },
    tabText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.text.secondary,
    },
    tabTextActive: {
        color: colors.text.primary,
    },
});
