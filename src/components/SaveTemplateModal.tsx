/**
 * SaveTemplateModal Component
 *
 * Modal for saving a completed workout as a template.
 * Handles the 3-branch flow:
 *   1. No existing template with same name → create new
 *   2. Single existing template → offer overwrite or create new
 *   3. Multiple existing templates → picker for which to overwrite
 *
 * Extracted from WorkoutScreen to reduce component complexity.
 */

import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, Alert, StyleSheet } from 'react-native';
import { Workout, Split } from '../models';
import { colors, spacing, borderRadius, typography } from '../theme';
import {
    createTemplateFromWorkout,
    findTemplatesByName,
    overwriteTemplate,
    getSplitsForTemplate,
} from '../services';

interface SaveTemplateModalProps {
    visible: boolean;
    pendingWorkout: Workout | null;
    activeSplit: Split | null;
    onClose: () => void;
    /** Called after a successful save/overwrite so parent can reload data */
    onSaved: () => void;
}

export default function SaveTemplateModal({
    visible,
    pendingWorkout,
    activeSplit,
    onClose,
    onSaved,
}: SaveTemplateModalProps) {
    const [templateName, setTemplateName] = useState('');

    // Sync template name from pending workout when opening
    React.useEffect(() => {
        if (visible && pendingWorkout) {
            setTemplateName(pendingWorkout.name);
        }
    }, [visible, pendingWorkout]);

    const handleSave = async () => {
        if (!pendingWorkout || !templateName.trim()) return;

        try {
            const existingTemplates = await findTemplatesByName(templateName.trim());

            if (existingTemplates.length === 0) {
                // No existing templates - create new
                await createTemplateFromWorkout(pendingWorkout, templateName.trim());
                handleClose();
                Alert.alert('Success', 'Template saved!');
            } else if (existingTemplates.length === 1) {
                // Single template with this name - simple overwrite dialog
                const existing = existingTemplates[0];
                const splits = await getSplitsForTemplate(existing.id);
                const splitText = splits.length > 0
                    ? splits.map(s => s.isBuiltIn ? `${s.name} (Pre-made)` : s.name).join(', ')
                    : 'no splits';

                Alert.alert(
                    'Template Exists',
                    `A template named "${existing.name}" (${existing.exerciseCount} exercises, in ${splitText}) already exists. Overwrite it?`,
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Create New', onPress: async () => {
                                await createTemplateFromWorkout(pendingWorkout, templateName.trim());
                                handleClose();
                                Alert.alert('Success', 'New template created!');
                            }
                        },
                        {
                            text: 'Overwrite',
                            style: 'destructive',
                            onPress: async () => {
                                await overwriteTemplate(existing.id, pendingWorkout, templateName.trim());
                                handleClose();
                                Alert.alert('Success', 'Template updated!');
                            }
                        },
                    ]
                );
            } else {
                // Multiple templates with same name - show picker
                const templateOptions = await Promise.all(
                    existingTemplates.map(async (t) => {
                        const splits = await getSplitsForTemplate(t.id);
                        return { template: t, splits };
                    })
                );

                // Sort: current split's templates first
                templateOptions.sort((a, b) => {
                    const aInActive = activeSplit && a.splits.some(s => s.id === activeSplit.id);
                    const bInActive = activeSplit && b.splits.some(s => s.id === activeSplit.id);
                    if (aInActive && !bInActive) return -1;
                    if (!aInActive && bInActive) return 1;
                    return 0;
                });

                // Build alert buttons
                const buttons = templateOptions.map(({ template, splits }) => {
                    const splitText = splits.length > 0
                        ? splits.map(s => s.isBuiltIn ? `${s.name} (Pre-made)` : s.name).join(', ')
                        : 'No split';
                    return {
                        text: `${splitText}`,
                        onPress: async () => {
                            await overwriteTemplate(template.id, pendingWorkout, templateName.trim());
                            handleClose();
                            Alert.alert('Success', 'Template updated!');
                        }
                    };
                });

                // Add "Create New" option
                buttons.push({
                    text: 'Create New',
                    onPress: async () => {
                        await createTemplateFromWorkout(pendingWorkout, templateName.trim());
                        handleClose();
                        Alert.alert('Success', 'New template created!');
                    }
                });

                buttons.push({ text: 'Cancel', onPress: async () => { } });

                Alert.alert(
                    'Multiple Templates Found',
                    `Multiple templates named "${templateName}" exist. Which one do you want to update?`,
                    buttons as any
                );
            }
        } catch (error) {
            console.error('Error saving template:', error);
            Alert.alert('Error', 'Failed to save template');
        }
    };

    const handleClose = () => {
        setTemplateName('');
        onSaved();
        onClose();
    };

    const handleCancel = () => {
        setTemplateName('');
        onSaved(); // Reload data even on cancel (original behavior)
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent
            onRequestClose={handleCancel}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Save as Template</Text>
                    <TextInput
                        style={styles.templateInput}
                        value={templateName}
                        onChangeText={setTemplateName}
                        placeholder="Template name"
                        placeholderTextColor={colors.text.secondary}
                        autoFocus
                    />
                    <View style={styles.modalButtons}>
                        <TouchableOpacity
                            style={styles.modalButtonCancel}
                            onPress={handleCancel}
                        >
                            <Text style={styles.modalButtonCancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.modalButtonSave}
                            onPress={handleSave}
                        >
                            <Text style={styles.modalButtonSaveText}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        padding: spacing.lg,
    },
    modalContent: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
    },
    modalTitle: {
        color: colors.text.primary,
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        marginBottom: spacing.md,
        textAlign: 'center',
    },
    templateInput: {
        backgroundColor: colors.background.tertiary,
        color: colors.text.primary,
        fontSize: typography.size.lg,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.lg,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    modalButtonCancel: {
        flex: 1,
        paddingVertical: spacing.md,
        marginRight: spacing.sm,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        backgroundColor: colors.background.tertiary,
    },
    modalButtonCancelText: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
    },
    modalButtonSave: {
        flex: 1,
        paddingVertical: spacing.md,
        marginLeft: spacing.sm,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        backgroundColor: colors.accent.primary,
    },
    modalButtonSaveText: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
    },
});
