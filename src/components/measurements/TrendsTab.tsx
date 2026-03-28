/**
 * TrendsTab Component
 *
 * Displays measurement trends in two modes:
 * 1. Sparkline list — miniature SVG line charts for each visible metric
 * 2. Detail view — full LineChart for a selected metric with time range pills
 *
 * Sub-components are extracted to separate files:
 * - SparklineRow (with SparklineSVG) — sparkline list rows
 * - DetailChartView — expanded chart with overlay support
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
} from 'react-native';

import { colors, spacing, typography } from '../../theme';
import {
    getSparklineDataBatch,
    getVisibleMeasurementTypes,
    getActiveGoals,
} from '../../services';
import { getSettings } from '../../services/preferencesService';
import type { MeasurementType } from '../../models';
import type { WeightTrendIntent } from '../../models/widget';
import { deriveBodyweightIntent } from '../../utils/goalHelpers';

import SparklineRow, { SparklineRowData } from './SparklineRow';
import DetailChartView from './DetailChartView';

// ============================================================
// Main TrendsTab
// ============================================================

interface TrendsTabProps {
    /** If provided, auto-open the detail chart for this measurement type */
    autoSelectTypeId?: string;
}

export default function TrendsTab({ autoSelectTypeId }: TrendsTabProps) {
    const [sparklineRows, setSparklineRows] = useState<SparklineRowData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedType, setSelectedType] = useState<MeasurementType | null>(null);
    const [unitSystem, setUnitSystem] = useState('lbs');
    const [bwIntent, setBwIntent] = useState<WeightTrendIntent>('neutral');

    useEffect(() => {
        loadSparklines();
    }, []);

    const loadSparklines = useCallback(async () => {
        setLoading(true);
        const settings = await getSettings();
        setUnitSystem(settings.weightUnit);

        const [types, activeGoals] = await Promise.all([
            getVisibleMeasurementTypes(settings.visibleMeasurements),
            getActiveGoals(),
        ]);

        // Derive bodyweight goal intent (TD-027: shared helper)
        const intent = deriveBodyweightIntent(activeGoals);
        setBwIntent(intent);

        // PP-023: Single batch query instead of N separate calls
        const sparkMap = await getSparklineDataBatch(
            types.map(t => t.id),
            90,
        );

        const rows: SparklineRowData[] = types.map((type) => {
            const sparkData = sparkMap.get(type.id) ?? [];
            const unit = settings.weightUnit === 'kg' ? type.unitMetric : type.unitImperial;
            return {
                type,
                dataPoints: sparkData.map((d) => d.value),
                latestValue: sparkData.length > 0 ? sparkData[sparkData.length - 1].value : null,
                unit,
            };
        });

        setSparklineRows(rows);

        // Auto-select a measurement type if requested via deep link
        if (autoSelectTypeId) {
            const match = types.find((t) => t.id === autoSelectTypeId);
            if (match) {
                setSelectedType(match);
            }
        }

        setLoading(false);
    }, [autoSelectTypeId]);

    // Detail view for a selected metric
    if (selectedType) {
        return (
            <DetailChartView
                type={selectedType}
                unitSystem={unitSystem}
                onBack={() => setSelectedType(null)}
            />
        );
    }

    // Loading state
    if (loading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator color={colors.accent.primary} />
                <Text style={styles.loadingText}>Loading trends...</Text>
            </View>
        );
    }

    // Empty state
    if (sparklineRows.length === 0) {
        return (
            <View style={styles.empty}>
                <Text style={styles.emptyIcon}>📈</Text>
                <Text style={styles.emptyTitle}>No Data Yet</Text>
                <Text style={styles.emptySubtitle}>
                    Log some measurements in the Track tab to see trends here.
                </Text>
            </View>
        );
    }

    // Sparkline list
    return (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: spacing.xl }}>
            <Text style={styles.sectionTitle}>Last 90 Days</Text>
            {sparklineRows.map((row) => (
                <SparklineRow
                    key={row.type.id}
                    row={row}
                    trendIntent={row.type.id === 'bodyweight' ? bwIntent : 'neutral'}
                    onPress={() => setSelectedType(row.type)}
                />
            ))}
        </ScrollView>
    );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: spacing.sm,
    },
    loadingText: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
    },
    empty: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: spacing.md,
    },
    emptyTitle: {
        color: colors.text.primary,
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold as '700',
        marginBottom: spacing.sm,
    },
    emptySubtitle: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        textAlign: 'center',
        lineHeight: 20,
    },
    sectionTitle: {
        color: colors.text.secondary,
        fontSize: typography.size.xs,
        fontWeight: typography.weight.semibold as '600',
        letterSpacing: 0.5,
        marginHorizontal: spacing.lg,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
        textTransform: 'uppercase',
    },
});
