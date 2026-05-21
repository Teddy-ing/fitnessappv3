/**
 * WorkoutSettingsMenu Component
 *
 * Full-screen overlay settings page for the Workout Screen.
 * Displays as a proper page with header, scroll, and sections:
 * - VISUAL COLUMNS: Previous, RPE, RIR (max 2)
 * - TOOLS: Plate Calculator, Warm-up Sets
 * - DEFAULTS: Default Sets, Weight Increment, Auto Timer, Timer Duration
 *
 * Replaces the old bottom sheet modal with a full-screen experience.
 */

import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    StyleSheet,
    Switch,
    Alert,
    ScrollView,
    StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '../theme';

interface WorkoutSettingsMenuProps {
    visible: boolean;
    onClose: () => void;
    onAddNote: () => void;

    showPrevious: boolean;
    showRpe: boolean;
    showRir: boolean;
    showPlateCalc: boolean;
    defaultWarmupSets: number;

    // DEFAULTS section
    defaultSetsPerExercise: number;
    defaultWeightIncrement: number;
    autoStartRestTimer: boolean;
    defaultRestTime: number;
    smartSuggestions: boolean;
    showProgressionNudges: boolean;
    weightUnit: string;

    onToggleSetting: (key: 'showPrevious' | 'showRpe' | 'showRir' | 'showPlateCalc' | 'autoStartRestTimer' | 'smartSuggestions' | 'showProgressionNudges', value: boolean) => void;
    onChangeWarmupSets: (count: number) => void;
    onChangeDefaultSets: (count: number) => void;
    onChangeWeightIncrement: (value: number) => void;
    onChangeRestTime: (seconds: number) => void;
}

/**
 * Format seconds as M:SS for timer display
 */
function formatTimerDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
}

