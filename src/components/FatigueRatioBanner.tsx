/**
 * Fatigue Ratio Banner
 *
 * Displays acute:chronic workload ratio with color-coded status.
 * Self-contained — fetches data on mount.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, spacing, borderRadius, typography } from '../theme';
import { getFatigueRatio } from '../services/exerciseAnalyticsService';
import { FatigueRatioResult, FatigueStatus } from '../models/analytics';

// Status display config
const STATUS_CONFIG: Record<FatigueStatus, {
    label: string;
    description: string;
    icon: keyof typeof MaterialIcons.glyphMap;
    color: string;
    bg: string;
}> = {
    light: {
        label: 'Light Week',
        description: 'Volume is below your recent average — a deload or rest week.',
        icon: 'spa',
        color: '#22c55e',
        bg: 'rgba(34, 197, 94, 0.12)',
    },
    normal: {
        label: 'Normal Load',
        description: 'Training volume is on track with your recent average.',
        icon: 'check-circle',
        color: colors.text.secondary,
        bg: colors.background.secondary,
    },
    high: {
        label: 'High Fatigue',
        description: 'Volume is significantly above average — monitor recovery.',
        icon: 'warning',
        color: '#f97316',
        bg: 'rgba(249, 115, 22, 0.12)',
    },
};

export default function FatigueRatioBanner() {
    const [data, setData] = useState<FatigueRatioResult | null>(null);

    useEffect(() => {
        let cancelled = false;
        getFatigueRatio().then((result) => {
            if (!cancelled) setData(result);
        });
        return () => { cancelled = true; };
    }, []);

    // Don't render until loaded, or if there's no data at all
    if (!data || (data.acute === 0 && data.chronic === 0)) return null;

    const config = STATUS_CONFIG[data.status];

    return (
        <View style={[styles.container, { backgroundColor: config.bg }]}>
            <View style={styles.header}>
                <MaterialIcons name={config.icon} size={20} color={config.color} />
                <Text style={[styles.statusLabel, { color: config.color }]}>
                    {config.label}
                </Text>
                <Text style={styles.ratioValue}>
                    {data.ratio.toFixed(2)}×
                </Text>
            </View>
            <Text style={styles.description}>{config.description}</Text>
            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                        {data.acute >= 1000
                            ? `${(data.acute / 1000).toFixed(1)}k`
                            : data.acute}
                    </Text>
                    <Text style={styles.statLabel}>This Week</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                        {data.chronic >= 1000
                            ? `${(data.chronic / 1000).toFixed(1)}k`
                            : data.chronic}
                    </Text>
                    <Text style={styles.statLabel}>4-Wk Avg</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: borderRadius.xl,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.xs,
    },
    statusLabel: {
        flex: 1,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
    },
    ratioValue: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    description: {
        fontSize: typography.size.xs,
        color: colors.text.secondary,
        lineHeight: typography.size.xs * 1.5,
        marginBottom: spacing.sm,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    statLabel: {
        fontSize: typography.size.xs,
        color: colors.text.secondary,
        marginTop: 2,
    },
    divider: {
        width: 1,
        height: 28,
        backgroundColor: colors.background.tertiary,
    },
});
