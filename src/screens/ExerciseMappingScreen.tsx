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
 * shows the ImportSummaryView.
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
import ImportSummaryView from '../components/import/ImportSummaryView';
import CustomExerciseConfigModal from '../components/import/CustomExerciseConfigModal';
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
        setShowCustomConfig(true);
    }, []);

    const handleConfirmCustom = useCallback((
        muscleGroup: MuscleGroup | null,
        equipment: Equipment | null,
    ) => {
        if (!currentMapping) return;
        setShowCustomConfig(false);
        updateMapping(currentMapping.originalName, {
            action: 'create',
            resolvedExerciseId: null,
            customMuscleGroup: muscleGroup ?? undefined,
            customEquipment: equipment ?? undefined,
        });
        advanceOrShowSummary();
    }, [currentMapping, updateMapping, advanceOrShowSummary]);

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

        return (
            <ImportSummaryView
                source={source}
                summary={summary}
                warnings={warnings}
                isImporting={isImporting}
                onImport={handleExecuteImport}
                onClose={() => navigation.goBack()}
                bottomInset={insets.bottom}
            />
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
            <CustomExerciseConfigModal
                visible={showCustomConfig}
                exerciseName={currentMapping?.originalName ?? ''}
                onClose={() => setShowCustomConfig(false)}
                onConfirm={handleConfirmCustom}
            />
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
});
