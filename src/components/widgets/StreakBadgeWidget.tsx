/**
 * Streak Badge Widget (Square)
 *
 * Shows the current consecutive ISO-week workout streak
 * with a flame icon and optional glow animation.
 * Tap → navigate to Calendar screen.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';

interface StreakBadgeWidgetProps {
    streak: number;
}

export default function StreakBadgeWidget({ streak }: StreakBadgeWidgetProps) {
    const isActive = streak > 0;

    return (
        <View style={styles.container}>
            <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
                <Text style={styles.fireEmoji}>🔥</Text>
            </View>
            <Text style={styles.streakNumber}>{streak}</Text>
            <Text style={styles.label}>week streak</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.background.tertiary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    iconContainerActive: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        // Subtle glow via shadow
        shadowColor: '#ef4444',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 4,
    },
    fireEmoji: {
        fontSize: 22,
    },
    streakNumber: {
        fontSize: typography.size.xxxl,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        lineHeight: typography.size.xxxl * 1.1,
    },
    label: {
        fontSize: typography.size.xs,
        color: colors.text.secondary,
        marginTop: 2,
    },
});