export default function WorkoutSettingsMenu({
    visible,
    onClose,
    onAddNote,
    showPrevious,
    showRpe,
    showRir,
    showPlateCalc,
    defaultWarmupSets,
    defaultSetsPerExercise,
    defaultWeightIncrement,
    autoStartRestTimer,
    defaultRestTime,
    smartSuggestions,
    showProgressionNudges,
    weightUnit,
    onToggleSetting,
    onChangeWarmupSets,
    onChangeDefaultSets,
    onChangeWeightIncrement,
    onChangeRestTime,
}: WorkoutSettingsMenuProps) {
    const insets = useSafeAreaInsets();

    // Count active visual columns to enforce max 2 logic
    const activeColumnsCount = [showPrevious, showRpe, showRir].filter(Boolean).length;

    const handleToggle = (
        key: 'showPrevious' | 'showRpe' | 'showRir',
        currentValue: boolean
    ) => {
        if (!currentValue && activeColumnsCount >= 2) return;
        onToggleSetting(key, !currentValue);
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={onClose}
        >
            <View style={[styles.container, { paddingTop: insets.top }]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.backButton}>
                        <MaterialIcons name="arrow-back" size={24} color={colors.text.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Workout Settings</Text>
                    <View style={styles.backButton} />
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* ═══════ ACTIONS ═══════ */}
                    <TouchableOpacity style={styles.actionRow} onPress={() => { onClose(); onAddNote(); }}>
                        <View style={styles.rowIconContainer}>
                            <MaterialIcons name="edit-note" size={20} color={colors.text.primary} />
                        </View>
                        <Text style={styles.rowLabel}>Add Workout Note</Text>
                        <MaterialIcons name="chevron-right" size={20} color={colors.text.secondary} />
                    </TouchableOpacity>

                    {/* ═══════ VISUAL COLUMNS ═══════ */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>VISUAL COLUMNS (MAX 2)</Text>

                        <View style={styles.settingRow}>
                            <View style={styles.rowIconContainer}>
                                <MaterialIcons name="history" size={20} color={colors.text.primary} />
                            </View>
                            <View style={styles.settingLabelContainer}>
                                <Text style={styles.settingLabel}>Show Previous</Text>
                                <Text style={styles.settingSubLabel}>Display last workout's data</Text>
                            </View>
                            <Switch
                                value={showPrevious}
                                onValueChange={() => handleToggle('showPrevious', showPrevious)}
                                trackColor={{ false: colors.background.tertiary, true: colors.accent.primary }}
                                disabled={!showPrevious && activeColumnsCount >= 2}
                            />
                        </View>

                        <View style={styles.settingRow}>
                            <View style={styles.rowIconContainer}>
                                <MaterialIcons name="speed" size={20} color={colors.text.primary} />
                            </View>
                            <View style={styles.settingLabelContainer}>
                                <Text style={styles.settingLabel}>Track RPE</Text>
                                <Text style={styles.settingSubLabel}>Rate of Perceived Exertion</Text>
                            </View>
                            <Switch
                                value={showRpe}
                                onValueChange={() => handleToggle('showRpe', showRpe)}
                                trackColor={{ false: colors.background.tertiary, true: colors.accent.primary }}
                                disabled={!showRpe && activeColumnsCount >= 2}
                            />
                        </View>

                        <View style={styles.settingRow}>
                            <View style={styles.rowIconContainer}>
                                <MaterialIcons name="battery-3-bar" size={20} color={colors.text.primary} />
                            </View>
                            <View style={styles.settingLabelContainer}>
                                <Text style={styles.settingLabel}>Track RIR</Text>
                                <Text style={styles.settingSubLabel}>Reps in Reserve</Text>
                            </View>
                            <Switch
                                value={showRir}
                                onValueChange={() => handleToggle('showRir', showRir)}
                                trackColor={{ false: colors.background.tertiary, true: colors.accent.primary }}
                                disabled={!showRir && activeColumnsCount >= 2}
                            />
                        </View>
                    </View>

                    {/* ═══════ TOOLS ═══════ */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>TOOLS</Text>

                        <View style={styles.settingRow}>
                            <View style={styles.rowIconContainer}>
                                <MaterialIcons name="calculate" size={20} color={colors.text.primary} />
                            </View>
                            <View style={styles.settingLabelContainer}>
                                <Text style={styles.settingLabel}>Plate Calculator</Text>
                                <Text style={styles.settingSubLabel}>Show 🏋️ icon in keyboard</Text>
                            </View>
                            <Switch
                                value={showPlateCalc}
                                onValueChange={(val) => onToggleSetting('showPlateCalc', val)}
                                trackColor={{ false: colors.background.tertiary, true: colors.accent.primary }}
                            />
                        </View>

                        <View style={styles.settingRow}>
                            <View style={styles.rowIconContainer}>
                                <MaterialIcons name="whatshot" size={20} color={colors.accent.warning} />
                            </View>
                            <View style={styles.settingLabelContainer}>
                                <Text style={styles.settingLabel}>Warm-up Sets</Text>
                                <Text style={styles.settingSubLabel}>Default warm-up sets per exercise</Text>
                            </View>
                            <View style={styles.stepperControls}>
                                <TouchableOpacity
                                    style={[styles.stepperButton, defaultWarmupSets <= 0 && styles.stepperButtonDisabled]}
                                    onPress={() => onChangeWarmupSets(Math.max(0, defaultWarmupSets - 1))}
                                    disabled={defaultWarmupSets <= 0}
                                >
                                    <Text style={styles.stepperButtonText}>-</Text>
                                </TouchableOpacity>
                                <Text style={styles.stepperValue}>{defaultWarmupSets}</Text>
                                <TouchableOpacity
                                    style={[styles.stepperButton, defaultWarmupSets >= 5 && styles.stepperButtonDisabled]}
                                    onPress={() => onChangeWarmupSets(Math.min(5, defaultWarmupSets + 1))}
                                    disabled={defaultWarmupSets >= 5}
                                >
                                    <Text style={styles.stepperButtonText}>+</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* ═══════ DEFAULTS ═══════ */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>DEFAULTS</Text>

                        {/* Default Sets Per Exercise */}
                        <View style={styles.settingRow}>
                            <View style={styles.rowIconContainer}>
                                <MaterialIcons name="format-list-numbered" size={20} color={colors.text.primary} />
                            </View>
                            <View style={styles.settingLabelContainer}>
                                <Text style={styles.settingLabel}>Default Sets</Text>
                                <Text style={styles.settingSubLabel}>Working sets per new exercise</Text>
                            </View>
                            <View style={styles.stepperControls}>
                                <TouchableOpacity
                                    style={[styles.stepperButton, defaultSetsPerExercise <= 1 && styles.stepperButtonDisabled]}
                                    onPress={() => onChangeDefaultSets(Math.max(1, defaultSetsPerExercise - 1))}
                                    disabled={defaultSetsPerExercise <= 1}
                                >
                                    <Text style={styles.stepperButtonText}>-</Text>
                                </TouchableOpacity>
                                <Text style={styles.stepperValue}>{defaultSetsPerExercise}</Text>
                                <TouchableOpacity
                                    style={[styles.stepperButton, defaultSetsPerExercise >= 10 && styles.stepperButtonDisabled]}
                                    onPress={() => onChangeDefaultSets(Math.min(10, defaultSetsPerExercise + 1))}
                                    disabled={defaultSetsPerExercise >= 10}
                                >
                                    <Text style={styles.stepperButtonText}>+</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Default Weight Increment */}
                        <View style={styles.settingRow}>
                            <View style={styles.rowIconContainer}>
                                <MaterialIcons name="swap-vert" size={20} color={colors.text.primary} />
                            </View>
                            <View style={styles.settingLabelContainer}>
                                <Text style={styles.settingLabel}>Weight Increment</Text>
                                <Text style={styles.settingSubLabel}>Weight +/− button step size</Text>
                            </View>
                            <View style={styles.stepperControls}>
                                <TouchableOpacity
                                    style={[styles.stepperButton, defaultWeightIncrement <= 0.5 && styles.stepperButtonDisabled]}
                                    onPress={() => onChangeWeightIncrement(Math.max(0.5, Math.round((defaultWeightIncrement - 0.5) * 10) / 10))}
                                    disabled={defaultWeightIncrement <= 0.5}
                                >
                                    <Text style={styles.stepperButtonText}>-</Text>
                                </TouchableOpacity>
                                <Text style={styles.stepperValue}>{defaultWeightIncrement} {weightUnit}</Text>
                                <TouchableOpacity
                                    style={[styles.stepperButton, defaultWeightIncrement >= 25 && styles.stepperButtonDisabled]}
                                    onPress={() => onChangeWeightIncrement(Math.min(25, Math.round((defaultWeightIncrement + 0.5) * 10) / 10))}
                                    disabled={defaultWeightIncrement >= 25}
                                >
                                    <Text style={styles.stepperButtonText}>+</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Auto Timer Start */}
                        <View style={styles.settingRow}>
                            <View style={styles.rowIconContainer}>
                                <MaterialIcons name="timer" size={20} color={colors.text.primary} />
                            </View>
                            <View style={styles.settingLabelContainer}>
                                <Text style={styles.settingLabel}>Auto Timer Start</Text>
                                <Text style={styles.settingSubLabel}>Start timer on set completion</Text>
                            </View>
                            <Switch
                                value={autoStartRestTimer}
                                onValueChange={(val) => onToggleSetting('autoStartRestTimer', val)}
                                trackColor={{ false: colors.background.tertiary, true: colors.accent.primary }}
                            />
                        </View>

                        {/* Timer Duration */}
                        <View style={styles.settingRow}>
                            <View style={styles.rowIconContainer}>
                                <MaterialIcons name="hourglass-bottom" size={20} color={colors.text.primary} />
                            </View>
                            <View style={styles.settingLabelContainer}>
                                <Text style={styles.settingLabel}>Timer Duration</Text>
                                <Text style={styles.settingSubLabel}>Rest period between sets</Text>
                            </View>
                            <View style={styles.stepperControls}>
                                <TouchableOpacity
                                    style={[styles.stepperButton, defaultRestTime <= 30 && styles.stepperButtonDisabled]}
                                    onPress={() => onChangeRestTime(Math.max(30, defaultRestTime - 15))}
                                    disabled={defaultRestTime <= 30}
                                >
                                    <Text style={styles.stepperButtonText}>-</Text>
                                </TouchableOpacity>
                                <Text style={styles.stepperValue}>{formatTimerDuration(defaultRestTime)}</Text>
                                <TouchableOpacity
                                    style={[styles.stepperButton, defaultRestTime >= 300 && styles.stepperButtonDisabled]}
                                    onPress={() => onChangeRestTime(Math.min(300, defaultRestTime + 15))}
                                    disabled={defaultRestTime >= 300}
                                >
                                    <Text style={styles.stepperButtonText}>+</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Smart Suggestions */}
                        <View style={styles.settingRow}>
                            <View style={styles.rowIconContainer}>
                                <MaterialIcons name="auto-awesome" size={20} color={colors.accent.primary} />
                            </View>
                            <View style={styles.settingLabelContainer}>
                                <Text style={styles.settingLabel}>Smart Suggestions</Text>
                                <Text style={styles.settingSubLabel}>AI-powered weight & rep predictions</Text>
                            </View>
                            <Switch
                                value={smartSuggestions}
                                onValueChange={(val) => onToggleSetting('smartSuggestions', val)}
                                trackColor={{ false: colors.background.tertiary, true: colors.accent.primary }}
                            />
                        </View>

                        {/* Progression Nudges — only shown when Smart Suggestions is ON */}
                        {smartSuggestions && (
                            <View style={styles.settingRow}>
                                <View style={styles.rowIconContainer}>
                                    <MaterialIcons name="trending-up" size={20} color={colors.accent.success} />
                                </View>
                                <View style={styles.settingLabelContainer}>
                                    <Text style={styles.settingLabel}>Progression Nudges</Text>
                                    <Text style={styles.settingSubLabel}>Suggest weight increases after consistent sets</Text>
                                </View>
                                <Switch
                                    value={showProgressionNudges}
                                    onValueChange={(val) => onToggleSetting('showProgressionNudges', val)}
                                    trackColor={{ false: colors.background.tertiary, true: colors.accent.primary }}
                                />
                            </View>
                        )}
                    </View>

                    {/* Bottom spacer */}
                    <View style={{ height: spacing.xxl + insets.bottom }} />
                </ScrollView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.primary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.separator,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.md,
    },
    section: {
        marginTop: spacing.lg,
    },
    sectionTitle: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.text.secondary,
        letterSpacing: 1,
        marginBottom: spacing.sm,
        marginLeft: spacing.xs,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.xs,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.xs,
    },
    rowIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: colors.background.tertiary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    settingLabelContainer: {
        flex: 1,
        paddingRight: spacing.md,
    },
    rowLabel: {
        flex: 1,
        fontSize: typography.size.md,
        color: colors.text.primary,
    },
    settingLabel: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
        marginBottom: 2,
    },
    settingSubLabel: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
    },
    stepperControls: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.md,
    },
    stepperButton: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    stepperButtonDisabled: {
        opacity: 0.3,
    },
    stepperButtonText: {
        color: colors.text.primary,
        fontSize: typography.size.lg,
        fontWeight: 'bold',
    },
    stepperValue: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.bold,
        minWidth: 24,
        textAlign: 'center',
    },
    disabledRow: {
        opacity: 0.5,
    },
    disabledText: {
        color: colors.text.disabled,
    },
});
