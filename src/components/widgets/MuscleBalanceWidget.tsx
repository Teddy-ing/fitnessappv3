/**
 * Muscle Balance Widget (Square)
 *
 * Shows a simplified donut-style breakdown of volume by muscle group.
 * Displays the top 5 muscle groups as horizontal bars with percentages.
 * Tap → navigate to Analytics screen.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { MuscleDistributionPoint } from '../../models/analytics';

interface MuscleBalanceWidgetProps {
    data: MuscleDistributionPoint[];
}

/** Color palette for muscle groups */
const MUSCLE_COLORS = [
    '#a855f7', // purple
    '#3b82f6', // blue
    '#22c55e', // green
    '#f59e0b', // amber
    '#ef4444', // red
];

/** Capitalize first letter */
function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function MuscleBalanceWidget({ data }: MuscleBalanceWidgetProps) {
    const { topMuscles, maxValue } = useMemo(() => {
        const top = data.slice(0, 5);
        const max = top.length > 0 ? top[0].value : 1;
        return { topMuscles: top, maxValue: max };
    }, [data]);

    if (topMuscles.length === 0) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>MUSCLE BALANCE</Text>
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No data yet</Text>
                </View>
            </View>
        );
    }

    // Compute total for percentages
    const total = data.reduce((sum, d) => sum + d.value, 0);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>MUSCLE BALANCE</Text>
            {topMuscles.map((muscle, index) => {
                const pct = total > 0 ? Math.round((muscle.value / total) * 100) : 0;
                const barWidth = maxValue > 0 ? (muscle.value / maxValue) * 100 : 0;
                const barColor = MUSCLE_COLORS[index % MUSCLE_COLORS.length];

                return (
                    <View key={muscle.muscleGroup} style={styles.row}>
                        <Text style={styles.muscleLabel} numberOfLines={1}>
                            {capitalize(muscle.muscleGroup)}
                        </Text>
                        <View style={styles.barContainer}>
                            <View
                                style={[
                                    styles.bar,
                                    { width: `${barWidth}%`, backgroundColor: barColor },
                                ]}
                            />
                        </View>
                        <Text style={styles.pctLabel}>{pct}%</Text>
                    </View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    title: {
        fontSize: 10,
        fontWeight: typography.weight.bold,
        color: colors.text.secondary,
        letterSpacing: 0.5,
        marginBottom: spacing.sm,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    muscleLabel: {
        fontSize: 10,
        color: colors.text.secondary,
        width: 48,
    },
    barContainer: {
        flex: 1,
        height: 8,
        backgroundColor: colors.background.tertiary,
        borderRadius: 4,
        marginHorizontal: spacing.xs,
        overflow: 'hidden',
    },
    bar: {
        height: '100%',
        borderRadius: 4,
    },
    pctLabel: {
        fontSize: 10,
        color: colors.text.secondary,
        width: 28,
        textAlign: 'right',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: typography.size.sm,
        color: colors.text.disabled,
    },
});
