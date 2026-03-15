/**
 * MetricSelector
 *
 * Segmented control for choosing a workout metric (Volume, Sets, Reps, Duration).
 * Used by MacroAnalyticsView and BreakdownView.
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';

import { colors, spacing, borderRadius, typography } from '../../theme';
import { MetricType, METRIC_LABELS } from '../../models/analytics';

const ALL_METRICS: MetricType[] = ['volume', 'sets', 'reps', 'duration'];

export default function MetricSelector({
    selected,
    onSelect,
    items = ALL_METRICS,
}: {
    selected: MetricType;
    onSelect: (m: MetricType) => void;
    /** Subset of metrics to show (defaults to all 4) */
    items?: MetricType[];
}) {
    return (
        <View style={styles.segmentedControl}>
            {items.map((m) => (
                <TouchableOpacity
                    key={m}
                    style={[styles.segment, selected === m && styles.segmentActive]}
                    onPress={() => onSelect(m)}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.segmentText, selected === m && styles.segmentTextActive]}>
                        {METRIC_LABELS[m]}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    segmentedControl: {
        flexDirection: 'row',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.md,
        padding: spacing.xs / 2,
        marginBottom: spacing.md,
    },
    segment: {
        flex: 1,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        borderRadius: borderRadius.sm + 2,
    },
    segmentActive: {
        backgroundColor: colors.background.tertiary,
    },
    segmentText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
    },
    segmentTextActive: {
        color: colors.text.primary,
        fontWeight: typography.weight.semibold,
    },
});
