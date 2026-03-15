/**
 * Analytics Screen
 *
 * Hub for workout analytics with three tabs:
 * - Workouts: Macro-level analytics with dual-axis controller and bar chart
 * - Breakdown: Muscle group distribution
 * - Exercises: Per-exercise analytics with search and filtering
 *
 * Accessed from ProfileScreen → stack navigation push.
 */

import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, borderRadius, typography } from '../theme';
import MacroAnalyticsView from '../components/analytics/MacroAnalyticsView';
import BreakdownView from '../components/analytics/BreakdownView';
import ExerciseListView from '../components/analytics/ExerciseListView';

// ============================================================
// Types
// ============================================================

type AnalyticsTab = 'workouts' | 'breakdown' | 'exercises';

// ============================================================
// Sub-components
// ============================================================

/** Top-level tab switcher: Workouts | Breakdown | Exercises */
function TabControl({
    activeTab,
    onTabChange,
}: {
    activeTab: AnalyticsTab;
    onTabChange: (tab: AnalyticsTab) => void;
}) {
    const tabs: { key: AnalyticsTab; label: string }[] = [
        { key: 'workouts', label: 'Workouts' },
        { key: 'breakdown', label: 'Breakdown' },
        { key: 'exercises', label: 'Exercises' },
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

export default function AnalyticsScreen() {
    const [activeTab, setActiveTab] = useState<AnalyticsTab>('workouts');

    const tabHeader = useMemo(() => (
        <TabControl activeTab={activeTab} onTabChange={setActiveTab} />
    ), [activeTab]);

    // PP-004 fix: Exercises tab uses FlatList (owns its own scrolling),
    // other tabs use ScrollView since they don't need virtualization.
    if (activeTab === 'exercises') {
        return (
            <SafeAreaView style={styles.container} edges={['bottom']}>
                <ExerciseListView ListHeaderComponent={tabHeader} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <TabControl activeTab={activeTab} onTabChange={setActiveTab} />

                {activeTab === 'workouts' && <MacroAnalyticsView />}
                {activeTab === 'breakdown' && <BreakdownView />}
            </ScrollView>
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.md,
        paddingBottom: spacing.md,
    },

    // Tab control
    tabControl: {
        flexDirection: 'row',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.xs,
        marginBottom: spacing.lg,
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
