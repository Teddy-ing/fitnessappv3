/**
 * Weekly Wrap-Up Widget (Square)
 *
 * Shows a compact 2×2 grid of this week's key metrics:
 * Volume (lbs), Sets, Reps, Time (hrs).
 * Tap → navigate to Analytics screen.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export interface WeeklyData {
    volume: number;
    sets: number;
    reps: number;
    duration: number; // in seconds
}

interface WeeklyWrapUpWidgetProps {
    data: WeeklyData;
}

/** Format large numbers with comma separators */
function formatNumber(n: number): string {
    if (n >= 10000) {
        return Math.round(n).toLocaleString();
    }
    return Math.round(n).toString();
}

/** Format duration in seconds to hours string */
function formatHours(seconds: number): string {
    if (seconds === 0) return '0';
    const hours = seconds / 3600;
    if (hours < 1) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(hours * 10) / 10}h`;
}

export default function WeeklyWrapUpWidget({ data }: WeeklyWrapUpWidgetProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>THIS WEEK</Text>
            <View style={styles.grid}>
                <View style={styles.cell}>
                    <Text style={styles.cellValue}>{formatNumber(data.volume)}</Text>
                    <Text style={styles.cellLabel}>Volume</Text>
                </View>
                <View style={styles.cell}>
                    <Text style={styles.cellValue}>{formatNumber(data.sets)}</Text>
                    <Text style={styles.cellLabel}>Sets</Text>
                </View>
                <View style={styles.cell}>
                    <Text style={styles.cellValue}>{formatNumber(data.reps)}</Text>
                    <Text style={styles.cellLabel}>Reps</Text>
                </View>
                <View style={styles.cell}>
                    <Text style={styles.cellValue}>{formatHours(data.duration)}</Text>
                    <Text style={styles.cellLabel}>Time</Text>
                </View>
            </View>
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
    grid: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    cell: {
        width: '50%',
        paddingVertical: spacing.xs,
    },
    cellValue: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    cellLabel: {
        fontSize: typography.size.xs,
        color: colors.text.secondary,
        marginTop: 1,
    },
});
