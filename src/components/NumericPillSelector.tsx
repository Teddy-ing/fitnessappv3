/**
 * NumericPillSelector Component
 *
 * Shared modal pill-grid for selecting a numeric value.
 * Used by RpeSelector and RirSelector (TD-032 DRY fix).
 *
 * Parameterized by title, optional subtitle, values array,
 * "hard" threshold predicate, and label formatter.
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

interface NumericPillSelectorProps {
    visible: boolean;
    title: string;
    subtitle?: string;
    values: number[];
    currentValue: number | null;
    /** Returns true for values that should get the "hard" (red) styling */
    isHard?: (val: number) => boolean;
    /** Custom label for a pill. Defaults to val.toString() */
    formatLabel?: (val: number) => string;
    onSelect: (value: number | null) => void;
    onClose: () => void;
}

export default function NumericPillSelector({
    visible,
    title,
    subtitle,
    values,
    currentValue,
    isHard,
    formatLabel,
    onSelect,
    onClose,
}: NumericPillSelectorProps) {
    const getLabel = formatLabel ?? ((val: number) => val.toString());
    const checkHard = isHard ?? (() => false);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Pressable style={styles.container} onPress={() => {}}>
                    <Text style={[
                        styles.title,
                        !subtitle && styles.titleNoSubtitle,
                    ]}>{title}</Text>
                    {subtitle && (
                        <Text style={styles.subtitle}>{subtitle}</Text>
                    )}
                    <View style={styles.grid}>
                        {values.map(val => {
                            const isSelected = currentValue === val;
                            const hard = checkHard(val);
                            return (
                                <TouchableOpacity
                                    key={val}
                                    style={[
                                        styles.pill,
                                        isSelected && styles.pillSelected,
                                        hard && styles.pillHard,
                                        hard && isSelected && styles.pillHardSelected,
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
                                        {getLabel(val)}
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
    titleNoSubtitle: {
        marginBottom: spacing.md,
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
