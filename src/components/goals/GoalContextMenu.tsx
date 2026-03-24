/**
 * GoalContextMenu
 *
 * Long-press context menu modal for goal actions:
 * Mark Complete, Abandon, Delete.
 *
 * Extracted from GoalsScreen (TD-016).
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, spacing, borderRadius, typography } from '../../theme';
import type { Goal } from '../../models';

// ============================================================
// Props
// ============================================================

interface GoalContextMenuProps {
    visible: boolean;
    goal: Goal | null;
    onAction: (action: 'complete' | 'delete' | 'abandon') => void;
    onClose: () => void;
}

// ============================================================
// Component
// ============================================================

export default function GoalContextMenu({
    visible,
    goal,
    onAction,
    onClose,
}: GoalContextMenuProps) {
    if (!goal) return null;
    const isActive = goal.status === 'active';

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <View style={styles.contextMenu}>
                    {isActive && (
                        <TouchableOpacity
                            style={styles.contextMenuItem}
                            onPress={() => onAction('complete')}
                        >
                            <MaterialIcons
                                name="check-circle"
                                size={20}
                                color={colors.accent.success}
                            />
                            <Text style={styles.contextMenuText}>Mark Complete</Text>
                        </TouchableOpacity>
                    )}

                    {isActive && (
                        <TouchableOpacity
                            style={styles.contextMenuItem}
                            onPress={() => onAction('abandon')}
                        >
                            <MaterialIcons
                                name="pause-circle-filled"
                                size={20}
                                color={colors.accent.warning}
                            />
                            <Text style={styles.contextMenuText}>Abandon</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={[styles.contextMenuItem, styles.contextMenuItemLast]}
                        onPress={() => onAction('delete')}
                    >
                        <MaterialIcons
                            name="delete"
                            size={20}
                            color={colors.accent.error}
                        />
                        <Text style={[styles.contextMenuText, { color: colors.accent.error }]}>
                            Delete
                        </Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contextMenu: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        width: 240,
        overflow: 'hidden',
    },
    contextMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    contextMenuItemLast: {
        borderBottomWidth: 0,
    },
    contextMenuText: {
        fontSize: typography.size.md,
        color: colors.text.primary,
        marginLeft: spacing.sm,
    },
});
