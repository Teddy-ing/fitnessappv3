/**
 * SplitFormView Component
 *
 * The create/edit form for splits. Manages its own form state (name, schedule)
 * and handles template selection, rest days, schedule preview,
 * and save/create/delete operations.
 *
 * Templates are grouped by split membership with collapsible sections.
 * Long-press a template to edit or delete it.
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
import TemplateActionSheet from './TemplateActionSheet';

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
    /** Called when templates change (edit/delete) so parent can refresh */
    onTemplatesChanged: () => void;
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
    onTemplatesChanged,
}: SplitFormViewProps) {
    const [splitName, setSplitName] = useState('');
    const [scheduleItems, setScheduleItems] = useState<SplitScheduleItem[]>([]);
    const [longPressTemplate, setLongPressTemplate] = useState<Template | null>(null);
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

    // Populate form when editing
    useEffect(() => {
        if (editingSplit) {
            setSplitName(editingSplit.name);
            setScheduleItems([...editingSplit.schedule]);
        } else {
            setSplitName('');
            setScheduleItems([]);
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

    const moveScheduleItemUp = (index: number) => {
        if (index === 0) return;
        setScheduleItems(prev => {
            const newList = [...prev];
            [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
            return newList;
        });
    };

    const moveScheduleItemDown = (index: number) => {
        setScheduleItems(prev => {
            if (index >= prev.length - 1) return prev;
            const newList = [...prev];
            [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
            return newList;
        });
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

    // --- Template grouping ---

    const toggleGroupCollapsed = (groupKey: string) => {
        setCollapsedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(groupKey)) {
                newSet.delete(groupKey);
            } else {
                newSet.add(groupKey);
            }
            return newSet;
        });
    };

    const renderTemplateCard = (template: Template) => {
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
                    onLongPress={() => setLongPressTemplate(template)}
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
    };

    const renderGroupedTemplates = () => {
        // Build groups: ungrouped, current split, and other splits
        const ungrouped: Template[] = [];
        const splitGroups = new Map<string, { name: string; isBuiltIn: boolean; templates: Template[] }>();

        for (const template of templates) {
            const splits = templateSplitsMap.get(template.id) || [];
            if (splits.length === 0) {
                ungrouped.push(template);
            } else {
                // Add to each split group (a template can be in multiple splits)
                for (const split of splits) {
                    if (!splitGroups.has(split.id)) {
                        splitGroups.set(split.id, {
                            name: split.isBuiltIn ? `${split.name} (Pre-made)` : split.name,
                            isBuiltIn: split.isBuiltIn,
                            templates: [],
                        });
                    }
                    const group = splitGroups.get(split.id)!;
                    if (!group.templates.find(t => t.id === template.id)) {
                        group.templates.push(template);
                    }
                }
            }
        }

        // Order: current editing split first, then ungrouped, then other user splits, then pre-made
        const sections: React.ReactNode[] = [];

        // Current editing split's templates (if editing)
        if (editingSplit) {
            const currentGroup = splitGroups.get(editingSplit.id);
            if (currentGroup && currentGroup.templates.length > 0) {
                const groupKey = `split-${editingSplit.id}`;
                const isCollapsed = collapsedGroups.has(groupKey);
                sections.push(
                    <View key={groupKey}>
                        <TouchableOpacity
                            style={styles.groupHeader}
                            onPress={() => toggleGroupCollapsed(groupKey)}
                        >
                            <Text style={styles.groupHeaderText}>
                                {isCollapsed ? '▶' : '▼'} {currentGroup.name}
                            </Text>
                            <Text style={styles.groupCount}>{currentGroup.templates.length}</Text>
                        </TouchableOpacity>
                        {!isCollapsed && currentGroup.templates.map(renderTemplateCard)}
                    </View>
                );
                splitGroups.delete(editingSplit.id);
            }
        }

        // Ungrouped templates (always expanded by default)
        if (ungrouped.length > 0) {
            const groupKey = 'ungrouped';
            const isCollapsed = collapsedGroups.has(groupKey);
            sections.push(
                <View key={groupKey}>
                    <TouchableOpacity
                        style={styles.groupHeader}
                        onPress={() => toggleGroupCollapsed(groupKey)}
                    >
                        <Text style={styles.groupHeaderText}>
                            {isCollapsed ? '▶' : '▼'} Ungrouped
                        </Text>
                        <Text style={styles.groupCount}>{ungrouped.length}</Text>
                    </TouchableOpacity>
                    {!isCollapsed && ungrouped.map(renderTemplateCard)}
                </View>
            );
        }

        // Remaining split groups (user splits first, then pre-made)
        const sortedGroups = Array.from(splitGroups.entries())
            .sort(([, a], [, b]) => {
                if (a.isBuiltIn !== b.isBuiltIn) return a.isBuiltIn ? 1 : -1;
                return a.name.localeCompare(b.name);
            });

        for (const [splitId, group] of sortedGroups) {
            const groupKey = `split-${splitId}`;
            // Other split groups default to collapsed — expanded when toggled into the set
            const isCollapsed = !collapsedGroups.has(groupKey);
            sections.push(
                <View key={groupKey}>
                    <TouchableOpacity
                        style={styles.groupHeader}
                        onPress={() => toggleGroupCollapsed(groupKey)}
                    >
                        <Text style={styles.groupHeaderText}>
                            {isCollapsed ? '▶' : '▼'} {group.name}
                        </Text>
                        <Text style={styles.groupCount}>{group.templates.length}</Text>
                    </TouchableOpacity>
                    {!isCollapsed && group.templates.map(renderTemplateCard)}
                </View>
            );
        }

        return <>{sections}</>;
    };

    return (
        <>
        <ScrollView style={styles.createForm}>
            <Text style={styles.formLabel}>Split Name</Text>
            <TextInput
                style={styles.input}
                value={splitName}
                onChangeText={setSplitName}
                placeholder="e.g., My PPL Split"
                placeholderTextColor={colors.text.disabled}
            />


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
                renderGroupedTemplates()
            )}

            <Text style={styles.hintText}>
                Long-press a template to edit or delete it
            </Text>

            <SplitSchedulePreview
                scheduleItems={scheduleItems}
                templates={templates}
                onAddRestDay={addRestDay}
                onRemoveItem={removeScheduleItem}
                onMoveUp={moveScheduleItemUp}
                onMoveDown={moveScheduleItemDown}
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

        {/* Template Edit/Delete Action Sheet */}
        <TemplateActionSheet
            template={longPressTemplate}
            visible={longPressTemplate !== null}
            onClose={() => setLongPressTemplate(null)}
            onTemplateChanged={onTemplatesChanged}
        />
        </>
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
    groupHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.xs,
        marginTop: spacing.sm,
        marginBottom: spacing.xs,
    },
    groupHeaderText: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
    },
    groupCount: {
        color: colors.text.disabled,
        fontSize: typography.size.xs,
        backgroundColor: colors.background.tertiary,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.full,
    },
    hintText: {
        color: colors.text.disabled,
        fontSize: typography.size.xs,
        textAlign: 'center',
        marginTop: spacing.sm,
        marginBottom: spacing.xs,
    },
});
