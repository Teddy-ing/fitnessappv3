/**
 * WidgetCard
 *
 * Shared card wrapper for all widget types. Handles sizing (square vs rectangle),
 * card styling, and tap interactions.
 */

import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';

interface WidgetCardProps {
    size: 'square' | 'rectangle';
    onPress?: () => void;
    children: React.ReactNode;
    style?: ViewStyle;
}

export default function WidgetCard({ size, onPress, children, style }: WidgetCardProps) {
    return (
        <TouchableOpacity
            style={[
                styles.card,
                size === 'square' ? styles.square : styles.rectangle,
                style,
            ]}
            onPress={onPress}
            activeOpacity={onPress ? 0.7 : 1}
            disabled={!onPress}
        >
            {children}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.glass.borderLight,
        padding: spacing.md,
        justifyContent: 'center',
    },
    square: {
        // Width is set by the parent grid via flex
    },
    rectangle: {
        width: '100%',
    },
});
