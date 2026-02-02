/**
 * TemplatesScreen
 * 
 * Modal screen for browsing and managing all templates.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Modal,
    Alert,
    RefreshControl,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, borderRadius, typography } from '../theme';
import { getTemplates, deleteTemplate, updateTemplate, toggleTemplateFavorite, type Template } from '../services';
import { ExercisePicker } from '../components';
import { Exercise } from '../models/exercise';

interface TemplatesScreenProps {
    visible: boolean;
    onClose: () => void;
    onSelectTemplate?: (template: Template) => void;
}

export default function TemplatesScreen({ visible, onClose, onSelectTemplate }: TemplatesScreenProps) {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Edit mode state
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [editName, setEditName] = useState('');
    const [editExercises, setEditExercises] = useState<Array<{ exercise: Exercise; defaultSets: number }>>([]);
    const [editIsFavorite, setEditIsFavorite] = useState(false);
    const [showExercisePicker, setShowExercisePicker] = useState(false);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const templatesData = await getTemplates();
            setTemplates(templatesData);
        } catch (error) {
            console.error('Error loading templates:', error);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        if (visible) {
            loadData();
        }
    }, [visible, loadData]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    // Open edit mode
    const handleEditTemplate = (template: Template) => {
        setEditingTemplate(template);
        setEditName(template.name);
        setEditExercises(
            template.exercises.map(e => ({
                exercise: e.exercise,
                defaultSets: e.defaultSets || 3,
            }))
        );
        setEditIsFavorite(template.isFavorite || false);
    };

    // Save template changes
    const handleSaveTemplate = async () => {
        if (!editingTemplate) return;

        if (!editName.trim()) {
            Alert.alert('Error', 'Please enter a name for your template.');
            return;
        }

        if (editExercises.length === 0) {
            Alert.alert('Error', 'Please add at least one exercise.');
            return;
        }

        await updateTemplate(editingTemplate.id, editName.trim(), editExercises);

        // Toggle favorite if changed
        if (editIsFavorite !== (editingTemplate.isFavorite || false)) {
            await toggleTemplateFavorite(editingTemplate.id);
        }

        setEditingTemplate(null);
        setEditName('');
        setEditExercises([]);
        loadData();
    };

    // Cancel editing
    const handleCancelEdit = () => {
        setEditingTemplate(null);
        setEditName('');
        setEditExercises([]);
    };

    // Delete template (from edit mode)
    const handleDeleteTemplate = () => {
        if (!editingTemplate) return;

        Alert.alert(
            'Delete Template',
            `Are you sure you want to delete "${editingTemplate.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteTemplate(editingTemplate.id);
                        setEditingTemplate(null);
                        setEditName('');
                        setEditExercises([]);
                        loadData();
                    }
                }
            ]
        );
    };

    // Toggle favorite from list view (optimistic update to prevent flash)
    const handleToggleFavorite = async (templateId: string) => {
        // Optimistically update local state immediately
        setTemplates(prev => prev.map(t =>
            t.id === templateId ? { ...t, isFavorite: !t.isFavorite } : t
        ));
        // Persist to database
        await toggleTemplateFavorite(templateId);
    };

    // Add exercise from picker
    const handleAddExercise = (exercise: Exercise) => {
        setEditExercises(prev => [...prev, { exercise, defaultSets: 3 }]);
        setShowExercisePicker(false);
    };

    // Remove exercise
    const handleRemoveExercise = (index: number) => {
        setEditExercises(prev => prev.filter((_, i) => i !== index));
    };

    // Update sets
    const handleUpdateSets = (index: number, sets: number) => {
        setEditExercises(prev => prev.map((item, i) =>
            i === index ? { ...item, defaultSets: Math.max(1, Math.min(10, sets)) } : item
        ));
    };

    // Move exercise up
    const handleMoveUp = (index: number) => {
        if (index === 0) return;
        setEditExercises(prev => {
            const newList = [...prev];
            [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
            return newList;
        });
    };

    // Move exercise down
    const handleMoveDown = (index: number) => {
        setEditExercises(prev => {
            if (index >= prev.length - 1) return prev;
            const newList = [...prev];
            [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
            return newList;
        });
    };

    const handleSelectTemplate = (template: Template) => {
        if (onSelectTemplate) {
            onSelectTemplate(template);
        }
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={editingTemplate ? handleCancelEdit : onClose}>
                        <Text style={styles.closeButton}>
                            {editingTemplate ? 'Cancel' : 'Close'}
                        </Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>
                        {editingTemplate ? 'Edit Template' : 'All Templates'}
                    </Text>
                    {editingTemplate ? (
                        <TouchableOpacity onPress={handleSaveTemplate}>
                            <Text style={styles.saveButton}>Save</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.headerPlaceholder} />
                    )}
                </View>

                {editingTemplate ? (
                    /* Edit template form */
                    <ScrollView style={styles.content}>
                        <Text style={styles.formLabel}>Template Name</Text>
                        <TextInput
                            style={styles.input}
                            value={editName}
                            onChangeText={setEditName}
                            placeholder="e.g., Push Day"
                            placeholderTextColor={colors.text.disabled}
                        />

                        {/* Favorite toggle */}
                        <TouchableOpacity
                            style={styles.favoriteToggle}
                            onPress={() => setEditIsFavorite(!editIsFavorite)}
                        >
                            <Text style={styles.favoriteIcon}>{editIsFavorite ? '★' : '☆'}</Text>
                            <Text style={styles.favoriteText}>
                                {editIsFavorite ? 'Favorited' : 'Add to Favorites'}
                            </Text>
                        </TouchableOpacity>

                        <Text style={styles.formLabel}>Exercises</Text>
                        {editExercises.map((item, index) => (
                            <View key={index} style={styles.exerciseRow}>
                                {/* Reorder buttons */}
                                <View style={styles.reorderButtons}>
                                    <TouchableOpacity
                                        style={[styles.reorderButton, index === 0 && styles.reorderButtonDisabled]}
                                        onPress={() => handleMoveUp(index)}
                                        disabled={index === 0}
                                    >
                                        <Text style={styles.reorderButtonText}>▲</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.reorderButton, index === editExercises.length - 1 && styles.reorderButtonDisabled]}
                                        onPress={() => handleMoveDown(index)}
                                        disabled={index === editExercises.length - 1}
                                    >
                                        <Text style={styles.reorderButtonText}>▼</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.exerciseInfo}>
                                    <Text style={styles.exerciseName}>{item.exercise.name}</Text>
                                    <Text style={styles.exerciseMeta}>{item.exercise.category}</Text>
                                </View>
                                <View style={styles.setsControl}>
                                    <TouchableOpacity
                                        style={styles.setsButton}
                                        onPress={() => handleUpdateSets(index, item.defaultSets - 1)}
                                    >
                                        <Text style={styles.setsButtonText}>−</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.setsText}>{item.defaultSets}</Text>
                                    <TouchableOpacity
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
                        ))}

                        <TouchableOpacity
                            style={styles.addExerciseButton}
                            onPress={() => setShowExercisePicker(true)}
                        >
                            <Text style={styles.addExerciseIcon}>+</Text>
                            <Text style={styles.addExerciseText}>Add Exercise</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.deleteTemplateButton}
                            onPress={handleDeleteTemplate}
                        >
                            <Text style={styles.deleteTemplateButtonText}>Delete Template</Text>
                        </TouchableOpacity>
                    </ScrollView>
                ) : (
                    /* Template list */
                    <ScrollView
                        style={styles.content}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor={colors.text.primary}
                            />
                        }
                    >
                        {isLoading ? (
                            <Text style={styles.loadingText}>Loading...</Text>
                        ) : templates.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyTitle}>No Templates</Text>
                                <Text style={styles.emptySubtitle}>
                                    Complete a workout and save it as a template to see it here.
                                </Text>
                            </View>
                        ) : (
                            [...templates]
                                .sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0))
                                .map(template => (
                                    <TouchableOpacity
                                        key={template.id}
                                        style={styles.templateCard}
                                        onPress={() => handleSelectTemplate(template)}
                                        onLongPress={() => handleEditTemplate(template)}
                                    >
                                        <View style={styles.templateInfo}>
                                            <Text style={styles.templateName}>{template.name}</Text>
                                            <Text style={styles.templateMeta}>
                                                {template.exerciseCount} exercises • Used {template.useCount} times
                                            </Text>
                                            {template.exercises && template.exercises.length > 0 && (
                                                <Text style={styles.templateExercises} numberOfLines={1}>
                                                    {template.exercises.map(e => e.exercise.name).join(', ')}
                                                </Text>
                                            )}
                                        </View>
                                        <TouchableOpacity
                                            style={styles.starButton}
                                            onPress={() => handleToggleFavorite(template.id)}
                                        >
                                            <Text style={[styles.starButtonText, template.isFavorite && styles.starButtonActive]}>
                                                {template.isFavorite ? '★' : '☆'}
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.editButton}
                                            onPress={() => handleEditTemplate(template)}
                                        >
                                            <Text style={styles.editButtonText}>✎</Text>
                                        </TouchableOpacity>
                                    </TouchableOpacity>
                                ))
                        )}

                        <Text style={styles.hint}>
                            Long-press a template to edit it
                        </Text>
                    </ScrollView>
                )}
            </SafeAreaView>

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
        color: colors.accent.primary,
        fontSize: typography.size.md,
    },
    title: {
        color: colors.text.primary,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
    },
    headerPlaceholder: {
        width: 50,
    },
    saveButton: {
        color: colors.accent.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
    },
    content: {
        flex: 1,
        padding: spacing.md,
    },
    loadingText: {
        color: colors.text.secondary,
        textAlign: 'center',
        padding: spacing.xl,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyTitle: {
        color: colors.text.primary,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        marginBottom: spacing.sm,
    },
    emptySubtitle: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        textAlign: 'center',
    },
    templateCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    templateInfo: {
        flex: 1,
    },
    templateName: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
        marginBottom: spacing.xs,
    },
    templateMeta: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        marginBottom: spacing.xs,
    },
    templateExercises: {
        color: colors.text.disabled,
        fontSize: typography.size.xs,
    },
    editButton: {
        padding: spacing.sm,
    },
    editButtonText: {
        color: colors.text.secondary,
        fontSize: typography.size.lg,
    },
    starButton: {
        padding: spacing.sm,
    },
    starButtonText: {
        color: colors.text.secondary,
        fontSize: 20,
    },
    starButtonActive: {
        color: colors.accent.warning,
    },
    hint: {
        color: colors.text.disabled,
        fontSize: typography.size.xs,
        textAlign: 'center',
        marginTop: spacing.md,
        marginBottom: spacing.xl,
    },
    favoriteToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
    },
    favoriteIcon: {
        fontSize: 24,
        color: colors.accent.warning,
        marginRight: spacing.sm,
    },
    favoriteText: {
        color: colors.text.secondary,
        fontSize: typography.size.md,
    },

    // Edit form styles
    formLabel: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
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
    exerciseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.md,
        padding: spacing.sm,
        marginBottom: spacing.sm,
    },
    exerciseInfo: {
        flex: 1,
    },
    exerciseName: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        marginBottom: 2,
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
    deleteTemplateButton: {
        backgroundColor: colors.accent.error,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        alignItems: 'center',
        marginTop: spacing.xl,
        marginBottom: spacing.xl,
    },
    deleteTemplateButtonText: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
    },
});
