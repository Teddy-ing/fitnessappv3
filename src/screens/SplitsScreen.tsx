/**
 * SplitsScreen
 * 
 * Modal screen for browsing, selecting, creating, and deleting splits.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Modal,
    TextInput,
    Alert,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, borderRadius, typography } from '../theme';
import { ExercisePicker } from '../components';
import {
    getSplits,
    getActiveSplit,
    setActiveSplit,
    deleteSplit,
    saveSplit,
    getTemplates,
    type Template
} from '../services';
import { Split, createSplit } from '../models/split';
import { Exercise } from '../models/exercise';

interface SplitsScreenProps {
    visible: boolean;
    onClose: () => void;
    onSplitSelected?: (split: Split | null) => void;
}

export default function SplitsScreen({ visible, onClose, onSplitSelected }: SplitsScreenProps) {
    const [splits, setSplits] = useState<Split[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [activeSplit, setActiveSplitState] = useState<Split | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newSplitName, setNewSplitName] = useState('');
    const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);

    // New template creation modal
    const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');
    const [templateCreationStep, setTemplateCreationStep] = useState<'name' | 'exercises'>('name');
    const [pendingTemplateExercises, setPendingTemplateExercises] = useState<Array<{ exercise: Exercise, sets: number }>>([]);
    const [showExercisePicker, setShowExercisePicker] = useState(false);

    // Expanded templates (to show exercise details)
    const [expandedTemplateIds, setExpandedTemplateIds] = useState<Set<string>>(new Set());

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [splitsData, templatesData, active] = await Promise.all([
                getSplits(),
                getTemplates(),
                getActiveSplit(),
            ]);
            setSplits(splitsData);
            setTemplates(templatesData);
            setActiveSplitState(active);
        } catch (error) {
            console.error('Error loading splits:', error);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        if (visible) {
            loadData();
        }
    }, [visible, loadData]);

    const handleSelectSplit = async (split: Split | null) => {
        try {
            await setActiveSplit(split?.id ?? null);
            setActiveSplitState(split);
            onSplitSelected?.(split);
            onClose();
        } catch (error) {
            console.error('Error selecting split:', error);
        }
    };

    const handleDeleteSplit = (split: Split) => {
        if (split.isBuiltIn) {
            Alert.alert('Cannot Delete', 'Built-in splits cannot be deleted.');
            return;
        }

        Alert.alert(
            'Delete Split',
            `Are you sure you want to delete "${split.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteSplit(split.id);
                        if (activeSplit?.id === split.id) {
                            setActiveSplitState(null);
                            onSplitSelected?.(null);
                        }
                        loadData();
                    },
                },
            ]
        );
    };

    const handleCreateSplit = async () => {
        if (!newSplitName.trim()) {
            Alert.alert('Error', 'Please enter a name for your split.');
            return;
        }

        if (selectedTemplateIds.length === 0) {
            Alert.alert('Error', 'Please select at least one template.');
            return;
        }

        const split = createSplit(newSplitName.trim(), selectedTemplateIds);
        await saveSplit(split);

        setNewSplitName('');
        setSelectedTemplateIds([]);
        setIsCreating(false);
        loadData();
    };

    const toggleTemplateSelection = (templateId: string) => {
        setSelectedTemplateIds(prev =>
            prev.includes(templateId)
                ? prev.filter(id => id !== templateId)
                : [...prev, templateId]
        );
    };

    const toggleTemplateExpand = (templateId: string) => {
        setExpandedTemplateIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(templateId)) {
                newSet.delete(templateId);
            } else {
                newSet.add(templateId);
            }
            return newSet;
        });
    };

    const handleCreateNewTemplate = async () => {
        if (!newTemplateName.trim()) return;

        try {
            const { createTemplateFromWorkout } = await import('../services');
            const { createWorkout, createWorkoutExercise } = await import('../models/workout');

            // Create workout with the selected exercises
            const workout = createWorkout(newTemplateName.trim());

            // Add pending exercises to the workout
            pendingTemplateExercises.forEach((pe, index) => {
                const workoutExercise = createWorkoutExercise(pe.exercise, index, pe.sets);
                workout.main.exercises.push(workoutExercise);
            });

            const newTemplate = await createTemplateFromWorkout(workout, newTemplateName.trim());

            if (newTemplate) {
                // Reload templates and auto-select
                const updatedTemplates = await getTemplates();
                setTemplates(updatedTemplates);
                setSelectedTemplateIds(prev => [...prev, newTemplate.id]);
            }

            resetTemplateCreation();
        } catch (error) {
            console.error('Error creating template:', error);
            Alert.alert('Error', 'Failed to create template');
        }
    };

    const resetTemplateCreation = () => {
        setShowCreateTemplateModal(false);
        setNewTemplateName('');
        setTemplateCreationStep('name');
        setPendingTemplateExercises([]);
    };

    const handleAddExerciseToTemplate = (exercise: Exercise) => { // Modified type
        setPendingTemplateExercises(prev => [
            ...prev,
            { exercise, sets: 3 } // Modified object structure
        ]);
        setShowExercisePicker(false);
    };

    const updateExerciseSets = (index: number, sets: number) => {
        setPendingTemplateExercises(prev =>
            prev.map((e, i) => i === index ? { ...e, sets } : e)
        );
    };

    const removeExerciseFromTemplate = (index: number) => {
        setPendingTemplateExercises(prev => prev.filter((_, i) => i !== index));
    };

    // Get order number for a selected template
    const getSelectionOrder = (templateId: string): number => {
        const index = selectedTemplateIds.indexOf(templateId);
        return index >= 0 ? index + 1 : 0;
    };

    const renderSplitCard = (split: Split) => {
        const isActive = activeSplit?.id === split.id;

        return (
            <TouchableOpacity
                key={split.id}
                style={[styles.splitCard, isActive && styles.splitCardActive]}
                onPress={() => handleSelectSplit(split)}
                onLongPress={() => handleDeleteSplit(split)}
            >
                <View style={styles.splitHeader}>
                    <Text style={styles.splitName}>{split.name}</Text>
                    {isActive && <Text style={styles.activeLabel}>Active</Text>}
                    {split.isBuiltIn && <Text style={styles.builtInLabel}>Built-in</Text>}
                </View>
                {split.description && (
                    <Text style={styles.splitDescription}>{split.description}</Text>
                )}
                <Text style={styles.splitTemplates}>
                    {split.templateIds.length} template{split.templateIds.length !== 1 ? 's' : ''}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={styles.closeButton}>Close</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>{isCreating ? 'Create Split' : 'Browse Splits'}</Text>
                    {!isCreating ? (
                        <TouchableOpacity onPress={() => setIsCreating(true)}>
                            <Text style={styles.createButton}>+ New</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.headerPlaceholder} />
                    )}
                </View>

                {isCreating ? (
                    /* Create new split form */
                    <ScrollView style={styles.createForm}>
                        <Text style={styles.formLabel}>Split Name</Text>
                        <TextInput
                            style={styles.input}
                            value={newSplitName}
                            onChangeText={setNewSplitName}
                            placeholder="e.g., My PPL Split"
                            placeholderTextColor={colors.text.disabled}
                        />

                        <Text style={styles.formLabel}>Select Templates</Text>

                        {/* Create new template inline */}
                        <TouchableOpacity
                            style={styles.createTemplateButton}
                            onPress={() => setShowCreateTemplateModal(true)}
                        >
                            <Text style={styles.createTemplateIcon}>+</Text>
                            <Text style={styles.createTemplateText}>Create New Template</Text>
                        </TouchableOpacity>

                        {templates.length === 0 ? (
                            <Text style={styles.emptyText}>
                                No templates yet. Tap above to create one, or save workouts as templates.
                            </Text>
                        ) : (
                            templates.map(template => {
                                const order = getSelectionOrder(template.id);
                                const isExpanded = expandedTemplateIds.has(template.id);
                                const isSelected = order > 0;

                                return (
                                    <View key={template.id} style={[
                                        styles.templateOption,
                                        isSelected && styles.templateSelected
                                    ]}>
                                        <TouchableOpacity
                                            style={styles.templateMainRow}
                                            onPress={() => toggleTemplateSelection(template.id)}
                                        >
                                            {/* Order badge */}
                                            {isSelected && (
                                                <View style={styles.orderBadge}>
                                                    <Text style={styles.orderBadgeText}>{order}</Text>
                                                </View>
                                            )}

                                            <View style={styles.templateInfo}>
                                                <Text style={styles.templateName}>{template.name}</Text>
                                                <Text style={styles.templateExercises}>
                                                    {template.exerciseCount} exercises
                                                </Text>
                                            </View>

                                            {/* Expand button */}
                                            <TouchableOpacity
                                                style={styles.expandButton}
                                                onPress={(e) => {
                                                    e.stopPropagation();
                                                    toggleTemplateExpand(template.id);
                                                }}
                                            >
                                                <Text style={styles.expandButtonText}>
                                                    {isExpanded ? '▲' : '▼'}
                                                </Text>
                                            </TouchableOpacity>
                                        </TouchableOpacity>

                                        {/* Expanded exercise details */}
                                        {isExpanded && template.exercises && (
                                            <View style={styles.exerciseDetails}>
                                                {template.exercises.map((ex, idx) => (
                                                    <Text key={idx} style={styles.exerciseDetailText}>
                                                        • {ex.exercise.name} ({ex.defaultSets || 3} sets)
                                                    </Text>
                                                ))}
                                                {(!template.exercises || template.exercises.length === 0) && (
                                                    <Text style={styles.exerciseDetailText}>
                                                        No exercises yet
                                                    </Text>
                                                )}
                                            </View>
                                        )}
                                    </View>
                                );
                            })
                        )}

                        <View style={styles.formButtons}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => {
                                    setIsCreating(false);
                                    setNewSplitName('');
                                    setSelectedTemplateIds([]);
                                }}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.saveButton}
                                onPress={handleCreateSplit}
                            >
                                <Text style={styles.saveButtonText}>Create Split</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                ) : (
                    /* Split list */
                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        refreshControl={
                            <RefreshControl refreshing={isLoading} onRefresh={loadData} />
                        }
                    >
                        {/* Clear selection option */}
                        <TouchableOpacity
                            style={[styles.splitCard, !activeSplit && styles.splitCardActive]}
                            onPress={() => handleSelectSplit(null)}
                        >
                            <Text style={styles.splitName}>No Split (Show All Templates)</Text>
                            <Text style={styles.splitDescription}>
                                Display all templates without grouping
                            </Text>
                        </TouchableOpacity>

                        {/* User splits */}
                        {splits.filter(s => !s.isBuiltIn).length > 0 && (
                            <>
                                <Text style={styles.sectionTitle}>Your Splits</Text>
                                {splits.filter(s => !s.isBuiltIn).map(renderSplitCard)}
                            </>
                        )}

                        {/* Built-in splits */}
                        {splits.filter(s => s.isBuiltIn).length > 0 && (
                            <>
                                <Text style={styles.sectionTitle}>Pre-made Splits</Text>
                                {splits.filter(s => s.isBuiltIn).map(renderSplitCard)}
                            </>
                        )}

                        {splits.length === 0 && !isLoading && (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyIcon}>📋</Text>
                                <Text style={styles.emptyTitle}>No Splits Yet</Text>
                                <Text style={styles.emptySubtitle}>
                                    Create templates first, then group them into splits
                                </Text>
                            </View>
                        )}

                        <Text style={styles.hint}>
                            Long-press a user split to delete it
                        </Text>
                    </ScrollView>
                )}
            </SafeAreaView>

            {/* Create Template Modal */}
            <Modal
                visible={showCreateTemplateModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowCreateTemplateModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {templateCreationStep === 'name' ? (
                            // Step 1: Name
                            <>
                                <Text style={styles.modalTitle}>Create New Template</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={newTemplateName}
                                    onChangeText={setNewTemplateName}
                                    placeholder="Template name (e.g., Push Day)"
                                    placeholderTextColor={colors.text.disabled}
                                    autoFocus={true}
                                />
                                <View style={styles.modalButtons}>
                                    <TouchableOpacity
                                        style={styles.modalCancelButton}
                                        onPress={resetTemplateCreation}
                                    >
                                        <Text style={styles.modalCancelText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.modalCreateButton, !newTemplateName.trim() && styles.buttonDisabled]}
                                        onPress={() => setTemplateCreationStep('exercises')}
                                        disabled={!newTemplateName.trim()}
                                    >
                                        <Text style={styles.modalCreateText}>Next →</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        ) : (
                            // Step 2: Exercises
                            <>
                                <Text style={styles.modalTitle}>{newTemplateName}</Text>
                                <Text style={styles.modalSubtitle}>Add exercises to your template</Text>

                                <ScrollView style={styles.exerciseListScroll}>
                                    {pendingTemplateExercises.length === 0 ? (
                                        <Text style={styles.emptyExerciseText}>
                                            No exercises yet. Tap + Add Exercise below.
                                        </Text>
                                    ) : (
                                        pendingTemplateExercises.map((pe, index) => (
                                            <View key={index} style={styles.pendingExerciseRow}>
                                                <View style={styles.pendingExerciseInfo}>
                                                    <Text style={styles.pendingExerciseName}>{pe.exercise.name}</Text>
                                                    <View style={styles.setsControl}>
                                                        <TouchableOpacity
                                                            onPress={() => updateExerciseSets(index, Math.max(1, pe.sets - 1))}
                                                            style={styles.setsButton}
                                                        >
                                                            <Text style={styles.setsButtonText}>−</Text>
                                                        </TouchableOpacity>
                                                        <Text style={styles.setsText}>{pe.sets} sets</Text>
                                                        <TouchableOpacity
                                                            onPress={() => updateExerciseSets(index, pe.sets + 1)}
                                                            style={styles.setsButton}
                                                        >
                                                            <Text style={styles.setsButtonText}>+</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                                <TouchableOpacity
                                                    onPress={() => removeExerciseFromTemplate(index)}
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
                                        onPress={() => setTemplateCreationStep('name')}
                                    >
                                        <Text style={styles.modalCancelText}>← Back</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.modalCreateButton}
                                        onPress={handleCreateNewTemplate}
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
                    onSelect={handleAddExerciseToTemplate}
                />
            </Modal>
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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    closeButton: {
        color: colors.text.secondary,
        fontSize: typography.size.md,
    },
    title: {
        color: colors.text.primary,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
    },
    createButton: {
        color: colors.accent.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
    },
    headerPlaceholder: {
        width: 50,  // Same width as Close button for alignment
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.md,
        paddingBottom: spacing.xxl,
    },
    sectionTitle: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    splitCard: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    splitCardActive: {
        borderColor: colors.accent.primary,
    },
    splitHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    splitName: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
        flex: 1,
    },
    activeLabel: {
        color: colors.accent.primary,
        fontSize: typography.size.xs,
        fontWeight: typography.weight.medium,
        backgroundColor: colors.accent.primary + '20',
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
        marginLeft: spacing.sm,
    },
    builtInLabel: {
        color: colors.text.disabled,
        fontSize: typography.size.xs,
        marginLeft: spacing.sm,
    },
    splitDescription: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        marginBottom: spacing.xs,
    },
    splitTemplates: {
        color: colors.text.disabled,
        fontSize: typography.size.sm,
    },
    hint: {
        color: colors.text.disabled,
        fontSize: typography.size.xs,
        textAlign: 'center',
        marginTop: spacing.lg,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: spacing.md,
    },
    emptyTitle: {
        color: colors.text.primary,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        marginBottom: spacing.sm,
    },
    emptySubtitle: {
        color: colors.text.secondary,
        fontSize: typography.size.md,
        textAlign: 'center',
    },

    // Create form styles
    createForm: {
        flex: 1,
        padding: spacing.md,
    },
    formLabel: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
        marginBottom: spacing.sm,
        marginTop: spacing.md,
    },
    input: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        color: colors.text.primary,
        fontSize: typography.size.md,
    },
    templateOption: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    templateSelected: {
        borderColor: colors.accent.primary,
        backgroundColor: colors.accent.primary + '10',
    },
    templateName: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
    },
    templateExercises: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
    },
    emptyText: {
        color: colors.text.secondary,
        fontSize: typography.size.md,
        textAlign: 'center',
        paddingVertical: spacing.lg,
    },
    formButtons: {
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.xl,
    },
    cancelButton: {
        flex: 1,
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: colors.text.secondary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
    },
    saveButton: {
        flex: 1,
        backgroundColor: colors.accent.primary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        alignItems: 'center',
    },
    saveButtonText: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
    },
    createTemplateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.accent.primary,
        borderStyle: 'dashed',
    },
    createTemplateIcon: {
        color: colors.accent.primary,
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        marginRight: spacing.sm,
    },
    createTemplateText: {
        color: colors.accent.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
    },

    // Template card with order and expand
    templateMainRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    orderBadge: {
        backgroundColor: colors.accent.primary,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    orderBadgeText: {
        color: colors.text.primary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.bold,
    },
    templateInfo: {
        flex: 1,
    },
    expandButton: {
        padding: spacing.sm,
    },
    expandButtonText: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
    },
    exerciseDetails: {
        marginTop: spacing.sm,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    exerciseDetailText: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        marginBottom: 2,
    },

    // Create template modal
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
