/**
 * TemplatePickerModal Component
 *
 * Modal for selecting which template position in a split schedule
 * to use as the current workout template.
 *
 * Extracted from WorkoutScreen to reduce component complexity.
 */

import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Split } from '../models';
import { colors, spacing, borderRadius, typography } from '../theme';

/** Minimal template shape — the picker only needs id and name */
interface TemplateSummary {
    id: string;
    name: string;
}
interface TemplatePickerModalProps {
    visible: boolean;
    activeSplit: Split | null;
    templates: TemplateSummary[];
    currentTemplateIndex: number;
    onChangeIndex: (index: number) => void;
    onClose: () => void;
}

export default function TemplatePickerModal({
    visible,
    activeSplit,
    templates,
    currentTemplateIndex,
    onChangeIndex,
    onClose,
}: TemplatePickerModalProps) {
    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Choose Current Template</Text>
                    <Text style={styles.pickerSubtitle}>
                        Select which template to start from
                    </Text>
                    <ScrollView style={styles.pickerList}>
                        {activeSplit?.schedule.map((item, index) => {
                            if (item.type === 'rest') {
                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.pickerItem,
                                            currentTemplateIndex === index && styles.pickerItemActive
                                        ]}
                                        onPress={() => onChangeIndex(index)}
                                    >
                                        <Text style={[
                                            styles.pickerRestText,
                                            currentTemplateIndex === index && styles.pickerItemTextActive
                                        ]}>Rest Day</Text>
                                        <Text style={styles.pickerItemMeta}>
                                            Day {index + 1}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            }
                            const template = templates.find(t => t.id === item.templateId);
                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.pickerItem,
                                        currentTemplateIndex === index && styles.pickerItemActive
                                    ]}
                                    onPress={() => onChangeIndex(index)}
                                >
                                    <Text style={[
                                        styles.pickerItemText,
                                        currentTemplateIndex === index && styles.pickerItemTextActive
                                    ]}>
                                        {template?.name || 'Unknown Template'}
                                    </Text>
                                    <Text style={styles.pickerItemMeta}>
                                        Day {index + 1}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                    <TouchableOpacity
                        style={styles.modalButtonCancel}
                        onPress={onClose}
                    >
                        <Text style={styles.modalButtonCancelText}>Cancel</Text>
                    </TouchableOpacity>
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
    pickerSubtitle: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        marginBottom: spacing.md,
        textAlign: 'center',
    },
    pickerList: {
        maxHeight: 300,
        marginBottom: spacing.md,
    },
    pickerItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    pickerItemActive: {
        borderWidth: 2,
        borderColor: colors.accent.primary,
    },
    pickerItemText: {
        color: colors.text.primary,
        fontSize: typography.size.md,
    },
    pickerItemTextActive: {
        color: colors.accent.primary,
        fontWeight: typography.weight.semibold,
    },
    pickerItemMeta: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
    },
    pickerRestText: {
        color: colors.text.disabled,
        fontSize: typography.size.sm,
        fontStyle: 'italic',
    },
});
