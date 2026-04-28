/**
 * Exercise Mapping Screen
 *
 * Full-screen modal for resolving unmatched exercises during competitor import.
 * Shows one unresolved exercise at a time with options to:
 * - Accept one of the top 3 suggested matches
 * - Search for a different exercise via ExercisePicker
 * - Create as custom exercise (with muscle group + equipment selection)
 * - Skip this exercise
 *
 * When all exercises are resolved (or skipToSummary is true),
 * shows the ImportSummaryModal.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    ScrollView,
    Modal,
    FlatList,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, borderRadius, typography } from '../theme';
import { getUnresolvedMappings } from '../services/importParsers/exerciseMapper';
import { getImportSummary, executeCompetitorImport } from '../services/competitorImportService';
import { ExercisePicker } from '../components';
import type { Exercise, MuscleGroup, Equipment } from '../models/exercise';
import type { ProfileStackParamList } from '../navigation/AppNavigator';
import type {
    CompetitorSource,
    ParsedWorkout,
    ParsedMeasurement,
    ExerciseMapping,
} from '../services/importParsers/types';

// ============================================================
// Route params
// ============================================================

export type ExerciseMappingParams = {
    source: CompetitorSource;
    workouts: ParsedWorkout[];
    measurements: ParsedMeasurement[];
    mappings: ExerciseMapping[];
    warnings: string[];
    skipToSummary: boolean;
};

type RouteType = RouteProp<ProfileStackParamList, 'ExerciseMapping'>;
type NavigationType = NativeStackNavigationProp<ProfileStackParamList>;

// ============================================================
// Custom exercise config options
// ============================================================

const MUSCLE_GROUP_OPTIONS: { key: MuscleGroup; label: string }[] = [
    { key: 'chest', label: 'Chest' },
    { key: 'back', label: 'Back' },
    { key: 'shoulders', label: 'Shoulders' },
    { key: 'biceps', label: 'Biceps' },
    { key: 'triceps', label: 'Triceps' },
    { key: 'quads', label: 'Quads' },
    { key: 'hamstrings', label: 'Hamstrings' },
    { key: 'glutes', label: 'Glutes' },
    { key: 'calves', label: 'Calves' },
    { key: 'core', label: 'Core' },
    { key: 'traps', label: 'Traps' },
    { key: 'lats', label: 'Lats' },
    { key: 'forearms', label: 'Forearms' },
    { key: 'full_body', label: 'Full Body' },
];

const EQUIPMENT_OPTIONS: { key: Equipment; label: string }[] = [
    { key: 'barbell', label: 'Barbell' },
    { key: 'dumbbell', label: 'Dumbbell' },
    { key: 'cable', label: 'Cable' },
    { key: 'machine', label: 'Machine' },
    { key: 'smith_machine', label: 'Smith Machine' },
    { key: 'bodyweight', label: 'Bodyweight' },
    { key: 'kettlebell', label: 'Kettlebell' },
    { key: 'ez_bar', label: 'EZ Bar' },
    { key: 'resistance_band', label: 'Band' },
    { key: 'other', label: 'Other' },
    { key: 'none', label: 'None' },
];

// ============================================================
// Component
// ============================================================

export default function ExerciseMappingScreen() {
    const route = useRoute<RouteType>();
    const navigation = useNavigation<NavigationType>();
    const insets = useSafeAreaInsets();

    const {
        source,
        workouts,
        measurements,
        mappings: initialMappings,
        warnings,
        skipToSummary,
    } = route.params;

    const [mappings, setMappings] = useState<ExerciseMapping[]>(initialMappings);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showSummary, setShowSummary] = useState(skipToSummary);
    const [isImporting, setIsImporting] = useState(false);
    const [showExercisePicker, setShowExercisePicker] = useState(false);
    const [showCustomConfig, setShowCustomConfig] = useState(false);
    const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null);
    const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
    const importGuard = React.useRef(false);

    // Get only unresolved mappings for the step-through flow
    const unresolvedMappings = useMemo(
        () => getUnresolvedMappings(mappings),
        [mappings],
    );

    const currentMapping = unresolvedMappings[currentIndex] ?? null;

    // ============================================================
    // Mapping Actions
    // ============================================================

    const updateMapping = useCallback((originalName: string, updates: Partial<ExerciseMapping>) => {
        setMappings((prev) =>
            prev.map((m) =>
                m.originalName === originalName ? { ...m, ...updates } : m,
            ),
        );
    }, []);

    const advanceOrShowSummary = useCallback(() => {
        const stillUnresolved = getUnresolvedMappings(
            mappings.map((m) =>
                m.originalName === currentMapping?.originalName
                    ? { ...m, resolvedExerciseId: m.suggestedMatch?.id ?? null }
                    : m,
            ),
        );

        if (currentIndex + 1 >= unresolvedMappings.length || stillUnresolved.length <= 1) {
            setShowSummary(true);
        } else {
            setCurrentIndex((prev) => Math.min(prev + 1, unresolvedMappings.length - 1));
        }
    }, [currentIndex, unresolvedMappings.length, mappings, currentMapping]);

    const handleAcceptSuggestion = useCallback((matchId: string) => {
        if (!currentMapping) return;
        updateMapping(currentMapping.originalName, {
            action: 'map',
            resolvedExerciseId: matchId,
        });
        advanceOrShowSummary();
    }, [currentMapping, updateMapping, advanceOrShowSummary]);

    const handleSearchSelect = useCallback((exercise: Exercise) => {
        if (!currentMapping) return;
        setShowExercisePicker(false);
        updateMapping(currentMapping.originalName, {
            action: 'map',
            resolvedExerciseId: exercise.id,
            suggestedMatch: { id: exercise.id, name: exercise.name },
        });
        advanceOrShowSummary();
    }, [currentMapping, updateMapping, advanceOrShowSummary]);

    const handleCreateCustom = useCallback(() => {
        // Show the muscle group + equipment picker
        setSelectedMuscle(null);
        setSelectedEquipment(null);
        setShowCustomConfig(true);
    }, []);

    const handleConfirmCustom = useCallback(() => {
        if (!currentMapping) return;
        setShowCustomConfig(false);
        updateMapping(currentMapping.originalName, {
            action: 'create',
            resolvedExerciseId: null,
            customMuscleGroup: selectedMuscle ?? undefined,
            customEquipment: selectedEquipment ?? undefined,
        });
        advanceOrShowSummary();
    }, [currentMapping, updateMapping, advanceOrShowSummary, selectedMuscle, selectedEquipment]);

    const handleSkip = useCallback(() => {
        if (!currentMapping) return;
        updateMapping(currentMapping.originalName, {
            action: 'skip',
            resolvedExerciseId: null,
        });
        advanceOrShowSummary();
    }, [currentMapping, updateMapping, advanceOrShowSummary]);

    const handleGoBack = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex((prev) => prev - 1);
        }
    }, [currentIndex]);

    // ============================================================
    // Import Execution
    // ============================================================

    const handleExecuteImport = useCallback(async () => {
        if (importGuard.current) return;
        importGuard.current = true;
        setIsImporting(true);

        try {
            const result = await executeCompetitorImport(workouts, mappings, measurements);
            Alert.alert(
                'Import Complete! 🎉',
                `Successfully imported:\n• ${result.workoutsInserted} workouts\n• ${result.setsInserted} sets\n• ${result.exercisesCreated} new exercises\n• ${result.measurementsInserted} measurements\n\nRestart the app to see all changes.`,
                [{ text: 'OK', onPress: () => navigation.goBack() }],
            );
        } catch (error) {
            console.error('[ExerciseMappingScreen] Import failed:', error);
            Alert.alert('Import Failed', String(error instanceof Error ? error.message : error));
        } finally {
            importGuard.current = false;
            setIsImporting(false);
        }
    }, [workouts, mappings, measurements, navigation]);

    // ============================================================
    // Summary View
    // ============================================================

    if (showSummary) {
        const summary = getImportSummary(source, workouts, measurements, mappings);
        const sourceNames: Record<CompetitorSource, string> = {
            hevy: 'Hevy', strong: 'Strong', fitnotes: 'FitNotes',
        };

        return (
            <View style={[styles.container, { paddingBottom: insets.bottom + spacing.lg }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <MaterialIcons name="close" size={24} color={colors.text.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Import Summary</Text>
                    <View style={styles.backButton} />
                </View>

                <ScrollView style={styles.summaryScroll} contentContainerStyle={styles.summaryContent}>
                    <View style={styles.sourceCard}>
                        <MaterialIcons name="fitness-center" size={28} color={colors.accent.primary} />
                        <Text style={styles.sourceName}>Importing from {sourceNames[source]}</Text>
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
                    onPress={handleExecuteImport}
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
    // Mapping Step-Through View
    // ============================================================

    // BH-063: Transition to summary when all mappings are resolved.
    // Must be in useEffect — setState during render violates React's contract.
    useEffect(() => {
        if (!currentMapping && !showSummary) {
            setShowSummary(true);
        }
    }, [currentMapping, showSummary]);

    if (!currentMapping) {
        return null;
    }

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialIcons name="close" size={24} color={colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Map Exercises</Text>
                <Text style={styles.counter}>
                    {currentIndex + 1} of {unresolvedMappings.length}
                </Text>
            </View>

            <ScrollView style={styles.mappingScroll} contentContainerStyle={styles.mappingContent}>
                <Text style={styles.csvLabel}>FROM CSV:</Text>
                <View style={styles.exerciseNameCard}>
                    <Text style={styles.exerciseName}>{currentMapping.originalName}</Text>
                </View>

                {/* Top 3 suggestions */}
                {currentMapping.suggestedMatches.length > 0 && (
                    <>
                        <Text style={styles.matchLabel}>
                            SUGGESTED MATCHES
                        </Text>
                        {currentMapping.suggestedMatches.map((match, idx) => (
                            <TouchableOpacity
                                key={match.id}
                                style={[
                                    styles.suggestionCard,
                                    idx === 0 && styles.suggestionCardBest,
                                ]}
                                onPress={() => handleAcceptSuggestion(match.id)}
                                activeOpacity={0.7}
                            >
                                <MaterialIcons
                                    name={idx === 0 ? 'check-circle' : 'radio-button-unchecked'}
                                    size={20}
                                    color={idx === 0 ? colors.accent.success : colors.text.secondary}
                                />
                                <View style={styles.suggestionInfo}>
                                    <Text style={styles.suggestionName}>{match.name}</Text>
                                    <Text style={styles.suggestionConfidence}>
                                        {match.confidence}% match
                                    </Text>
                                </View>
                                <Text style={styles.tapToAccept}>
                                    {idx === 0 ? 'Best' : 'Tap'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </>
                )}

                <Text style={styles.orLabel}>OR</Text>

                {/* Search for exercise */}
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => setShowExercisePicker(true)}
                    activeOpacity={0.7}
                >
                    <MaterialIcons name="search" size={20} color={colors.accent.primary} />
                    <Text style={styles.actionButtonText}>Search All Exercises</Text>
                </TouchableOpacity>

                {/* Create custom */}
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleCreateCustom}
                    activeOpacity={0.7}
                >
                    <MaterialIcons name="add" size={20} color={colors.accent.primary} />
                    <Text style={styles.actionButtonText}>Create as Custom Exercise</Text>
                </TouchableOpacity>

                {/* Skip */}
                <TouchableOpacity
                    style={[styles.actionButton, styles.skipButton]}
                    onPress={handleSkip}
                    activeOpacity={0.7}
                >
                    <MaterialIcons name="skip-next" size={20} color={colors.text.secondary} />
                    <Text style={[styles.actionButtonText, styles.skipText]}>Skip This Exercise</Text>
                </TouchableOpacity>
            </ScrollView>

            <View style={styles.navRow}>
                <TouchableOpacity
                    style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
                    onPress={handleGoBack}
                    disabled={currentIndex === 0}
                >
                    <MaterialIcons name="chevron-left" size={24} color={currentIndex === 0 ? colors.text.disabled : colors.text.primary} />
                    <Text style={[styles.navButtonText, currentIndex === 0 && styles.navButtonTextDisabled]}>
                        Previous
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.confirmAllButton}
                    onPress={() => setShowSummary(true)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.confirmAllText}>Review Import →</Text>
                </TouchableOpacity>
            </View>

            {/* Exercise picker modal for search */}
            <ExercisePicker
                visible={showExercisePicker}
                onClose={() => setShowExercisePicker(false)}
                onSelect={handleSearchSelect}
            />

            {/* Custom exercise config modal */}
            <Modal
                visible={showCustomConfig}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowCustomConfig(false)}
            >
                <View style={styles.customConfigContainer}>
                    <View style={styles.customConfigHeader}>
                        <TouchableOpacity onPress={() => setShowCustomConfig(false)}>
                            <Text style={styles.customConfigCancel}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.customConfigTitle}>New Exercise</Text>
                        <TouchableOpacity onPress={handleConfirmCustom}>
                            <Text style={styles.customConfigDone}>Create</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.customConfigScroll}>
                        <Text style={styles.customConfigName}>
                            "{currentMapping?.originalName}"
                        </Text>

                        <Text style={styles.customConfigSectionTitle}>MUSCLE GROUP</Text>
                        <View style={styles.chipGrid}>
                            {MUSCLE_GROUP_OPTIONS.map((opt) => (
                                <TouchableOpacity
                                    key={opt.key}
                                    style={[
                                        styles.chip,
                                        selectedMuscle === opt.key && styles.chipSelected,
                                    ]}
                                    onPress={() => setSelectedMuscle(
                                        selectedMuscle === opt.key ? null : opt.key,
                                    )}
                                >
                                    <Text style={[
                                        styles.chipText,
                                        selectedMuscle === opt.key && styles.chipTextSelected,
                                    ]}>
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.customConfigSectionTitle}>EQUIPMENT</Text>
                        <View style={styles.chipGrid}>
                            {EQUIPMENT_OPTIONS.map((opt) => (
                                <TouchableOpacity
                                    key={opt.key}
                                    style={[
                                        styles.chip,
                                        selectedEquipment === opt.key && styles.chipSelected,
                                    ]}
                                    onPress={() => setSelectedEquipment(
                                        selectedEquipment === opt.key ? null : opt.key,
                                    )}
                                >
                                    <Text style={[
                                        styles.chipText,
                                        selectedEquipment === opt.key && styles.chipTextSelected,
                                    ]}>
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>
                </View>
            </Modal>
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
    counter: { fontSize: typography.size.sm, color: colors.text.secondary, width: 40, textAlign: 'right' },

    // Mapping view
    mappingScroll: { flex: 1 },
    mappingContent: { padding: spacing.lg },
    csvLabel: {
        fontSize: typography.size.xs, fontWeight: typography.weight.semibold,
        color: colors.text.secondary, letterSpacing: 0.5, marginBottom: spacing.sm,
    },
    exerciseNameCard: {
        backgroundColor: colors.background.secondary, borderRadius: borderRadius.lg,
        padding: spacing.lg, marginBottom: spacing.lg,
        borderLeftWidth: 3, borderLeftColor: colors.accent.primary,
    },
    exerciseName: { fontSize: typography.size.xl, fontWeight: typography.weight.bold, color: colors.text.primary },
    matchLabel: {
        fontSize: typography.size.xs, fontWeight: typography.weight.semibold,
        color: colors.accent.success, letterSpacing: 0.5, marginBottom: spacing.sm,
    },
    suggestionCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.background.secondary, borderRadius: borderRadius.lg,
        padding: spacing.md, marginBottom: spacing.xs,
        borderWidth: 1, borderColor: colors.border,
    },
    suggestionCardBest: {
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderColor: 'rgba(34, 197, 94, 0.3)',
    },
    suggestionInfo: { flex: 1, marginLeft: spacing.sm },
    suggestionName: { fontSize: typography.size.md, fontWeight: typography.weight.medium, color: colors.text.primary },
    suggestionConfidence: { fontSize: typography.size.xs, color: colors.text.secondary, marginTop: 2 },
    tapToAccept: { fontSize: typography.size.xs, color: colors.accent.success },
    orLabel: { fontSize: typography.size.sm, color: colors.text.disabled, textAlign: 'center', marginVertical: spacing.md },
    actionButton: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.background.tertiary, borderRadius: borderRadius.lg,
        padding: spacing.md, marginBottom: spacing.sm,
    },
    actionButtonText: { fontSize: typography.size.md, color: colors.text.primary, marginLeft: spacing.sm },
    skipButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
    skipText: { color: colors.text.secondary },

    // Navigation
    navRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
        borderTopWidth: 1, borderTopColor: colors.border,
    },
    navButton: { flexDirection: 'row', alignItems: 'center' },
    navButtonDisabled: { opacity: 0.3 },
    navButtonText: { fontSize: typography.size.md, color: colors.text.primary },
    navButtonTextDisabled: { color: colors.text.disabled },
    confirmAllButton: {
        backgroundColor: colors.accent.primary,
        paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.md,
    },
    confirmAllText: { fontSize: typography.size.md, fontWeight: typography.weight.semibold, color: '#fff' },

    // Summary view
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

    // Custom exercise config modal
    customConfigContainer: { flex: 1, backgroundColor: colors.background.primary },
    customConfigHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: spacing.md, paddingVertical: spacing.md,
        borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    customConfigCancel: { fontSize: typography.size.md, color: colors.text.secondary },
    customConfigTitle: { fontSize: typography.size.lg, fontWeight: typography.weight.semibold, color: colors.text.primary },
    customConfigDone: { fontSize: typography.size.md, fontWeight: typography.weight.semibold, color: colors.accent.primary },
    customConfigScroll: { padding: spacing.lg },
    customConfigName: {
        fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.text.primary,
        textAlign: 'center', marginBottom: spacing.xl,
    },
    customConfigSectionTitle: {
        fontSize: typography.size.xs, fontWeight: typography.weight.semibold,
        color: colors.text.secondary, letterSpacing: 0.5, marginBottom: spacing.sm, marginTop: spacing.md,
    },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    chip: {
        paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
        borderRadius: borderRadius.full, backgroundColor: colors.background.secondary,
        borderWidth: 1, borderColor: colors.border,
    },
    chipSelected: { backgroundColor: colors.accent.primary + '20', borderColor: colors.accent.primary },
    chipText: { fontSize: typography.size.sm, color: colors.text.secondary },
    chipTextSelected: { color: colors.accent.primary, fontWeight: typography.weight.semibold },
});
