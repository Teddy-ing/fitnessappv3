/**
 * RirSelector Component
 * 
 * Quick-select popover for RIR (Reps in Reserve) values.
 * Offers standard values (0, 1, 2, 3, 4, 5+).
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

// Standard RIR options for quick logging. 5 represents 5+
export const RIR_VALUES = [0, 1, 2, 3, 4, 5];

interface RirSelectorProps {
    visible: boolean;
    currentValue: number | null;
    onSelect: (value: number | null) => void;
    onClose: () => void;
}

export default function RirSelector({
    visible,
    currentValue,
    onSelect,
    onClose,
}: RirSelectorProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Pressable style={styles.container} onPress={() => {}}>
                    <Text style={styles.title}>RIR</Text>
                    <Text style={styles.subtitle}>(Reps in Reserve)</Text>
                    <View style={styles.grid}>
                        {RIR_VALUES.map(val => {
                            const isSelected = currentValue === val;
                            return (
                                <TouchableOpacity
                                    key={val}
                                    style={[
                                        styles.pill,
                                        isSelected && styles.pillSelected,
                                        val === 0 && styles.pillHard,
                                        val === 0 && isSelected && styles.pillHardSelected,
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
                                        {val === 5 ? '5+' : val.toString()}
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
        marginBottom: 2,
    },
    subtitle: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
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
