/**
 * PillRow
 *
 * Generic horizontally-scrolling pill selector.
 * Used for time bucket and chart range selection across analytics views.
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from 'react-native';

import { colors, spacing, borderRadius, typography } from '../../theme';

export default function PillRow<T extends string>({
    items,
    labels,
    selected,
    onSelect,
}: {
    items: T[];
    labels: Record<T, string>;
    selected: T;
    onSelect: (item: T) => void;
}) {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillRow}
        >
            {items.map((item) => (
                <TouchableOpacity
                    key={item}
                    style={[styles.pill, selected === item && styles.pillActive]}
                    onPress={() => onSelect(item)}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.pillText, selected === item && styles.pillTextActive]}>
                        {labels[item]}
                    </Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    pillRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
        marginBottom: spacing.sm,
    },
    pill: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        backgroundColor: colors.background.secondary,
    },
    pillActive: {
        backgroundColor: colors.accent.primary,
    },
    pillText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
    },
    pillTextActive: {
        color: colors.text.primary,
        fontWeight: typography.weight.semibold,
    },
});
