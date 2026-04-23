/**
 * SplitFormView Component
 *
 * The create/edit form for splits. Manages its own form state (name, schedule,
 * favorite toggle) and handles template selection, rest days, schedule preview,
 * and save/create/delete operations.
 *
 * Extracted from SplitsScreen to isolate form logic from list browsing.
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Alert,
} from 'react-native';
import { Split, SplitScheduleItem, createSplit } from '../models/split';
import {
    saveSplit,
    deleteSplit,
    type Template,
    type SplitInfo,
} from '../services';
import { colors, spacing, borderRadius, typography } from '../theme';
import SplitSchedulePreview from './SplitSchedulePreview';

interface SplitFormViewProps {
    /** If provided, the form is in edit mode for this split */
    editingSplit: Split | null;
    templates: Template[];
    templateSplitsMap: Map<string, SplitInfo[]>;
    expandedTemplateIds: Set<string>;
    activeSplit: Split | null;
    onToggleExpand: (templateId: string) => void;
    onOpenCreateTemplate: () => void;
    onCancel: () => void;
    /** Called after a successful save/create/delete so parent can reload and update state */
    onSaved: (options?: { deletedActiveSplit?: boolean }) => void;
}

export default function SplitFormView({
    editingSplit,
    templates,
    templateSplitsMap,
    expandedTemplateIds,
    activeSplit,
    onToggleExpand,
    onOpenCreateTemplate,
    onCancel,
    onSaved,
}: SplitFormViewProps) {
    const [splitName, setSplitName] = useState('');
    const [scheduleItems, setScheduleItems] = useState<SplitScheduleItem[]>([]);
    const [isFavorite, setIsFavorite] = useState(false);

    // Populate form when editing
    useEffect(() => {
        if (editingSplit) {
            setSplitName(editingSplit.name);
            setScheduleItems([...editingSplit.schedule]);
            setIsFavorite(editingSplit.isFavorite || false);
        } else {
            setSplitName('');
            setScheduleItems([]);
            setIsFavorite(false);
        }
    }, [editingSplit]);

    // --- Schedule management ---

    const toggleTemplateSelection = (templateId: string) => {
        setScheduleItems(prev => {
            const templateIndex = prev.findIndex(
                item => item.type === 'template' && item.templateId === templateId
            );
            if (templateIndex >= 0) {
                return prev.filter((_, i) => i !== templateIndex);
            } else {
                return [...prev, { type: 'template' as const, templateId }];
            }
        });
    };

    const addRestDay = () => {
        setScheduleItems(prev => [...prev, { type: 'rest' as const }]);
    };

    const removeScheduleItem = (index: number) => {
        setScheduleItems(prev => prev.filter((_, i) => i !== index));
    };

    const getSelectionOrder = (templateId: string): number => {
        const index = scheduleItems.findIndex(
            item => item.type === 'template' && item.templateId === templateId
        );
        return index >= 0 ? index + 1 : 0;
    };

    /** Allow CreateTemplateWizard callback to add a new template to the schedule */
    const addTemplateToSchedule = (templateId: string) => {
        setScheduleItems(prev => [...prev, { type: 'template' as const, templateId }]);
    };

    // --- Save/Create/Delete ---

    const handleCreate = async () => {
        if (!splitName.trim()) {
            Alert.alert('Error', 'Please enter a name for your split.');
            return;
        }
        if (scheduleItems.length === 0) {
            Alert.alert('Error', 'Please add at least one template or rest day.');
            return;
        }

        const templateIds = scheduleItems
            .filter((item): item is { type: 'template'; templateId: string } => item.type === 'template')
            .map(item => item.templateId);

        const split = createSplit(splitName.trim(), templateIds, scheduleItems);
        await saveSplit(split);
        onSaved();
    };

    const handleSave = async () => {
        if (!editingSplit) return;

        if (!splitName.trim()) {
            Alert.alert('Error', 'Please enter a name for your split.');
            return;
        }
        if (scheduleItems.length === 0) {
            Alert.alert('Error', 'Please add at least one template or rest day.');
            return;
        }

        const templateIds = scheduleItems
            .filter((item): item is { type: 'template'; templateId: string } => item.type === 'template')
            .map(item => item.templateId);

        const updatedSplit: Split = {
            ...editingSplit,
            name: splitName.trim(),
            templateIds,
            schedule: scheduleItems,
            isFavorite,
            updatedAt: new Date(),
        };
        await saveSplit(updatedSplit);
        onSaved();
    };

    const handleDelete = () => {
        if (!editingSplit) return;

        if (editingSplit.isBuiltIn) {
            Alert.alert('Cannot Delete', 'Pre-made splits cannot be deleted, but you can edit them.');
            return;
        }

        Alert.alert(
            'Delete Split',
            `Are you sure you want to delete "${editingSplit.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteSplit(editingSplit.id);
                        const deletedActiveSplit = activeSplit?.id === editingSplit.id;
                        onSaved({ deletedActiveSplit });
                    },
                },
            ]
        );
    };

    return (
        <ScrollView style={styles.createForm}>
            <Text style={styles.formLabel}>Split Name</Text>
            <TextInput
                style={styles.input}
                value={splitName}
                onChangeText={setSplitName}
                placeholder="e.g., My PPL Split"
                placeholderTextColor={colors.text.disabled}
            />

            {/* Favorite toggle - only in edit mode */}
            {editingSplit && (
                <TouchableOpacity
                    style={styles.favoriteToggle}
                    onPress={() => setIsFavorite(!isFavorite)}
                >
                    <Text style={styles.favoriteIcon}>{isFavorite ? '★' : '☆'}</Text>
                    <Text style={styles.favoriteText}>
                        {isFavorite ? 'Favorited' : 'Add to Favorites'}
                    </Text>
                </TouchableOpacity>
            )}

            <Text style={styles.formLabel}>Select Templates</Text>

            {/* Create new template inline */}
            <TouchableOpacity
                style={styles.createTemplateButton}
                onPress={onOpenCreateTemplate}
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
                                    {/* Split membership */}
                                    <Text style={styles.templateSplitInfo}>
                                        {(() => {
                                            const splits = templateSplitsMap.get(template.id) || [];
                                            if (splits.length === 0) {
                                                return 'No split yet';
                                            }
                                            return splits.map(s =>
                                                s.isBuiltIn ? `${s.name} (Pre-made)` : s.name
                                            ).join(', ');
                                        })()}
                                    </Text>
                                </View>

                                {/* Expand button */}
                                <TouchableOpacity
                                    style={styles.expandButton}
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        onToggleExpand(template.id);
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

            <SplitSchedulePreview
                scheduleItems={scheduleItems}
                templates={templates}
                onAddRestDay={addRestDay}
                onRemoveItem={removeScheduleItem}
            />

            <View style={styles.formButtons}>
                <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={onCancel}
                >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.saveButton}
                    onPress={editingSplit ? handleSave : handleCreate}
                >
                    <Text style={styles.saveButtonText}>
                        {editingSplit ? 'Save Changes' : 'Create Split'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Delete button - only in edit mode */}
            {editingSplit && !editingSplit.isBuiltIn && (
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={handleDelete}
                >
                    <Text style={styles.deleteButtonText}>Delete Split</Text>
                </TouchableOpacity>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    createForm: {
        flex: 1,
        padding: spacing.md,
    },
    formLabel: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
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
    favoriteToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginTop: spacing.md,
    },
    favoriteIcon: {
        fontSize: 20,
        marginRight: spacing.sm,
        color: colors.accent.warning,
    },
    favoriteText: {
        color: colors.text.primary,
        fontSize: typography.size.md,
    },
    createTemplateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.accent.primary + '15',
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.accent.primary + '40',
        borderStyle: 'dashed',
    },
    createTemplateIcon: {
        color: colors.accent.primary,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        marginRight: spacing.sm,
    },
    createTemplateText: {
        color: colors.accent.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
    },
    emptyText: {
        color: colors.text.disabled,
        fontSize: typography.size.sm,
        textAlign: 'center',
        paddingVertical: spacing.lg,
    },
    templateOption: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.md,
        marginBottom: spacing.sm,
        borderWidth: 2,
        borderColor: 'transparent',
        overflow: 'hidden',
    },
    templateSelected: {
        borderColor: colors.accent.primary,
    },
    templateMainRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
    },
    orderBadge: {
        backgroundColor: colors.accent.primary,
        width: 28,
        height: 28,
        borderRadius: 14,
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
    templateName: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
    },
    templateExercises: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        marginTop: 2,
    },
    templateSplitInfo: {
        color: colors.text.disabled,
        fontSize: typography.size.xs,
        marginTop: 2,
        fontStyle: 'italic',
    },
    expandButton: {
        padding: spacing.sm,
    },
    expandButtonText: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
    },
    exerciseDetails: {
        backgroundColor: colors.background.tertiary,
        padding: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    exerciseDetailText: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        marginBottom: 2,
    },
    formButtons: {
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.lg,
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
    deleteButton: {
        backgroundColor: colors.accent.error + '20',
        borderRadius: borderRadius.md,
        padding: spacing.md,
        alignItems: 'center',
        marginTop: spacing.md,
        marginBottom: spacing.xxl,
    },
    deleteButtonText: {
        color: colors.accent.error,
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
    },
});
