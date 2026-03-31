/**
 * WorkoutNoteSection Component
 *
 * Inline workout-level note editor and display.
 * Shows a text input when editing, or a styled note preview when viewing.
 * Extracted from WorkoutScreen to reduce component size (TD-030).
 */

import React from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme';

interface WorkoutNoteSectionProps {
    /** Whether the note editor is visible */
    isEditing: boolean;
    /** Current note text in the input */
    inputValue: string;
    /** Saved note on the workout (shown in display mode) */
    savedNote: string | null;
    onChangeText: (text: string) => void;
    onSave: () => void;
    onCancel: () => void;
    onStartEditing: () => void;
}

export default function WorkoutNoteSection({
    isEditing,
    inputValue,
    savedNote,
    onChangeText,
    onSave,
    onCancel,
    onStartEditing,
}: WorkoutNoteSectionProps) {
    if (isEditing) {
        return (
            <View style={styles.container}>
                <TextInput
                    style={styles.input}
                    value={inputValue}
                    onChangeText={onChangeText}
                    placeholder="Workout notes..."
                    placeholderTextColor={colors.text.disabled}
                    multiline
                    autoFocus
                    maxLength={500}
                />
                <View style={styles.actions}>
                    <TouchableOpacity
                        onPress={onCancel}
                        style={styles.actionButton}
                    >
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={onSave}
                        style={styles.actionButton}
                    >
                        <Text style={styles.saveText}>Save</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    if (savedNote) {
        return (
            <TouchableOpacity onPress={onStartEditing}>
                <Text style={styles.display}>{savedNote}</Text>
            </TouchableOpacity>
        );
    }

    return null;
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.accent.primary,
    },
    input: {
        color: colors.text.primary,
        fontSize: typography.size.sm,
        minHeight: 48,
        maxHeight: 120,
        textAlignVertical: 'top',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: spacing.sm,
        gap: spacing.md,
    },
    actionButton: {
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
    },
    cancelText: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
    },
    saveText: {
        color: colors.accent.primary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
    },
    display: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        fontStyle: 'italic',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
});
