/**
 * SettingNavigationRow Component
 *
 * A reusable settings row with an icon, label, optional subtitle,
 * optional value display, and a chevron-right indicator.
 *
 * Used for navigation rows (e.g., links to external URLs, sub-screens,
 * or action rows like Rate App, Privacy Policy).
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../theme';

interface SettingNavigationRowProps {
    icon: keyof typeof MaterialIcons.glyphMap;
    iconColor?: string;
    label: string;
    subtitle?: string;
    value?: string;
    onPress: () => void;
}

export default function SettingNavigationRow({
    icon,
    iconColor = colors.text.primary,
    label,
    subtitle,
    value,
    onPress,
}: SettingNavigationRowProps) {
    return (
        <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.iconContainer}>
                <MaterialIcons name={icon} size={20} color={iconColor} />
            </View>
            <View style={styles.labelContainer}>
                <Text style={styles.label}>{label}</Text>
                {subtitle && (
                    <Text style={styles.subtitle}>{subtitle}</Text>
                )}
            </View>
            {value && (
                <Text style={styles.value}>{value}</Text>
            )}
            <MaterialIcons name="chevron-right" size={20} color={colors.text.secondary} />
        </TouchableOpacity>
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
    labelContainer: {
        flex: 1,
        paddingRight: spacing.sm,
    },
    label: {
        fontSize: typography.size.md,
        color: colors.text.primary,
    },
    subtitle: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        marginTop: 2,
    },
    value: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        marginRight: spacing.sm,
    },
});
