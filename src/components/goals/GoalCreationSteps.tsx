/**
 * GoalCreationSteps
 *
 * Extracted step renderer components for the GoalCreationModal.
 * Each step renders the content for one wizard step.
 *
 * Extracted to keep GoalCreationModal under the 600-line guardrail.
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing, borderRadius, typography } from '../../theme';
import type { GoalCreationState, ExerciseMetric } from '../../hooks/useGoalCreation';
import type { MeasurementType } from '../../models/measurement';

// ============================================================
// Constants
// ============================================================

export const EXERCISE_METRICS: { id: ExerciseMetric; label: string; description: string; emoji: string }[] = [
    { id: 'exercise_1rm', label: 'Estimated 1RM', description: 'Heaviest weight you can lift once', emoji: '🏋️' },
    { id: 'exercise_volume', label: 'Max Volume', description: 'Most total weight in a single session', emoji: '📊' },
    { id: 'exercise_reps', label: 'Max Reps', description: 'Most reps in a single set', emoji: '🔁' },
];

export const DEADLINE_PRESETS: { label: string; weeks: number }[] = [
    { label: '4 Weeks', weeks: 4 },
    { label: '8 Weeks', weeks: 8 },
    { label: '12 Weeks', weeks: 12 },
    { label: '6 Months', weeks: 26 },
];

// ============================================================
// Step 1: Type Selection
// ============================================================

interface TypeStepProps {
    onSelectExercise: () => void;
    onSelectMeasurement: () => void;
    onSelectConsistency: () => void;
}

export function TypeStep({ onSelectExercise, onSelectMeasurement, onSelectConsistency }: TypeStepProps) {
    return (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>What kind of goal?</Text>
            <Text style={styles.stepSubtitle}>Choose a category to track</Text>

            <TouchableOpacity style={styles.typeCard} onPress={onSelectExercise} activeOpacity={0.7}>
                <Text style={styles.typeEmoji}>🏋️</Text>
                <View style={styles.typeCardText}>
                    <Text style={styles.typeCardTitle}>Exercise</Text>
                    <Text style={styles.typeCardDesc}>1RM, Volume, or Max Reps</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={colors.text.secondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.typeCard} onPress={onSelectMeasurement} activeOpacity={0.7}>
                <Text style={styles.typeEmoji}>📏</Text>
                <View style={styles.typeCardText}>
                    <Text style={styles.typeCardTitle}>Measurement</Text>
                    <Text style={styles.typeCardDesc}>Bodyweight, Body Fat %, etc.</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={colors.text.secondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.typeCard} onPress={onSelectConsistency} activeOpacity={0.7}>
                <Text style={styles.typeEmoji}>🔥</Text>
                <View style={styles.typeCardText}>
                    <Text style={styles.typeCardTitle}>Consistency</Text>
                    <Text style={styles.typeCardDesc}>Total workouts completed</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
        </View>
    );
}

// ============================================================
// Step 2b: Exercise Metric Selection
// ============================================================

interface ExerciseMetricStepProps {
    exerciseName: string;
    onSelectMetric: (metric: ExerciseMetric) => void;
}

export function ExerciseMetricStep({ exerciseName, onSelectMetric }: ExerciseMetricStepProps) {
    return (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{exerciseName}</Text>
            <Text style={styles.stepSubtitle}>Choose what to track</Text>

            {EXERCISE_METRICS.map((metric) => (
                <TouchableOpacity
                    key={metric.id}
                    style={styles.typeCard}
                    onPress={() => onSelectMetric(metric.id)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.typeEmoji}>{metric.emoji}</Text>
                    <View style={styles.typeCardText}>
                        <Text style={styles.typeCardTitle}>{metric.label}</Text>
                        <Text style={styles.typeCardDesc}>{metric.description}</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color={colors.text.secondary} />
                </TouchableOpacity>
            ))}
        </View>
    );
}

// ============================================================
// Step 2a: Measurement Type Selection
// ============================================================

interface MeasurementStepProps {
    types: MeasurementType[];
    onSelect: (type: MeasurementType) => void;
}

export function MeasurementStep({ types, onSelect }: MeasurementStepProps) {
    return (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Which measurement?</Text>
            <Text style={styles.stepSubtitle}>Select a body metric to target</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
                {types.map((type) => (
                    <TouchableOpacity
                        key={type.id}
                        style={styles.typeCard}
                        onPress={() => onSelect(type)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.typeEmoji}>📏</Text>
                        <View style={styles.typeCardText}>
                            <Text style={styles.typeCardTitle}>{type.name}</Text>
                            <Text style={styles.typeCardDesc}>{type.unitImperial}</Text>
                        </View>
                        <MaterialIcons name="chevron-right" size={24} color={colors.text.secondary} />
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}

// ============================================================
// Step 3: Target Value
// ============================================================

interface TargetStepProps {
    state: GoalCreationState;
    unitSystem: string;
    onChangeValue: (value: string) => void;
    onConfirm: () => void;
}

export function TargetStep({ state, unitSystem, onChangeValue, onConfirm }: TargetStepProps) {
    const unit = (() => {
        if (state.category === 'consistency') return 'workouts';
        if (state.category === 'measurement') return state.measurementType?.unitImperial ?? '';
        if (state.exerciseMetric === 'exercise_reps') return 'reps';
        return unitSystem;
    })();

    return (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Set your target</Text>
            {state.currentBest !== null && (
                <Text style={styles.currentBestText}>
                    Current best: {Math.round(state.currentBest * 10) / 10} {unit}
                </Text>
            )}

            <View style={styles.targetInputContainer}>
                <TextInput
                    style={styles.targetInput}
                    value={state.targetValue}
                    onChangeText={onChangeValue}
                    placeholder="0"
                    placeholderTextColor={colors.text.disabled}
                    keyboardType="numeric"
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={onConfirm}
                />
                <Text style={styles.targetUnit}>{unit}</Text>
            </View>

            <TouchableOpacity
                style={[styles.continueButton, !state.targetValue && styles.continueButtonDisabled]}
                onPress={onConfirm}
                disabled={!state.targetValue}
                activeOpacity={0.7}
            >
                <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
        </View>
    );
}

// ============================================================
// Step 4: Deadline
// ============================================================

interface DeadlineStepProps {
    deadline: string | null;
    onSetDeadline: (deadline: string | null) => void;
    onConfirm: () => void;
}

export function DeadlineStep({ deadline, onSetDeadline, onConfirm }: DeadlineStepProps) {
    const handlePreset = (weeks: number) => {
        const date = new Date();
        date.setDate(date.getDate() + weeks * 7);
        onSetDeadline(date.toISOString().split('T')[0]);
    };

    return (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Set a deadline</Text>
            <Text style={styles.stepSubtitle}>Optional — helps track if you're on pace</Text>

            <View style={styles.presetGrid}>
                {DEADLINE_PRESETS.map((preset) => {
                    const presetDate = new Date();
                    presetDate.setDate(presetDate.getDate() + preset.weeks * 7);
                    const presetStr = presetDate.toISOString().split('T')[0];
                    const isSelected = deadline === presetStr;

                    return (
                        <TouchableOpacity
                            key={preset.label}
                            style={[styles.presetChip, isSelected && styles.presetChipSelected]}
                            onPress={() => handlePreset(preset.weeks)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.presetChipText, isSelected && styles.presetChipTextSelected]}>
                                {preset.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {deadline && (
                <Text style={styles.deadlinePreview}>
                    Deadline: {new Date(deadline + 'T00:00:00').toLocaleDateString('en-US', {
                        month: 'long', day: 'numeric', year: 'numeric',
                    })}
                </Text>
            )}

            <View style={styles.deadlineActions}>
                <TouchableOpacity
                    style={styles.skipButton}
                    onPress={() => {
                        onSetDeadline(null);
                        onConfirm();
                    }}
                    activeOpacity={0.7}
                >
                    <Text style={styles.skipButtonText}>Skip (open-ended)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.continueButton, styles.continueButtonInRow, !deadline && styles.continueButtonDisabled]}
                    onPress={onConfirm}
                    disabled={!deadline}
                    activeOpacity={0.7}
                >
                    <Text style={styles.continueButtonText}>Continue</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ============================================================
// Step 5: Label
// ============================================================

interface LabelStepProps {
    label: string;
    onChangeLabel: (label: string) => void;
    onConfirm: () => void;
}

export function LabelStep({ label, onChangeLabel, onConfirm }: LabelStepProps) {
    return (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Name this goal</Text>
            <Text style={styles.stepSubtitle}>Optional — add motivation or context</Text>

            <TextInput
                style={styles.labelInput}
                value={label}
                onChangeText={onChangeLabel}
                placeholder="e.g., Summer Cut, Prep for competition"
                placeholderTextColor={colors.text.disabled}
                maxLength={80}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={onConfirm}
            />

            <View style={styles.deadlineActions}>
                <TouchableOpacity
                    style={styles.skipButton}
                    onPress={() => {
                        onChangeLabel('');
                        onConfirm();
                    }}
                    activeOpacity={0.7}
                >
                    <Text style={styles.skipButtonText}>Skip</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.continueButton, styles.continueButtonInRow]} onPress={onConfirm} activeOpacity={0.7}>
                    <Text style={styles.continueButtonText}>Continue</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ============================================================
// Step 6: Confirmation
// ============================================================

interface ConfirmStepProps {
    state: GoalCreationState;
    unitSystem: string;
    onSubmit: () => void;
}

export function ConfirmStep({ state, unitSystem, onSubmit }: ConfirmStepProps) {
    const targetName = (() => {
        if (state.category === 'exercise') {
            const metricLabel = EXERCISE_METRICS.find((m) => m.id === state.exerciseMetric)?.label ?? '';
            return `${state.exercise?.name ?? 'Exercise'} ${metricLabel}`;
        }
        if (state.category === 'measurement') return state.measurementType?.name ?? 'Measurement';
        return 'Consistency';
    })();

    const unit = (() => {
        if (state.category === 'consistency') return 'workouts';
        if (state.category === 'measurement') return state.measurementType?.unitImperial ?? '';
        if (state.exerciseMetric === 'exercise_reps') return 'reps';
        return unitSystem;
    })();

    return (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Confirm your goal</Text>

            <View style={styles.confirmCard}>
                <Text style={styles.confirmLabel}>Target</Text>
                <Text style={styles.confirmValue}>{targetName}</Text>

                <View style={styles.confirmDivider} />
                <Text style={styles.confirmLabel}>Goal</Text>
                <Text style={styles.confirmValue}>{state.targetValue} {unit}</Text>

                {state.currentBest !== null && (
                    <>
                        <View style={styles.confirmDivider} />
                        <Text style={styles.confirmLabel}>Current Best</Text>
                        <Text style={styles.confirmValue}>
                            {Math.round(state.currentBest * 10) / 10} {unit}
                        </Text>
                    </>
                )}

                {state.deadline && (
                    <>
                        <View style={styles.confirmDivider} />
                        <Text style={styles.confirmLabel}>Deadline</Text>
                        <Text style={styles.confirmValue}>
                            {new Date(state.deadline + 'T00:00:00').toLocaleDateString('en-US', {
                                month: 'long', day: 'numeric', year: 'numeric',
                            })}
                        </Text>
                    </>
                )}

                {state.label.trim() && (
                    <>
                        <View style={styles.confirmDivider} />
                        <Text style={styles.confirmLabel}>Label</Text>
                        <Text style={styles.confirmValue}>"{state.label.trim()}"</Text>
                    </>
                )}
            </View>

            <TouchableOpacity
                style={styles.createButton}
                onPress={onSubmit}
                disabled={state.isSubmitting}
                activeOpacity={0.7}
            >
                <LinearGradient colors={colors.gradient.primary} style={styles.createButtonGradient}>
                    {state.isSubmitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.createButtonText}>Create Goal 🎯</Text>
                    )}
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
}

// ============================================================
// Shared Styles
// ============================================================

const styles = StyleSheet.create({
    stepContent: {
        flex: 1,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
    },
    stepTitle: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    stepSubtitle: {
        fontSize: typography.size.md,
        color: colors.text.secondary,
        marginBottom: spacing.xl,
    },

    // Type cards
    typeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.sm,
    },
    typeEmoji: {
        fontSize: 32,
        marginRight: spacing.md,
    },
    typeCardText: {
        flex: 1,
    },
    typeCardTitle: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
        marginBottom: 2,
    },
    typeCardDesc: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
    },

    // Target input
    currentBestText: {
        fontSize: typography.size.md,
        color: colors.accent.primary,
        fontWeight: typography.weight.semibold,
        marginBottom: spacing.lg,
    },
    targetInputContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'center',
        marginBottom: spacing.xl,
    },
    targetInput: {
        fontSize: 48,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        textAlign: 'center',
        minWidth: 120,
        paddingVertical: spacing.md,
    },
    targetUnit: {
        fontSize: typography.size.xl,
        color: colors.text.secondary,
        marginLeft: spacing.sm,
    },

    // Buttons
    continueButton: {
        backgroundColor: colors.accent.primary,
        borderRadius: borderRadius.lg,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        alignItems: 'center',
        alignSelf: 'center',
        marginTop: spacing.lg,
    },
    continueButtonInRow: {
        flex: 1,
        marginTop: 0,
        alignSelf: 'auto' as const,
        paddingHorizontal: spacing.md,
    },
    continueButtonDisabled: {
        opacity: 0.4,
    },
    continueButtonText: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
    },

    // Deadline
    presetGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    presetChip: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.xl,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderWidth: 1,
        borderColor: colors.glass.border,
    },
    presetChipSelected: {
        backgroundColor: colors.accent.primary + '20',
        borderColor: colors.accent.primary,
    },
    presetChipText: {
        fontSize: typography.size.md,
        color: colors.text.primary,
        fontWeight: typography.weight.medium,
    },
    presetChipTextSelected: {
        color: colors.accent.primary,
        fontWeight: typography.weight.semibold,
    },
    deadlinePreview: {
        fontSize: typography.size.md,
        color: colors.text.primary,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    deadlineActions: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: 'auto',
        paddingBottom: spacing.lg,
    },
    skipButton: {
        flex: 1,
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        paddingVertical: spacing.md,
        alignItems: 'center',
    },
    skipButtonText: {
        fontSize: typography.size.md,
        color: colors.text.secondary,
        fontWeight: typography.weight.medium,
    },

    // Label
    labelInput: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.lg,
        fontSize: typography.size.md,
        color: colors.text.primary,
        marginBottom: spacing.md,
    },

    // Confirm
    confirmCard: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.xl,
    },
    confirmLabel: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        marginBottom: 4,
    },
    confirmValue: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    confirmDivider: {
        height: 1,
        backgroundColor: colors.separator,
        marginVertical: spacing.sm,
    },
    createButton: {
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        marginTop: 'auto',
        marginBottom: spacing.lg,
    },
    createButtonGradient: {
        paddingVertical: spacing.md + 4,
        alignItems: 'center',
    },
    createButtonText: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: '#fff',
    },
});
