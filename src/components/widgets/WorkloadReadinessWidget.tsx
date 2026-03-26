/**
 * Workload / Readiness Widget (Square)
 *
 * Shows the acute-to-chronic workload ratio (ACWR) with a color-coded
 * status indicator and trend arrow.
 *
 * Zones:
 * - < 0.8 → "Light" (blue) — under-training, detraining risk
 * - 0.8–1.3 → "Optimal" (green) — sweet spot
 * - > 1.3 → "High" (red) — overreaching, injury risk
 *
 * Tap → navigate to Analytics screen.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { FatigueRatioResult } from '../../models/analytics';

interface WorkloadReadinessWidgetProps {
    data: FatigueRatioResult;
}

const STATUS_CONFIG = {
    light: {
        label: 'Light',
        color: '#3b82f6',
        icon: 'trending-down' as const,
        bgColor: 'rgba(59, 130, 246, 0.15)',
    },
    normal: {
        label: 'Optimal',
        color: '#22c55e',
        icon: 'trending-flat' as const,
        bgColor: 'rgba(34, 197, 94, 0.15)',
    },
    high: {
        label: 'High',
        color: '#ef4444',
        icon: 'trending-up' as const,
        bgColor: 'rgba(239, 68, 68, 0.15)',
    },
};

export default function WorkloadReadinessWidget({ data }: WorkloadReadinessWidgetProps) {
    const config = STATUS_CONFIG[data.status];
    const hasData = data.acute > 0 || data.chronic > 0;

    if (!hasData) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>WORKLOAD</Text>
                <View style={styles.emptyContainer}>
                    <MaterialIcons name="speed" size={28} color={colors.text.disabled} />
                    <Text style={styles.emptyText}>No data yet</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>WORKLOAD</Text>

            <View style={styles.ratioRow}>
                <Text style={[styles.ratioValue, { color: config.color }]}>
                    {data.ratio.toFixed(2)}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
                    <MaterialIcons name={config.icon} size={14} color={config.color} />
                    <Text style={[styles.statusLabel, { color: config.color }]}>
                        {config.label}
                    </Text>
                </View>
            </View>

            <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>This week</Text>
                    <Text style={styles.detailValue}>
                        {formatVolume(data.acute)}
                    </Text>
                </View>
                <View style={styles.detailDivider} />
                <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Avg/week</Text>
                    <Text style={styles.detailValue}>
                        {formatVolume(data.chronic)}
                    </Text>
                </View>
            </View>
        </View>
    );
}

function formatVolume(v: number): string {
    if (v >= 10000) return `${(v / 1000).toFixed(0)}k`;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
    return Math.round(v).toString();
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
    ratioRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    ratioValue: {
        fontSize: typography.size.xxl,
        fontWeight: typography.weight.bold,
        marginRight: spacing.sm,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: 10,
    },
    statusLabel: {
        fontSize: 11,
        fontWeight: typography.weight.semibold,
        marginLeft: 3,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailItem: {
        flex: 1,
    },
    detailDivider: {
        width: 1,
        height: 24,
        backgroundColor: colors.glass.borderLight,
        marginHorizontal: spacing.sm,
    },
    detailLabel: {
        fontSize: 10,
        color: colors.text.disabled,
    },
    detailValue: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
        marginTop: 1,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: typography.size.sm,
        color: colors.text.disabled,
        marginTop: spacing.xs,
    },
});
