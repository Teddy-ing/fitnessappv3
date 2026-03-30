/**
 * WorkoutSettingsMenu Component
 * 
 * Top-right popover menu for the Workout Logging screen.
 * Consolidates global preferences like RIR, RPE, Plate Calculator,
 * and default warmup sets.
 */

import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    Pressable,
    StyleSheet,
    Switch,
} from 'react-native';
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

    onToggleSetting: (key: 'showPrevious' | 'showRpe' | 'showRir' | 'showPlateCalc', value: boolean) => void;
    onChangeWarmupSets: (count: number) => void;
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
    onToggleSetting,
    onChangeWarmupSets,
}: WorkoutSettingsMenuProps) {

    // Count active visual columns to enforce max 2 logic
    const activeColumnsCount = [showPrevious, showRpe, showRir].filter(Boolean).length;

    const handleToggle = (
        key: 'showPrevious' | 'showRpe' | 'showRir',
        currentValue: boolean
    ) => {
        // If we are currently INACTIVE and trying to turn ON, check max count
        if (!currentValue && activeColumnsCount >= 2) {
            return; // Can't select more than 2
        }
        onToggleSetting(key, !currentValue);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
                    <View style={styles.titleRow}>
                        <Text style={styles.titleText}>Workout Settings</Text>
                    </View>

                    <View style={styles.divider} />

                    {/* Actions */}
                    <TouchableOpacity style={styles.actionRow} onPress={() => { onClose(); onAddNote(); }}>
                        <Text style={styles.actionText}>Add Workout Note</Text>
                        <Text style={styles.actionIcon}>📝</Text>
                    </TouchableOpacity>

                    <View style={styles.divider} />
                    
                    <Text style={styles.sectionHeader}>VISUAL COLUMNS (MAX 2)</Text>

                    {/* Toggles */}
                    <View style={styles.settingRow}>
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

                    <View style={styles.divider} />
                    
                    <Text style={styles.sectionHeader}>TOOLS</Text>

                    <View style={styles.settingRow}>
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

                    <View style={[styles.settingRow, styles.stepperRow]}>
                        <View style={styles.settingLabelContainer}>
                            <Text style={styles.settingLabel}>Warm-up Sets</Text>
                            <Text style={styles.settingSubLabel}>Default sets added</Text>
                        </View>
                        <View style={styles.stepperControls}>
                            <TouchableOpacity
                                style={[styles.stepperButton, defaultWarmupSets <= 1 && styles.stepperButtonDisabled]}
                                onPress={() => onChangeWarmupSets(Math.max(1, defaultWarmupSets - 1))}
                                disabled={defaultWarmupSets <= 1}
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

                    <View style={styles.divider} />
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Text style={styles.closeText}>Close</Text>
                    </TouchableOpacity>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: colors.background.secondary,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        paddingBottom: spacing.xl,
        paddingTop: spacing.md,
    },
    titleRow: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.sm,
    },
    titleText: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        textAlign: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: colors.separator,
        marginVertical: spacing.xs,
    },
    sectionHeader: {
        color: colors.text.secondary,
        fontSize: typography.size.xs,
        fontWeight: typography.weight.bold,
        paddingHorizontal: spacing.lg,
        marginTop: spacing.md,
        marginBottom: spacing.xs,
        letterSpacing: 0.5,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
    },
    actionText: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
    },
    actionIcon: {
        fontSize: typography.size.lg,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
    },
    settingLabelContainer: {
        flex: 1,
        paddingRight: spacing.md,
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
    stepperRow: {
        paddingVertical: spacing.sm,
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
    closeButton: {
        paddingTop: spacing.md,
        paddingBottom: spacing.xs,
        alignItems: 'center',
    },
    closeText: {
        color: colors.accent.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.bold,
    },
});
