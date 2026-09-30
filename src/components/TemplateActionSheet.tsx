/**
 * TemplateActionSheet Component
 *
 * Modal editor for templates, opened via long-press from SplitFormView.
 * Provides edit (name, exercises with reorder/add/remove/sets) and delete.
 * Mirrors the editing capability of TemplatesScreen but inline in the split flow.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Modal,
    TextInput,
    Alert,
    Keyboard,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import ExercisePicker from './ExercisePicker';
import ExerciseInfoView from './exerciseDetails/ExerciseInfoView';
import { updateTemplate, deleteTemplate, type Template } from '../services';
import { Exercise } from '../models/exercise';
import { colors, spacing, borderRadius, typography } from '../theme';

interface EditExercise {
    exercise: Exercise;
    defaultSets: number;
    supersetGroupId: string | null;
}

interface TemplateActionSheetProps {
    template: Template | null;
    visible: boolean;
    onClose: () => void;
    /** Called after a template is edited or deleted so parent can refresh */
    onTemplateChanged: () => void;
}

export default function TemplateActionSheet({
    template,
    visible,
    onClose,
    onTemplateChanged,
}: TemplateActionSheetProps) {
    const [editName, setEditName] = useState('');
    const [editExercises, setEditExercises] = useState<EditExercise[]>([]);
    const [showExercisePicker, setShowExercisePicker] = useState(false);
    const [infoExercise, setInfoExercise] = useState<Exercise | null>(null);

    useEffect(() => {
        setInfoExercise(null);
        setShowExercisePicker(false);
        if (template) {
            setEditName(template.name);
            setEditExercises(
                template.exercises.map(e => ({
                    exercise: e.exercise,
                    defaultSets: e.defaultSets || 3,
                    supersetGroupId: e.supersetGroupId ?? null,
                }))
            );
        }
    }, [template]);

    useEffect(() => {
        if (!visible) {
            setInfoExercise(null);
            setShowExercisePicker(false);
        }
    }, [visible]);

    // BH-073: Double-tap guard for async save
    const isSavingRef = useRef(false);

    const handleSave = async () => {
        if (!template) return;
        if (isSavingRef.current) return;

        if (!editName.trim()) {
            Alert.alert('Error', 'Please enter a name for your template.');
            return;
        }
        if (editExercises.length === 0) {
            Alert.alert('Error', 'Please add at least one exercise.');
            return;
        }

        isSavingRef.current = true;
        try {
            await updateTemplate(template.id, editName.trim(), editExercises);
            onTemplateChanged();
            onClose();
        } finally {
            isSavingRef.current = false;
        }
    };

    const handleDelete = () => {
        if (!template) return;

        Alert.alert(
            'Delete Template',
            `Are you sure you want to delete "${template.name}"? This will also remove it from any splits.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteTemplate(template.id);
                        onTemplateChanged();
                        onClose();
                    },
                },
            ]
        );
    };

    // Exercise management
    const handleAddExercise = (exercise: Exercise) => {
        setEditExercises(prev => [...prev, { exercise, defaultSets: 3, supersetGroupId: null }]);
        setShowExercisePicker(false);
    };

    const handleRemoveExercise = (index: number) => {
        setEditExercises(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpdateSets = (index: number, sets: number) => {
        setEditExercises(prev => prev.map((item, i) =>
            i === index ? { ...item, defaultSets: Math.max(1, Math.min(10, sets)) } : item
        ));
    };

    const handleMoveUp = (index: number) => {
        if (index === 0) return;
        setEditExercises(prev => {
            const newList = [...prev];
            [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
            return newList;
        });
    };

    const handleMoveDown = (index: number) => {
        setEditExercises(prev => {
            if (index >= prev.length - 1) return prev;
            const newList = [...prev];
            [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
            return newList;
        });
    };

    const handleToggleSuperset = (index: number) => {
        if (index >= editExercises.length - 1) return;
        setEditExercises(prev => {
            const current = prev[index];
            const next = prev[index + 1];

            if (current.supersetGroupId && current.supersetGroupId === next.supersetGroupId) {
                const groupExercises = prev.filter(e => e.supersetGroupId === current.supersetGroupId);
                if (groupExercises.length === 2) {
                    return prev.map((e, i) =>
                        (i === index || i === index + 1) ? { ...e, supersetGroupId: null } : e
                    );
                } else {
                    return prev.map((e, i) =>
                        i === index ? { ...e, supersetGroupId: null } : e
                    );
                }
            } else {
                const newGroupId = next.supersetGroupId || current.supersetGroupId || `superset-${Date.now()}`;
                return prev.map((e, i) =>
                    (i === index || i === index + 1) ? { ...e, supersetGroupId: newGroupId } : e
                );
            }
        });
    };

    if (!template) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            statusBarTranslucent
            navigationBarTranslucent
            onRequestClose={() => {
                if (infoExercise) setInfoExercise(null);
                else if (showExercisePicker) setShowExercisePicker(false);
                else onClose();
            }}
        >
            <SafeAreaProvider>
                <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
                    <View style={styles.container}>
                        <View
                            style={[styles.container, infoExercise && styles.hidden]}
                            pointerEvents={infoExercise ? 'none' : 'auto'}
                            accessibilityElementsHidden={!!infoExercise}
                            importantForAccessibility={infoExercise ? 'no-hide-descendants' : 'auto'}
                        >
                            {/* Header */}
                            <View style={styles.header}>
                                <TouchableOpacity onPress={onClose} style={styles.headerButton} accessibilityRole="button">
                                    <Text style={styles.cancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <Text style={styles.title}>Edit Template</Text>
                                <TouchableOpacity onPress={handleSave} style={styles.headerButton} accessibilityRole="button">
                                    <Text style={styles.saveText}>Save</Text>
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
                                <Text style={styles.formLabel}>Template Name</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editName}
                                    onChangeText={setEditName}
                                    placeholder="e.g., Push Day"
                                    placeholderTextColor={colors.text.disabled}
                                />

                                <Text style={styles.formLabel}>Exercises</Text>
                                {editExercises.map((item, index) => {
                                    const isInSuperset = item.supersetGroupId !== null;
                                    const nextInSameGroup = index < editExercises.length - 1 &&
                                        item.supersetGroupId !== null &&
                                        item.supersetGroupId === editExercises[index + 1].supersetGroupId;

                                    return (
                                        <React.Fragment key={index}>
                                            <View style={[
                                                styles.exerciseRow,
                                                isInSuperset && styles.supersetExerciseRow,
                                            ]}>
                                                {/* Reorder buttons */}
                                                <View style={styles.reorderButtons}>
                                                    <TouchableOpacity
                                                        accessibilityLabel={`Move ${item.exercise.name} up`}
                                                        style={[styles.reorderButton, index === 0 && styles.reorderButtonDisabled]}
                                                        onPress={() => handleMoveUp(index)}
                                                        disabled={index === 0}
                                                    >
                                                        <Text style={styles.reorderButtonText}>▲</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        accessibilityLabel={`Move ${item.exercise.name} down`}
                                                        style={[styles.reorderButton, index === editExercises.length - 1 && styles.reorderButtonDisabled]}
                                                        onPress={() => handleMoveDown(index)}
                                                        disabled={index === editExercises.length - 1}
                                                    >
                                                        <Text style={styles.reorderButtonText}>▼</Text>
                                                    </TouchableOpacity>
                                                </View>
                                                <View style={styles.exerciseInfo}>
                                                    <View style={styles.exerciseNameRow}>
                                                        <Text style={styles.exerciseName}>{item.exercise.name}</Text>
                                                        <TouchableOpacity
                                                            style={styles.infoButton}
                                                            accessibilityRole="button"
                                                            accessibilityLabel={`Information about ${item.exercise.name}`}
                                                            onPress={() => {
                                                                Keyboard.dismiss();
                                                                setInfoExercise(item.exercise);
                                                            }}
                                                        >
                                                            <MaterialIcons name="info-outline" size={20} color={colors.text.secondary} />
                                                        </TouchableOpacity>
                                                    </View>
                                                    <Text style={styles.exerciseMeta}>{item.exercise.category}</Text>
                                                </View>
                                                <View style={styles.setsControl}>
                                                    <TouchableOpacity
                                                        accessibilityLabel={`Decrease sets for ${item.exercise.name}`}
                                                        style={styles.setsButton}
                                                        onPress={() => handleUpdateSets(index, item.defaultSets - 1)}
                                                    >
                                                        <Text style={styles.setsButtonText}>−</Text>
                                                    </TouchableOpacity>
                                                    <Text style={styles.setsText}>{item.defaultSets}</Text>
                                                    <TouchableOpacity
                                                        accessibilityLabel={`Increase sets for ${item.exercise.name}`}
                                                        style={styles.setsButton}
                                                        onPress={() => handleUpdateSets(index, item.defaultSets + 1)}
                                                    >
                                                        <Text style={styles.setsButtonText}>+</Text>
                                                    </TouchableOpacity>
                                                </View>
                                                <TouchableOpacity
                                                    style={styles.removeButton}
                                                    onPress={() => handleRemoveExercise(index)}
                                                >
                                                    <Text style={styles.removeButtonText}>✕</Text>
                                                </TouchableOpacity>
                                            </View>
                                            {/* Superset link button */}
                                            {index < editExercises.length - 1 && (
                                                <TouchableOpacity
                                                    style={[
                                                        styles.supersetLinkButton,
                                                        nextInSameGroup && styles.supersetLinkActive,
                                                    ]}
                                                    onPress={() => handleToggleSuperset(index)}
                                                >
                                                    <Text style={[
                                                        styles.supersetLinkText,
                                                        nextInSameGroup && styles.supersetLinkTextActive,
                                                    ]}>
                                                        {nextInSameGroup ? '🔗 Superset' : '➕ Link as Superset'}
                                                    </Text>
                                                </TouchableOpacity>
                                            )}
                                        </React.Fragment>
                                    );
                                })}

                                <TouchableOpacity
                                    style={styles.addExerciseButton}
                                    onPress={() => setShowExercisePicker(true)}
                                >
                                    <Text style={styles.addExerciseIcon}>+</Text>
                                    <Text style={styles.addExerciseText}>Add Exercise</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.deleteButton}
                                    onPress={handleDelete}
                                >
                                    <Text style={styles.deleteButtonText}>Delete Template</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                        {infoExercise && (
                            <View style={StyleSheet.absoluteFill}>
                                <ExerciseInfoView
                                    exercise={infoExercise}
                                    onBack={() => setInfoExercise(null)}
                                    returnLabel="Back to template"
                                />
                            </View>
                        )}
                    </View>
                </SafeAreaView>
            </SafeAreaProvider>

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
    container: {
        flex: 1,
        backgroundColor: colors.background.primary,
    },
    hidden: {
        // Preserve native scroll layout while the guide covers the editor.
        opacity: 0,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerButton: {
        minHeight: 44,
        minWidth: 44,
        justifyContent: 'center',
    },
    cancelText: {
        color: colors.text.secondary,
        fontSize: typography.size.md,
    },
    title: {
        color: colors.text.primary,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
    },
    saveText: {
        color: colors.accent.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
    },
    content: {
        flex: 1,
        padding: spacing.md,
    },
    formLabel: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        marginBottom: spacing.sm,
        marginTop: spacing.md,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    input: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        color: colors.text.primary,
        fontSize: typography.size.md,
    },
    exerciseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.md,
        padding: spacing.sm,
        marginBottom: spacing.sm,
    },
    reorderButtons: {
        marginRight: spacing.sm,
    },
    reorderButton: {
        padding: 4,
    },
    reorderButtonDisabled: {
        opacity: 0.3,
    },
    reorderButtonText: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
    },
    exerciseInfo: {
        flex: 1,
    },
    exerciseName: {
        flex: 1,
        color: colors.text.primary,
        fontSize: typography.size.md,
        marginBottom: 2,
    },
    exerciseNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoButton: {
        minWidth: 40,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    exerciseMeta: {
        color: colors.text.disabled,
        fontSize: typography.size.xs,
    },
    setsControl: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    setsButton: {
        backgroundColor: colors.background.tertiary,
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
        color: colors.text.primary,
        fontSize: typography.size.md,
        marginHorizontal: spacing.sm,
        minWidth: 20,
        textAlign: 'center',
    },
    removeButton: {
        padding: spacing.sm,
    },
    removeButtonText: {
        color: colors.text.secondary,
        fontSize: typography.size.md,
    },
    addExerciseButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginTop: spacing.sm,
        borderWidth: 1,
        borderColor: colors.accent.primary,
        borderStyle: 'dashed',
    },
    addExerciseIcon: {
        color: colors.accent.primary,
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        marginRight: spacing.sm,
    },
    addExerciseText: {
        color: colors.accent.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
    },
    deleteButton: {
        backgroundColor: colors.accent.error + '20',
        borderRadius: borderRadius.md,
        padding: spacing.md,
        alignItems: 'center',
        marginTop: spacing.xl,
        marginBottom: spacing.xl,
    },
    deleteButtonText: {
        color: colors.accent.error,
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
    },
    supersetExerciseRow: {
        borderLeftWidth: 3,
        borderLeftColor: colors.accent.warning,
    },
    supersetLinkButton: {
        alignItems: 'center',
        paddingVertical: spacing.xs,
        marginBottom: spacing.xs,
    },
    supersetLinkActive: {
        backgroundColor: colors.accent.warning + '15',
        borderRadius: borderRadius.sm,
    },
    supersetLinkText: {
        color: colors.text.disabled,
        fontSize: typography.size.xs,
    },
    supersetLinkTextActive: {
        color: colors.accent.warning,
        fontWeight: typography.weight.medium,
    },
});
