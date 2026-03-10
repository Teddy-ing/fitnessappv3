/**
 * CreateTemplateWizard Component
 *
 * A self-contained 2-step modal wizard for creating a new template:
 *   Step 1 ("name"):     Enter template name
 *   Step 2 ("exercises"): Add exercises with configurable set counts
 *
 * Extracted from SplitsScreen to reduce component complexity.
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Modal,
    TextInput,
    Alert,
} from 'react-native';
import { ExercisePicker } from '../components';
import { getTemplates, createTemplateFromWorkout, type Template } from '../services';
import { Exercise } from '../models/exercise';
import { createWorkout, createWorkoutExercise } from '../models/workout';
import { colors, spacing, borderRadius, typography } from '../theme';
import { SplitScheduleItem } from '../models/split';

interface PendingExercise {
    exercise: Exercise;
    sets: number;
}

interface CreateTemplateWizardProps {
    visible: boolean;
    onClose: () => void;
    /** Called after a template is successfully created */
    onTemplateCreated: (templateId: string, updatedTemplates: Template[]) => void;
}

export default function CreateTemplateWizard({
    visible,
    onClose,
    onTemplateCreated,
}: CreateTemplateWizardProps) {
    const [templateName, setTemplateName] = useState('');
    const [step, setStep] = useState<'name' | 'exercises'>('name');
    const [pendingExercises, setPendingExercises] = useState<PendingExercise[]>([]);
    const [showExercisePicker, setShowExercisePicker] = useState(false);

    const reset = () => {
        setTemplateName('');
        setStep('name');
        setPendingExercises([]);
        setShowExercisePicker(false);
        onClose();
    };

    const handleCreate = async () => {
        if (!templateName.trim()) return;

        try {
            // Create a workout structure to pass to createTemplateFromWorkout
            const workout = createWorkout(templateName.trim());
            pendingExercises.forEach((pe, index) => {
                const workoutExercise = createWorkoutExercise(pe.exercise, index, pe.sets);
                workout.main.exercises.push(workoutExercise);
            });

            const newTemplate = await createTemplateFromWorkout(workout, templateName.trim());

            if (newTemplate) {
                const updatedTemplates = await getTemplates();
                onTemplateCreated(newTemplate.id, updatedTemplates);
            }

            reset();
        } catch (error) {
            console.error('Error creating template:', error);
            Alert.alert('Error', 'Failed to create template');
        }
    };

    const handleAddExercise = (exercise: Exercise) => {
        setPendingExercises(prev => [...prev, { exercise, sets: 3 }]);
        setShowExercisePicker(false);
    };

    const updateSets = (index: number, sets: number) => {
        setPendingExercises(prev =>
            prev.map((e, i) => i === index ? { ...e, sets } : e)
        );
    };

    const removeExercise = (index: number) => {
        setPendingExercises(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={reset}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {step === 'name' ? (
                        // Step 1: Name
                        <>
                            <Text style={styles.modalTitle}>Create New Template</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={templateName}
                                onChangeText={setTemplateName}
                                placeholder="Template name (e.g., Push Day)"
                                placeholderTextColor={colors.text.disabled}
                                autoFocus={true}
                            />
                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={styles.modalCancelButton}
                                    onPress={reset}
                                >
                                    <Text style={styles.modalCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalCreateButton, !templateName.trim() && styles.buttonDisabled]}
                                    onPress={() => setStep('exercises')}
                                    disabled={!templateName.trim()}
                                >
                                    <Text style={styles.modalCreateText}>Next →</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        // Step 2: Exercises
                        <>
                            <Text style={styles.modalTitle}>{templateName}</Text>
                            <Text style={styles.modalSubtitle}>Add exercises to your template</Text>

                            <ScrollView style={styles.exerciseListScroll}>
                                {pendingExercises.length === 0 ? (
                                    <Text style={styles.emptyExerciseText}>
                                        No exercises yet. Tap + Add Exercise below.
                                    </Text>
                                ) : (
                                    pendingExercises.map((pe, index) => (
                                        <View key={index} style={styles.pendingExerciseRow}>
                                            <View style={styles.pendingExerciseInfo}>
                                                <Text style={styles.pendingExerciseName}>{pe.exercise.name}</Text>
                                                <View style={styles.setsControl}>
                                                    <TouchableOpacity
                                                        onPress={() => updateSets(index, Math.max(1, pe.sets - 1))}
                                                        style={styles.setsButton}
                                                    >
                                                        <Text style={styles.setsButtonText}>−</Text>
                                                    </TouchableOpacity>
                                                    <Text style={styles.setsText}>{pe.sets} sets</Text>
                                                    <TouchableOpacity
                                                        onPress={() => updateSets(index, pe.sets + 1)}
                                                        style={styles.setsButton}
                                                    >
                                                        <Text style={styles.setsButtonText}>+</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                            <TouchableOpacity
                                                onPress={() => removeExercise(index)}
                                                style={styles.removeButton}
                                            >
                                                <Text style={styles.removeButtonText}>✕</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ))
                                )}
                            </ScrollView>

                            <TouchableOpacity
                                style={styles.addExerciseButton}
                                onPress={() => setShowExercisePicker(true)}
                            >
                                <Text style={styles.addExerciseText}>+ Add Exercise</Text>
                            </TouchableOpacity>

                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={styles.modalCancelButton}
                                    onPress={() => setStep('name')}
                                >
                                    <Text style={styles.modalCancelText}>← Back</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.modalCreateButton}
                                    onPress={handleCreate}
                                >
                                    <Text style={styles.modalCreateText}>Create</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </View>
            </View>

            {/* Exercise Picker */}
            <ExercisePicker
                visible={showExercisePicker}
                onClose={() => setShowExercisePicker(false)}
                onSelect={handleAddExercise}
            />
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    modalContent: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        width: '100%',
        maxWidth: 400,
    },
    modalTitle: {
        color: colors.text.primary,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        marginBottom: spacing.md,
        textAlign: 'center',
    },
    modalInput: {
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        color: colors.text.primary,
        fontSize: typography.size.md,
        marginBottom: spacing.lg,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    modalCancelButton: {
        flex: 1,
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        alignItems: 'center',
    },
    modalCancelText: {
        color: colors.text.secondary,
        fontSize: typography.size.md,
    },
    modalCreateButton: {
        flex: 1,
        backgroundColor: colors.accent.primary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        alignItems: 'center',
    },
    modalCreateText: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    modalSubtitle: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        marginBottom: spacing.md,
        textAlign: 'center',
    },
    exerciseListScroll: {
        maxHeight: 200,
        marginBottom: spacing.md,
    },
    emptyExerciseText: {
        color: colors.text.disabled,
        fontSize: typography.size.sm,
        textAlign: 'center',
        paddingVertical: spacing.lg,
    },
    pendingExerciseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.md,
        padding: spacing.sm,
        marginBottom: spacing.sm,
    },
    pendingExerciseInfo: {
        flex: 1,
    },
    pendingExerciseName: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        marginBottom: spacing.xs,
    },
    setsControl: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    setsButton: {
        backgroundColor: colors.background.secondary,
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    setsButtonText: {
        color: colors.text.primary,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
    },
    setsText: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        marginHorizontal: spacing.sm,
    },
    removeButton: {
        padding: spacing.sm,
    },
    removeButtonText: {
        color: colors.text.secondary,
        fontSize: typography.size.md,
    },
    addExerciseButton: {
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.accent.primary,
        borderStyle: 'dashed',
        marginBottom: spacing.md,
    },
    addExerciseText: {
        color: colors.accent.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
    },
});
