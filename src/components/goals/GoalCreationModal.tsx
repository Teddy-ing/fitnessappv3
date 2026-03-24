/**
 * GoalCreationModal
 *
 * Multi-step creation wizard for goals. Full-screen modal with steps:
 * 1. Type selector (Exercise / Measurement / Consistency)
 * 2. Exercise picker (reuse ExercisePicker) or measurement type picker
 * 2b. Exercise metric picker (1RM / Volume / Reps)
 * 3. Target value input
 * 4. Deadline picker (optional)
 * 5. Custom label (optional)
 * 6. Confirmation card + Create button
 *
 * Step content is rendered by extracted components in GoalCreationSteps.tsx.
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, spacing, typography } from '../../theme';
import { useGoalCreation } from '../../hooks/useGoalCreation';
import { getMeasurementTypes } from '../../services/measurementService';
import { getSettings } from '../../services/preferencesService';
import type { MeasurementType } from '../../models/measurement';
import ExercisePicker from '../ExercisePicker';
import {
    TypeStep,
    ExerciseMetricStep,
    MeasurementStep,
    TargetStep,
    DeadlineStep,
    LabelStep,
    ConfirmStep,
} from './GoalCreationSteps';

// ============================================================
// Props
// ============================================================

interface GoalCreationModalProps {
    visible: boolean;
    onClose: () => void;
    onCreated: () => void;
}

// ============================================================
// Component
// ============================================================

export default function GoalCreationModal({
    visible,
    onClose,
    onCreated,
}: GoalCreationModalProps) {
    const wizard = useGoalCreation();
    const { state } = wizard;

    const [measurementTypes, setMeasurementTypes] = useState<MeasurementType[]>([]);
    const [exercisePickerVisible, setExercisePickerVisible] = useState(false);
    const [unitSystem, setUnitSystem] = useState('lbs');

    // Load measurement types and settings when modal opens
    useEffect(() => {
        if (visible) {
            loadData();
        }
    }, [visible]);

    const loadData = async () => {
        const [types, settings] = await Promise.all([
            getMeasurementTypes(),
            getSettings(),
        ]);
        setMeasurementTypes(types);
        setUnitSystem(settings.weightUnit);
    };

    const handleClose = () => {
        wizard.reset();
        onClose();
    };

    const handleSubmit = async () => {
        const success = await wizard.submit();
        if (success) {
            onCreated();
            onClose();
        }
    };

    // Auto-open exercise picker when on exercise step
    useEffect(() => {
        if (state.step === 'exercise' && visible) {
            setExercisePickerVisible(true);
        }
    }, [state.step, visible]);

    // --------------------------------------------------------
    // Step indicator
    // --------------------------------------------------------

    const renderStepIndicator = () => {
        const stepNames = ['Type', 'Target', 'Value', 'Deadline', 'Label', 'Confirm'];
        const stepIndex = (() => {
            switch (state.step) {
                case 'type': return 0;
                case 'exercise':
                case 'measurement':
                case 'exercise_metric': return 1;
                case 'target': return 2;
                case 'deadline': return 3;
                case 'label': return 4;
                case 'confirm': return 5;
                default: return 0;
            }
        })();

        return (
            <View style={styles.stepIndicator}>
                {stepNames.map((name, i) => (
                    <View key={name} style={styles.stepDot}>
                        <View
                            style={[
                                styles.dot,
                                i <= stepIndex && styles.dotActive,
                                i === stepIndex && styles.dotCurrent,
                            ]}
                        />
                        <Text
                            style={[
                                styles.stepLabel,
                                i <= stepIndex && styles.stepLabelActive,
                            ]}
                        >
                            {name}
                        </Text>
                    </View>
                ))}
            </View>
        );
    };

    // --------------------------------------------------------
    // Step routing
    // --------------------------------------------------------

    const renderCurrentStep = () => {
        switch (state.step) {
            case 'type':
                return (
                    <TypeStep
                        onSelectExercise={() => wizard.selectCategory('exercise')}
                        onSelectMeasurement={() => wizard.selectCategory('measurement')}
                        onSelectConsistency={() => wizard.selectCategory('consistency')}
                    />
                );
            case 'exercise':
                return null; // ExercisePicker modal handles this
            case 'exercise_metric':
                return (
                    <ExerciseMetricStep
                        exerciseName={state.exercise?.name ?? 'Exercise'}
                        onSelectMetric={wizard.selectExerciseMetric}
                    />
                );
            case 'measurement':
                return (
                    <MeasurementStep
                        types={measurementTypes}
                        onSelect={wizard.selectMeasurementType}
                    />
                );
            case 'target':
                return (
                    <TargetStep
                        state={state}
                        unitSystem={unitSystem}
                        onChangeValue={wizard.setTargetValue}
                        onConfirm={wizard.confirmTarget}
                    />
                );
            case 'deadline':
                return (
                    <DeadlineStep
                        deadline={state.deadline}
                        onSetDeadline={wizard.setDeadline}
                        onConfirm={wizard.confirmDeadline}
                    />
                );
            case 'label':
                return (
                    <LabelStep
                        label={state.label}
                        onChangeLabel={wizard.setLabel}
                        onConfirm={wizard.confirmLabel}
                    />
                );
            case 'confirm':
                return (
                    <ConfirmStep
                        state={state}
                        unitSystem={unitSystem}
                        onSubmit={handleSubmit}
                    />
                );
            default:
                return null;
        }
    };

    // --------------------------------------------------------
    // Main render
    // --------------------------------------------------------

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
                {/* Header */}
                <View style={styles.header}>
                    {wizard.canGoBack ? (
                        <TouchableOpacity onPress={wizard.goBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                            <MaterialIcons name="arrow-back" size={24} color={colors.text.primary} />
                        </TouchableOpacity>
                    ) : (
                        <View style={{ width: 24 }} />
                    )}
                    <Text style={styles.headerTitle}>New Goal</Text>
                    <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                        <MaterialIcons name="close" size={24} color={colors.text.secondary} />
                    </TouchableOpacity>
                </View>

                {renderStepIndicator()}
                {renderCurrentStep()}

                {/* Exercise picker modal (nested) */}
                <ExercisePicker
                    visible={exercisePickerVisible}
                    onClose={() => {
                        setExercisePickerVisible(false);
                        if (!state.exercise) {
                            wizard.goBack();
                        }
                    }}
                    onSelect={(exercise) => {
                        setExercisePickerVisible(false);
                        wizard.selectExercise(exercise);
                    }}
                />
            </SafeAreaView>
        </Modal>
    );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.primary,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.separator,
    },
    headerTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
    },
    stepIndicator: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    stepDot: {
        alignItems: 'center',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.background.tertiary,
        marginBottom: 4,
    },
    dotActive: {
        backgroundColor: colors.accent.primary,
    },
    dotCurrent: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    stepLabel: {
        fontSize: 10,
        color: colors.text.disabled,
    },
    stepLabelActive: {
        color: colors.accent.primary,
        fontWeight: typography.weight.semibold,
    },
});
