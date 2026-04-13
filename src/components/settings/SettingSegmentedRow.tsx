/**
 * SettingSegmentedRow Component
 *
 * A reusable settings row with an icon, label, and an inline
 * segmented control (pill-shaped toggle) for selecting between options.
 *
 * Used for binary/multi-option selectors (e.g., lbs/kg, mi/km, Sun/Mon).
 * Pill-shaped track with accent-colored active pill.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../theme';

interface SegmentOption {
    key: string;
    label: string;
}

interface SettingSegmentedRowProps {
    icon: keyof typeof MaterialIcons.glyphMap;
    iconColor?: string;
    label: string;
    options: SegmentOption[];
    selectedKey: string;
    onSelect: (key: string) => void;
}

export default function SettingSegmentedRow({
    icon,
    iconColor = colors.text.primary,
    label,
    options,
    selectedKey,
    onSelect,
}: SettingSegmentedRowProps) {
    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                <MaterialIcons name={icon} size={20} color={iconColor} />
            </View>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.segmentedControl}>
                {options.map((opt) => (
                    <TouchableOpacity
                        key={opt.key}
                        style={[
                            styles.segment,
                            selectedKey === opt.key && styles.segmentActive,
                        ]}
                        onPress={() => onSelect(opt.key)}
                        activeOpacity={0.7}
                    >
                        <Text
                            style={[
                                styles.segmentText,
                                selectedKey === opt.key && styles.segmentTextActive,
                            ]}
                        >
                            {opt.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.xs,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: colors.background.tertiary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    label: {
        flex: 1,
        fontSize: typography.size.md,
        color: colors.text.primary,
    },
    segmentedControl: {
        flexDirection: 'row',
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.full,
        padding: 2,
    },
    segment: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
        borderRadius: borderRadius.full,
    },
    segmentActive: {
        backgroundColor: colors.accent.primary,
    },
    segmentText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.disabled,
    },
    segmentTextActive: {
        color: '#ffffff',
        fontWeight: typography.weight.semibold,
    },
});
