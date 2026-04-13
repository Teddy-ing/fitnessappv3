/**
 * SettingToggleRow Component
 *
 * A reusable settings row with an icon, label, optional subtitle,
 * and a Switch toggle on the right side.
 *
 * Used for binary on/off settings (e.g., Keep Awake, Show Exercise Media).
 */

import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../theme';

interface SettingToggleRowProps {
    icon: keyof typeof MaterialIcons.glyphMap;
    iconColor?: string;
    label: string;
    subtitle?: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    disabled?: boolean;
}

export default function SettingToggleRow({
    icon,
    iconColor = colors.text.primary,
    label,
    subtitle,
    value,
    onValueChange,
    disabled = false,
}: SettingToggleRowProps) {
    return (
        <View style={[styles.container, disabled && styles.containerDisabled]}>
            <View style={styles.iconContainer}>
                <MaterialIcons name={icon} size={20} color={iconColor} />
            </View>
            <View style={styles.labelContainer}>
                <Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text>
                {subtitle && (
                    <Text style={styles.subtitle}>{subtitle}</Text>
                )}
            </View>
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: colors.background.tertiary, true: colors.accent.primary }}
                disabled={disabled}
            />
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
    containerDisabled: {
        opacity: 0.5,
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
    labelDisabled: {
        color: colors.text.disabled,
    },
    subtitle: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        marginTop: 2,
    },
});
