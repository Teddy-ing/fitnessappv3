/**
 * Records Tab — Exercise Details
 *
 * Best weight at each rep count (1RM through 12+RM) with calculated
 * Epley estimated 1RM. Highlights the row with the highest Est. 1RM.
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
} from 'react-native';

import { colors, spacing, borderRadius, typography } from '../../theme';
import { getBestWeightForReps } from '../../services/exerciseAnalyticsService';
import { BestWeightForRep } from '../../models/analytics';
import { useWeightUnit } from '../../hooks/useWeightUnit';
import { computeEpley1RM } from '../../utils/formulas';

// ============================================================
// Types
// ============================================================

interface RecordRow extends BestWeightForRep {
    est1rm: number;
    _formattedDate: string;
}

// ============================================================
// Main Tab Component
// ============================================================

interface RecordsTabProps {
    exerciseId: string;
}

export default function RecordsTab({ exerciseId }: RecordsTabProps) {
    const [records, setRecords] = useState<RecordRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [bestEstIndex, setBestEstIndex] = useState(-1);
    const weightUnit = useWeightUnit();

    useEffect(() => {
        let cancelled = false;
        setLoading(true);

        getBestWeightForReps(exerciseId).then((data) => {
            if (cancelled) return;

            const rows: RecordRow[] = data.map((r) => ({
                ...r,
                est1rm: computeEpley1RM(r.weight, r.reps),
                _formattedDate: new Date(r.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                }),
            }));

            // Find index of row with highest Est. 1RM
            let bestIdx = -1;
            let bestValue = 0;
            rows.forEach((r, i) => {
                if (r.est1rm > bestValue) {
                    bestValue = r.est1rm;
                    bestIdx = i;
                }
            });

            setRecords(rows);
            setBestEstIndex(bestIdx);
            setLoading(false);
        });

        return () => { cancelled = true; };
    }, [exerciseId]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accent.primary} />
                <Text style={styles.loadingText}>Loading records...</Text>
            </View>
        );
    }

    if (records.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>No Records Yet</Text>
                <Text style={styles.emptySubtitle}>
                    Complete a workout with this exercise to see your records.
                </Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.tableCard}>
                {/* Header */}
                <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderCell, styles.repsCol]}>Reps</Text>
                    <Text style={[styles.tableHeaderCell, styles.weightCol]}>Best Weight</Text>
                    <Text style={[styles.tableHeaderCell, styles.estCol]}>Est. 1RM</Text>
                    <Text style={[styles.tableHeaderCell, styles.dateCol]}>Date</Text>
                </View>

                {/* Rows */}
                {records.map((row, index) => {
                    const isBest = index === bestEstIndex;
                    return (
                        <View
                            key={row.reps}
                            style={[
                                styles.tableRow,
                                isBest && styles.tableRowBest,
                            ]}
                        >
                            <Text style={[styles.tableCell, styles.repsCol, isBest && styles.tableCellBest]}>
                                {row.reps}
                            </Text>
                            <Text style={[styles.tableCell, styles.weightCol, styles.tableCellBold]}>
                                {row.weight} {weightUnit}
                            </Text>
                            <Text style={[styles.tableCell, styles.estCol, isBest && styles.tableCellBest]}>
                                {row.est1rm} {weightUnit}
                            </Text>
                            <Text style={[styles.tableCell, styles.dateCol]}>
                                {row._formattedDate}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </ScrollView>
    );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.md,
        paddingBottom: spacing.xxl,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    loadingText: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
        gap: spacing.sm,
    },
    emptyTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        color: colors.text.secondary,
    },
    emptySubtitle: {
        fontSize: typography.size.sm,
        color: colors.text.disabled,
        textAlign: 'center',
    },

    // Table
    tableCard: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.xl,
        padding: spacing.md,
    },
    tableHeader: {
        flexDirection: 'row',
        paddingBottom: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.background.tertiary,
        marginBottom: spacing.xs,
    },
    tableHeaderCell: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.semibold,
        color: colors.text.secondary,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: spacing.xs + 2,
        borderRadius: borderRadius.md,
    },
    tableRowBest: {
        backgroundColor: `${colors.accent.primary}15`,
        borderWidth: 1,
        borderColor: `${colors.accent.primary}40`,
        marginHorizontal: -spacing.xs,
        paddingHorizontal: spacing.xs,
    },
    tableCell: {
        fontSize: typography.size.sm,
        color: colors.text.primary,
    },
    tableCellBold: {
        fontWeight: typography.weight.semibold,
        color: colors.accent.primary,
    },
    tableCellBest: {
        fontWeight: typography.weight.bold,
        color: colors.accent.primary,
    },

    // Column widths
    repsCol: {
        width: 44,
        textAlign: 'center',
    },
    weightCol: {
        flex: 1,
    },
    estCol: {
        flex: 1,
    },
    dateCol: {
        width: 60,
        textAlign: 'right',
    },
});
