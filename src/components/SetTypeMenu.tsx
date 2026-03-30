/**
 * SetTypeMenu Component
 * 
 * A clean popover-style menu for selecting set types.
 * Replaces the Alert.alert approach with a premium-feeling modal.
 * 
 * Anchored visually to the set badge pill location.
 */

import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    Pressable,
    StyleSheet,
} from 'react-native';
import { SetType } from '../models/workout';
import { colors, spacing, borderRadius, typography } from '../theme';

interface SetTypeOption {
    type: SetType;
    label: string;
    shortLabel: string;
}

const SET_TYPE_OPTIONS: SetTypeOption[] = [
    { type: 'working', label: 'Normal', shortLabel: '1' },
    { type: 'warmup', label: 'Warm-up', shortLabel: 'W' },
    { type: 'drop', label: 'Drop Set', shortLabel: 'D' },
    { type: 'failure', label: 'Failure', shortLabel: 'F' },
    { type: 'amrap', label: 'AMRAP', shortLabel: 'A' },
];

interface SetTypeMenuProps {
    visible: boolean;
    currentType: SetType;
    onSelect: (type: SetType) => void;
    onClose: () => void;
}

export default function SetTypeMenu({
    visible,
    currentType,
    onSelect,
    onClose,
}: SetTypeMenuProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={styles.menu} onPress={(e) => e.stopPropagation()}>
                    <Text style={styles.title}>Set Type</Text>
                    <View style={styles.optionsRow}>
                        {SET_TYPE_OPTIONS.map((option) => {
                            const isSelected = currentType === option.type;
                            return (
                                <TouchableOpacity
                                    key={option.type}
                                    style={[
                                        styles.optionPill,
                                        isSelected && styles.optionPillSelected,
                                    ]}
                                    onPress={() => {
                                        onSelect(option.type);
                                        onClose();
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[
                                        styles.optionBadge,
                                        isSelected && styles.optionBadgeSelected,
                                    ]}>
                                        {option.shortLabel}
                                    </Text>
                                    <Text style={[
                                        styles.optionLabel,
                                        isSelected && styles.optionLabelSelected,
                                    ]}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    menu: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        marginHorizontal: spacing.xl,
        width: '85%',
        maxWidth: 360,
    },
    title: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    optionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    optionPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.full,
        backgroundColor: colors.background.tertiary,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    optionPillSelected: {
        borderColor: colors.accent.primary,
        backgroundColor: 'rgba(168, 85, 247, 0.15)',
    },
    optionBadge: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.bold,
        marginRight: spacing.xs,
        width: 16,
        textAlign: 'center',
    },
    optionBadgeSelected: {
        color: colors.accent.primary,
    },
    optionLabel: {
        color: colors.text.primary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
    },
    optionLabelSelected: {
        color: colors.accent.tertiary,
    },
});
