import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme';
import AboutTab from './AboutTab';
import HistoryTab from './HistoryTab';
import ChartsTab from './ChartsTab';
import RecordsTab from './RecordsTab';

export type ExerciseDetailsTab = 'about' | 'history' | 'charts' | 'records';

const tabs: { key: ExerciseDetailsTab; label: string }[] = [
    { key: 'about', label: 'About' },
    { key: 'history', label: 'History' },
    { key: 'charts', label: 'Charts' },
    { key: 'records', label: 'Records' },
];

/** Shared by the navigated guide and modal editors that must retain their drafts. */
export default function ExerciseDetailsContent({
    exerciseId,
    initialTab = 'about',
}: {
    exerciseId: string;
    initialTab?: ExerciseDetailsTab;
}) {
    const [activeTab, setActiveTab] = useState<ExerciseDetailsTab>(initialTab);

    return (
        <View style={styles.container}>
            <View style={styles.tabBarContainer}>
                <View style={styles.tabControl}>
                    {tabs.map(tab => (
                        <TouchableOpacity
                            key={tab.key}
                            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                            onPress={() => setActiveTab(tab.key)}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: activeTab === tab.key }}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
            {activeTab === 'about' && <AboutTab exerciseId={exerciseId} />}
            {activeTab === 'history' && <HistoryTab exerciseId={exerciseId} />}
            {activeTab === 'charts' && <ChartsTab exerciseId={exerciseId} />}
            {activeTab === 'records' && <RecordsTab exerciseId={exerciseId} />}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background.primary },
    tabBarContainer: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
        paddingBottom: spacing.sm,
    },
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
    tabActive: { backgroundColor: colors.accent.primary },
    tabText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.text.secondary,
    },
    tabTextActive: { color: colors.text.primary },
});
