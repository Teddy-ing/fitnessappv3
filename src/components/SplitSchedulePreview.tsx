/**
 * SplitSchedulePreview Component
 *
 * Renders the schedule preview and rest day button for the split form.
 * Extracted from SplitFormView (TD-041 component size fix).
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SplitScheduleItem } from '../models/split';
import { type Template } from '../services';
import { colors, spacing, borderRadius, typography } from '../theme';

interface SplitSchedulePreviewProps {
    scheduleItems: SplitScheduleItem[];
    templates: Template[];
    onAddRestDay: () => void;
    onRemoveItem: (index: number) => void;
    onMoveUp: (index: number) => void;
    onMoveDown: (index: number) => void;
}

function SplitSchedulePreview({
    scheduleItems,
    templates,
    onAddRestDay,
    onRemoveItem,
    onMoveUp,
    onMoveDown,
}: SplitSchedulePreviewProps) {
    return (
        <>
            {/* Add Rest Day button */}
            <TouchableOpacity
                style={styles.addRestDayButton}
                onPress={onAddRestDay}
            >
                <Text style={styles.addRestDayIcon}>🛌</Text>
                <Text style={styles.addRestDayText}>Add Rest Day</Text>
            </TouchableOpacity>

            {/* Schedule Preview */}
            {scheduleItems.length > 0 && (
                <>
                    <Text style={styles.formLabel}>Schedule Preview</Text>
                    <View style={styles.schedulePreview}>
                        {scheduleItems.map((item, index) => (
                            <View key={index} style={styles.scheduleItem}>
                                {/* Reorder buttons */}
                                <View style={styles.reorderButtons}>
                                    <TouchableOpacity
                                        style={[styles.reorderButton, index === 0 && styles.reorderButtonDisabled]}
                                        onPress={() => onMoveUp(index)}
                                        disabled={index === 0}
                                    >
                                        <Text style={styles.reorderButtonText}>▲</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.reorderButton, index === scheduleItems.length - 1 && styles.reorderButtonDisabled]}
                                        onPress={() => onMoveDown(index)}
                                        disabled={index === scheduleItems.length - 1}
                                    >
                                        <Text style={styles.reorderButtonText}>▼</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.scheduleItemOrderBadge}>
                                    <Text style={styles.scheduleItemOrderText}>{index + 1}</Text>
                                </View>
                                {item.type === 'rest' ? (
                                    <Text style={styles.scheduleItemRestText}>🛌 Rest Day</Text>
                                ) : (
                                    <Text style={styles.scheduleItemTemplateText}>
                                        {templates.find(t => t.id === item.templateId)?.name || 'Template'}
                                    </Text>
                                )}
                                <TouchableOpacity
                                    style={styles.scheduleItemRemove}
                                    onPress={() => onRemoveItem(index)}
                                >
                                    <Text style={styles.scheduleItemRemoveText}>✕</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                </>
            )}
        </>
    );
}

export default React.memo(SplitSchedulePreview);

const styles = StyleSheet.create({
    formLabel: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        marginBottom: spacing.sm,
        marginTop: spacing.md,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    addRestDayButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginTop: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.text.disabled,
        borderStyle: 'dashed',
    },
    addRestDayIcon: {
        fontSize: typography.size.lg,
        marginRight: spacing.sm,
    },
    addRestDayText: {
        color: colors.text.secondary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
    },
    schedulePreview: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.md,
        padding: spacing.sm,
        marginBottom: spacing.md,
    },
    scheduleItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.sm,
        padding: spacing.sm,
        marginBottom: spacing.xs,
    },
    scheduleItemOrderBadge: {
        backgroundColor: colors.accent.primary,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    scheduleItemOrderText: {
        color: colors.text.primary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.bold,
    },
    scheduleItemRestText: {
        color: colors.text.secondary,
        fontSize: typography.size.md,
        flex: 1,
    },
    scheduleItemTemplateText: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        flex: 1,
    },
    scheduleItemRemove: {
        padding: spacing.xs,
    },
    scheduleItemRemoveText: {
        color: colors.text.disabled,
        fontSize: typography.size.md,
    },
    reorderButtons: {
        marginRight: spacing.xs,
    },
    reorderButton: {
        padding: 2,
    },
    reorderButtonDisabled: {
        opacity: 0.3,
    },
    reorderButtonText: {
        color: colors.text.secondary,
        fontSize: typography.size.xs,
    },
});
