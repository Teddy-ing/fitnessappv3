/**
 * Import Summary View
 *
 * Shows a summary of what will be imported: workout count, sets, exercises,
 * measurements, plus any warnings. Contains the "Import Data" action button.
 *
 * Extracted from ExerciseMappingScreen (TD-052) to keep the parent under
 * the 600-line guardrail.
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, spacing, borderRadius, typography } from '../../theme';
import type { ImportSummary } from '../../services/importParsers/types';
import type { CompetitorSource } from '../../services/importParsers/types';

// ============================================================
// Constants
// ============================================================

const SOURCE_NAMES: Record<CompetitorSource, string> = {
    hevy: 'Hevy',
    strong: 'Strong',
    fitnotes: 'FitNotes',
};

// ============================================================
// Props
// ============================================================

interface ImportSummaryViewProps {
    source: CompetitorSource;
    summary: ImportSummary;
    warnings: string[];
    isImporting: boolean;
    onImport: () => void;
    onClose: () => void;
    bottomInset: number;
}

// ============================================================
// Component
// ============================================================

export default function ImportSummaryView({
    source,
    summary,
    warnings,
    isImporting,
    onImport,
    onClose,
    bottomInset,
}: ImportSummaryViewProps) {
    return (
        <View style={[styles.container, { paddingBottom: bottomInset + spacing.lg }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.backButton}>
                    <MaterialIcons name="close" size={24} color={colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Import Summary</Text>
                <View style={styles.backButton} />
            </View>

            <ScrollView style={styles.summaryScroll} contentContainerStyle={styles.summaryContent}>
                <View style={styles.sourceCard}>
                    <MaterialIcons name="fitness-center" size={28} color={colors.accent.primary} />
                    <Text style={styles.sourceName}>Importing from {SOURCE_NAMES[source]}</Text>
                </View>

                <View style={styles.statsGrid}>
                    <StatCard label="Workouts" value={summary.totalWorkouts} icon="event" />
                    <StatCard label="Sets" value={summary.totalSets} icon="format-list-numbered" />
                    <StatCard label="Exercises" value={summary.totalExercises} icon="fitness-center" />
                    <StatCard label="Measurements" value={summary.totalMeasurements} icon="straighten" />
                </View>

                {summary.skippedExercises > 0 && (
                    <View style={styles.warningCard}>
                        <MaterialIcons name="warning" size={20} color={colors.accent.warning} />
                        <Text style={styles.warningText}>
                            {summary.skippedExercises} exercise(s) will be skipped
                        </Text>
                    </View>
                )}

                {warnings.length > 0 && (
                    <View style={styles.warningCard}>
                        <MaterialIcons name="info-outline" size={20} color={colors.text.secondary} />
                        <Text style={styles.warningText}>{warnings.join('\n')}</Text>
                    </View>
                )}

                <View style={styles.noticeCard}>
                    <MaterialIcons name="add-circle-outline" size={18} color={colors.accent.primary} />
                    <Text style={styles.noticeText}>
                        Imported workouts will be added alongside your existing data. Nothing will be deleted.
                    </Text>
                </View>
            </ScrollView>

            <TouchableOpacity
                style={[styles.importButton, isImporting && styles.importButtonDisabled]}
                onPress={onImport}
                disabled={isImporting}
                activeOpacity={0.8}
            >
                {isImporting ? (
                    <ActivityIndicator color="#fff" size="small" />
                ) : (
                    <>
                        <MaterialIcons name="download" size={20} color="#fff" />
                        <Text style={styles.importButtonText}>Import Data</Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    );
}

// ============================================================
// Sub-components
// ============================================================

function StatCard({ label, value, icon }: { label: string; value: number; icon: keyof typeof MaterialIcons.glyphMap }) {
    return (
        <View style={styles.statCard}>
            <MaterialIcons name={icon} size={20} color={colors.accent.primary} />
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background.primary },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: spacing.md, paddingVertical: spacing.md,
        borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    backButton: { width: 40, alignItems: 'center' },
    headerTitle: { fontSize: typography.size.lg, fontWeight: typography.weight.semibold, color: colors.text.primary },
    summaryScroll: { flex: 1 },
    summaryContent: { padding: spacing.lg },
    sourceCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.background.secondary, borderRadius: borderRadius.lg,
        padding: spacing.lg, marginBottom: spacing.lg, gap: spacing.md,
    },
    sourceName: { fontSize: typography.size.lg, fontWeight: typography.weight.semibold, color: colors.text.primary },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
    statCard: {
        flex: 1, minWidth: '45%', backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg, padding: spacing.md, alignItems: 'center', gap: 4,
    },
    statValue: { fontSize: typography.size.xxl, fontWeight: typography.weight.bold, color: colors.text.primary },
    statLabel: { fontSize: typography.size.xs, color: colors.text.secondary },
    warningCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: borderRadius.lg,
        padding: spacing.md, marginBottom: spacing.sm, gap: spacing.sm,
    },
    warningText: { flex: 1, fontSize: typography.size.sm, color: colors.text.secondary },
    noticeCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(168, 85, 247, 0.08)', borderRadius: borderRadius.lg,
        padding: spacing.md, marginTop: spacing.sm, gap: spacing.sm,
    },
    noticeText: { flex: 1, fontSize: typography.size.sm, color: colors.text.secondary },
    importButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: colors.accent.primary, marginHorizontal: spacing.lg,
        paddingVertical: 14, borderRadius: borderRadius.lg, gap: spacing.sm,
    },
    importButtonDisabled: { opacity: 0.6 },
    importButtonText: { fontSize: typography.size.md, fontWeight: typography.weight.semibold, color: '#fff' },
});
