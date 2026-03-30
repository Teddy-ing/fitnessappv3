/**
 * ExerciseMenu Component
 * 
 * Bottom-sheet action menu for exercise-level actions.
 * Appears when tapping the ⋯ icon on an exercise card header.
 * 
 * Menu items:
 * - Add Note — opens inline text input
 * - Add Warm-up Sets — adds 2 warmup sets at the start
 * - Replace Exercise — opens ExercisePicker to swap
 * - Create/Remove Superset — toggles superset with next exercise
 * - Remove Exercise — with confirmation
 */

import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    Pressable,
    StyleSheet,
    Alert,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../theme';

interface MenuItem {
    label: string;
    icon: string;
    onPress: () => void;
    destructive?: boolean;
}

interface ExerciseMenuProps {
    visible: boolean;
    exerciseName: string;
    isInSuperset: boolean;
    canSuperset: boolean;
    onClose: () => void;
    onAddNote: () => void;
    onAddWarmupSets: () => void;
    onReplaceExercise: () => void;
    onToggleSuperset: () => void;
    onRemoveExercise: () => void;
}

export default function ExerciseMenu({
    visible,
    exerciseName,
    isInSuperset,
    canSuperset,
    onClose,
    onAddNote,
    onAddWarmupSets,
    onReplaceExercise,
    onToggleSuperset,
    onRemoveExercise,
}: ExerciseMenuProps) {
    const handleRemove = () => {
        onClose();
        Alert.alert(
            'Remove Exercise',
            `Remove "${exerciseName}" from this workout?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: onRemoveExercise,
                },
            ]
        );
    };

    const items: MenuItem[] = [
        {
            label: 'Add Note',
            icon: '📝',
            onPress: () => { onClose(); onAddNote(); },
        },
        {
            label: 'Add Warm-up Sets',
            icon: '🔥',
            onPress: () => { onClose(); onAddWarmupSets(); },
        },
        {
            label: 'Replace Exercise',
            icon: '🔄',
            onPress: () => { onClose(); onReplaceExercise(); },
        },
    ];

    // Only show superset option if exercise can be linked
    if (canSuperset) {
        items.push({
            label: isInSuperset ? 'Remove Superset' : 'Create Superset',
            icon: '🔗',
            onPress: () => { onClose(); onToggleSuperset(); },
        });
    }

    items.push({
        label: 'Remove Exercise',
        icon: '🗑️',
        onPress: handleRemove,
        destructive: true,
    });

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
                    {/* Title */}
                    <View style={styles.titleRow}>
                        <Text style={styles.titleText} numberOfLines={1}>
                            {exerciseName}
                        </Text>
                    </View>

                    {/* Divider */}
                    <View style={styles.divider} />

                    {/* Menu items */}
                    {items.map((item, index) => (
                        <TouchableOpacity
                            key={item.label}
                            style={[
                                styles.menuItem,
                                index === items.length - 1 && styles.menuItemLast,
                            ]}
                            onPress={item.onPress}
                            activeOpacity={0.6}
                        >
                            <Text style={styles.menuIcon}>{item.icon}</Text>
                            <Text style={[
                                styles.menuLabel,
                                item.destructive && styles.menuLabelDestructive,
                            ]}>
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    ))}

                    {/* Cancel */}
                    <View style={styles.divider} />
                    <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: colors.background.secondary,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        paddingBottom: spacing.xl,
        paddingTop: spacing.md,
    },
    titleRow: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.sm,
    },
    titleText: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        textAlign: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: colors.separator,
        marginVertical: spacing.xs,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
    },
    menuItemLast: {
        // no special styling needed
    },
    menuIcon: {
        fontSize: typography.size.lg,
        marginRight: spacing.md,
        width: 28,
        textAlign: 'center',
    },
    menuLabel: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
    },
    menuLabelDestructive: {
        color: colors.accent.error,
    },
    cancelButton: {
        paddingVertical: spacing.md,
        alignItems: 'center',
    },
    cancelText: {
        color: colors.text.secondary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
    },
});
