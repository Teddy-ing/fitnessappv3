/**
 * Import Bottom Sheet
 *
 * Source selector for data imports:
 * - This App (.json): restores a full backup (existing destructive flow)
 * - FROM OTHER APPS section: Hevy, Strong, FitNotes competitor imports
 *
 * Selecting a competitor source opens the document picker,
 * triggers parsing, and navigates to the exercise mapping screen
 * (or directly to summary if all exercises auto-match).
 *
 * Uses React Native Modal with slide-up animation.
 */

import React, { useCallback, useRef, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, borderRadius, typography } from '../../theme';
import { parseFile, generateExerciseMappings, getUnresolvedMappings } from '../../services/importParsers';
import type { CompetitorSource } from '../../services/importParsers';
import type { ProfileStackParamList } from '../../navigation/AppNavigator';

interface ImportBottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onImportJSON: () => void; // Triggers existing destructive import flow
}

type Navigation = NativeStackNavigationProp<ProfileStackParamList>;

export default function ImportBottomSheet({
    isOpen,
    onClose,
    onImportJSON,
}: ImportBottomSheetProps) {
    const isRunning = useRef(false);
    const [loadingSource, setLoadingSource] = useState<CompetitorSource | null>(null);
    const navigation = useNavigation<Navigation>();
    const insets = useSafeAreaInsets();

    const handleCompetitorImport = useCallback(async (source: CompetitorSource) => {
        // Guardrail #14: concurrent invocation guard
        if (isRunning.current) return;
        isRunning.current = true;
        setLoadingSource(source);

        try {
            // Open document picker (multi-select for Hevy/FitNotes, single for Strong)
            const allowMultiple = source !== 'strong';
            const result = await DocumentPicker.getDocumentAsync({
                type: 'text/*',
                multiple: allowMultiple,
                copyToCacheDirectory: true,
            });

            if (result.canceled || !result.assets?.length) {
                return;
            }

            const fileUris = result.assets.map((a) => a.uri);

            // Parse the files
            const parseResult = await parseFile(source, fileUris);

            if (parseResult.workouts.length === 0 && parseResult.measurements.length === 0) {
                Alert.alert(
                    'No Data Found',
                    parseResult.warnings.length > 0
                        ? parseResult.warnings.join('\n')
                        : 'No workout or measurement data was found in the selected file(s).',
                );
                return;
            }

            // Generate exercise mappings
            const allExercises = parseResult.workouts.flatMap((w) => w.exercises);
            const mappings = await generateExerciseMappings(allExercises);
            const unresolved = getUnresolvedMappings(mappings);

            onClose();

            // Option A: Skip mapping screen if all exercises auto-matched
            if (unresolved.length === 0) {
                // Go directly to ExerciseMapping screen which acts as summary
                navigation.navigate('ExerciseMapping', {
                    source,
                    workouts: parseResult.workouts,
                    measurements: parseResult.measurements,
                    mappings,
                    warnings: parseResult.warnings,
                    skipToSummary: true,
                });
            } else {
                navigation.navigate('ExerciseMapping', {
                    source,
                    workouts: parseResult.workouts,
                    measurements: parseResult.measurements,
                    mappings,
                    warnings: parseResult.warnings,
                    skipToSummary: false,
                });
            }
        } catch (error) {
            console.error(`[ImportBottomSheet] ${source} import failed:`, error);
            Alert.alert(
                'Import Error',
                `Failed to parse the selected file(s). Please make sure you selected valid ${source} export files.`,
            );
        } finally {
            isRunning.current = false;
            setLoadingSource(null);
        }
    }, [navigation, onClose]);

    const handleJSONImport = useCallback(() => {
        onClose();
        // Small delay to let modal close before showing alert
        setTimeout(() => onImportJSON(), 300);
    }, [onClose, onImportJSON]);

    const isLoading = loadingSource !== null;

    return (
        <Modal
            visible={isOpen}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
                            <View style={styles.handle} />

                            <View style={styles.content}>
                                <Text style={styles.title}>Import Data</Text>

                                {/* Native backup restore */}
                                <TouchableOpacity
                                    style={styles.option}
                                    onPress={handleJSONImport}
                                    disabled={isLoading}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.iconContainer, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                                        <MaterialIcons name="restore" size={22} color={colors.accent.primary} />
                                    </View>
                                    <View style={styles.optionText}>
                                        <Text style={styles.optionLabel}>This App (.json)</Text>
                                        <Text style={styles.optionSubtitle}>
                                            Restore a full backup — replaces all current data
                                        </Text>
                                    </View>
                                    <MaterialIcons name="chevron-right" size={20} color={colors.text.secondary} />
                                </TouchableOpacity>

                                {/* Competitor imports */}
                                <Text style={styles.sectionLabel}>FROM OTHER APPS</Text>

                                <SourceRow
                                    name="Hevy"
                                    subtitle="Import workout_data.csv and/or measurement_data.csv"
                                    icon="fitness-center"
                                    color="#FF6B35"
                                    loading={loadingSource === 'hevy'}
                                    disabled={isLoading}
                                    onPress={() => handleCompetitorImport('hevy')}
                                />
                                <SourceRow
                                    name="Strong"
                                    subtitle="Import strong*.csv export file"
                                    icon="fitness-center"
                                    color="#4FC3F7"
                                    loading={loadingSource === 'strong'}
                                    disabled={isLoading}
                                    onPress={() => handleCompetitorImport('strong')}
                                />
                                <SourceRow
                                    name="FitNotes"
                                    subtitle="Use 'Export as Spreadsheet' — not .fitnotes format"
                                    icon="fitness-center"
                                    color="#66BB6A"
                                    loading={loadingSource === 'fitnotes'}
                                    disabled={isLoading}
                                    onPress={() => handleCompetitorImport('fitnotes')}
                                />
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

// ============================================================
// Sub-components
// ============================================================

function SourceRow({
    name,
    subtitle,
    icon,
    color,
    loading,
    disabled,
    onPress,
}: {
    name: string;
    subtitle: string;
    icon: keyof typeof MaterialIcons.glyphMap;
    color: string;
    loading: boolean;
    disabled: boolean;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity
            style={styles.option}
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.7}
        >
            <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
                {loading ? (
                    <ActivityIndicator size="small" color={color} />
                ) : (
                    <MaterialIcons name={icon} size={20} color={color} />
                )}
            </View>
            <View style={styles.optionText}>
                <Text style={styles.optionLabel}>{name}</Text>
                <Text style={styles.optionSubtitle}>{subtitle}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.text.secondary} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: colors.background.secondary,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        paddingTop: spacing.sm,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.text.disabled,
        alignSelf: 'center',
        marginBottom: spacing.md,
    },
    content: {
        paddingHorizontal: spacing.lg,
    },
    title: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
        marginBottom: spacing.md,
    },
    sectionLabel: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.semibold,
        color: colors.text.secondary,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
        letterSpacing: 0.5,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    optionText: {
        flex: 1,
    },
    optionLabel: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
    },
    optionSubtitle: {
        fontSize: typography.size.xs,
        color: colors.text.secondary,
        marginTop: 2,
    },
});
