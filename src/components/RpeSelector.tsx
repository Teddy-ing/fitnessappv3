/**
 * RpeSelector Component
 * 
 * Quick-select popover for RPE values (6-10 in 0.5 steps).
 * Appears as a small modal anchored to the RPE cell.
 */

import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    StyleSheet,
    Pressable,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../theme';

const RPE_VALUES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

interface RpeSelectorProps {
    visible: boolean;
    currentValue: number | null;
    onSelect: (value: number | null) => void;
    onClose: () => void;
}

export default function RpeSelector({
    visible,
    currentValue,
    onSelect,
    onClose,
}: RpeSelectorProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Pressable style={styles.container} onPress={() => {}}>
                    <Text style={styles.title}>RPE</Text>
                    <View style={styles.grid}>
                        {RPE_VALUES.map(val => {
                            const isSelected = currentValue === val;
                            return (
                                <TouchableOpacity
                                    key={val}
                                    style={[
                                        styles.pill,
                                        isSelected && styles.pillSelected,
                                        val >= 9.5 && styles.pillHard,
                                        val >= 9.5 && isSelected && styles.pillHardSelected,
                                    ]}
                                    onPress={() => {
                                        onSelect(val);
                                        onClose();
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[
                                        styles.pillText,
                                        isSelected && styles.pillTextSelected,
                                    ]}>
                                        {val % 1 === 0 ? val.toString() : val.toFixed(1)}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    {/* Clear button */}
                    {currentValue !== null && (
                        <TouchableOpacity
                            style={styles.clearButton}
                            onPress={() => {
                                onSelect(null);
                                onClose();
                            }}
                        >
                            <Text style={styles.clearText}>Clear</Text>
                        </TouchableOpacity>
                    )}
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        width: 260,
        alignItems: 'center',
    },
    title: {
        color: colors.text.primary,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        marginBottom: spacing.md,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: spacing.xs,
    },
    pill: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        backgroundColor: colors.background.tertiary,
        minWidth: 48,
        alignItems: 'center',
    },
    pillSelected: {
        backgroundColor: colors.accent.primary,
    },
    pillHard: {
        borderWidth: 1,
        borderColor: colors.accent.error,
    },
    pillHardSelected: {
        backgroundColor: colors.accent.error,
        borderColor: colors.accent.error,
    },
    pillText: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
    },
    pillTextSelected: {
        fontWeight: typography.weight.bold,
    },
    clearButton: {
        marginTop: spacing.md,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
    },
    clearText: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
    },
});
