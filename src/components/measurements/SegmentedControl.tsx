/**
 * SegmentedControl Component
 *
 * Pill-shaped tab selector used at the top of the Measurements screen.
 * Generic enough to be reused elsewhere if needed.
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';

import { colors, spacing, borderRadius, typography } from '../../theme';

// ============================================================
// Component
// ============================================================

interface SegmentedControlProps<T extends string> {
    tabs: { id: T; label: string }[];
    activeTab: T;
    onTabChange: (tab: T) => void;
}

export default function SegmentedControl<T extends string>({
    tabs,
    activeTab,
    onTabChange,
}: SegmentedControlProps<T>) {
    return (
        <View style={styles.container}>
            {tabs.map((tab) => {
                const isActive = tab.id === activeTab;
                return (
                    <TouchableOpacity
                        key={tab.id}
                        style={[styles.tab, isActive && styles.activeTab]}
                        onPress={() => onTabChange(tab.id)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.xl,
        padding: 3,
        marginHorizontal: spacing.lg,
        marginTop: spacing.md,
        marginBottom: spacing.lg,
    },
    tab: {
        flex: 1,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.xl - 3,
        alignItems: 'center',
    },
    activeTab: {
        backgroundColor: colors.accent.primary,
    },
    tabText: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium as '500',
    },
    activeTabText: {
        color: colors.text.primary,
        fontWeight: typography.weight.semibold as '600',
    },
});
