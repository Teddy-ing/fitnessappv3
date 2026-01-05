/**
 * SetRow Component
 * 
 * A single set row within an exercise card.
 * Displays set number, weight input, reps input, and completion checkbox.
 * 
 * Design: Strong's "checkmark flow" - 1 tap to complete set
 */

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { WorkoutSet, SetType } from '../models/workout';
import { colors, spacing, borderRadius, typography } from '../theme';

interface SetRowProps {
    set: WorkoutSet;
    setNumber: number;
    trackWeight: boolean;
    trackReps: boolean;
    trackTime: boolean;
    onUpdate: (updates: Partial<WorkoutSet>) => void;
    onComplete: () => void;
    onRemove: () => void;
}

export default function SetRow({
    set,
    setNumber,
    trackWeight,
    trackReps,
    trackTime,
    onUpdate,
    onComplete,
    onRemove,
}: SetRowProps) {
    const isCompleted = set.status === 'completed';
    const isWarmup = set.type === 'warmup';

    // Get set type indicator
    const getSetTypeLabel = (type: SetType): string => {
        switch (type) {
            case 'warmup': return 'W';
            case 'drop': return 'D';
            case 'failure': return 'F';
            case 'amrap': return 'A';
            default: return String(setNumber);
        }
    };

    // Get row background based on state
    const getRowStyle = () => {
        if (isCompleted) return [styles.row, styles.rowCompleted];
        if (isWarmup) return [styles.row, styles.rowWarmup];
        return [styles.row];
    };

    // Handle weight change
    const handleWeightChange = (text: string) => {
        const weight = text === '' ? null : parseFloat(text.replace(/[^0-9.]/g, ''));
        onUpdate({ weight: isNaN(weight as number) ? null : weight });
    };

    // Handle reps change
    const handleRepsChange = (text: string) => {
        const reps = text === '' ? null : parseInt(text.replace(/[^0-9]/g, ''), 10);
        onUpdate({ reps: isNaN(reps as number) ? null : reps });
    };

    // Handle duration change (for stretches/isometrics)
    const handleDurationChange = (text: string) => {
        const duration = text === '' ? null : parseInt(text.replace(/[^0-9]/g, ''), 10);
        onUpdate({ duration: isNaN(duration as number) ? null : duration });
    };

    return (
        <View style={getRowStyle()}>
            {/* Set number/type indicator */}
            <View style={[styles.setNumber, isWarmup && styles.setNumberWarmup]}>
                <Text style={[styles.setNumberText, isWarmup && styles.setNumberTextWarmup]}>
                    {getSetTypeLabel(set.type)}
                </Text>
            </View>

            {/* Previous (suggested) value - shown if available */}
            {set.suggestedWeight && (
                <View style={styles.previousValue}>
                    <Text style={styles.previousText}>
                        {set.suggestedWeight}
                    </Text>
                </View>
            )}

            {/* Weight input */}
            {trackWeight && (
                <View style={styles.inputContainer}>
                    <TextInput
                        style={[styles.input, isCompleted && styles.inputCompleted]}
                        value={set.weight?.toString() ?? ''}
                        onChangeText={handleWeightChange}
                        placeholder="—"
                        placeholderTextColor={colors.text.disabled}
                        keyboardType="decimal-pad"
                        selectTextOnFocus
                        editable={!isCompleted}
                    />
                    <Text style={styles.inputUnit}>lbs</Text>
                </View>
            )}

            {/* Reps input */}
            {trackReps && (
                <View style={styles.inputContainer}>
                    <TextInput
                        style={[styles.input, isCompleted && styles.inputCompleted]}
                        value={set.reps?.toString() ?? ''}
                        onChangeText={handleRepsChange}
                        placeholder="—"
                        placeholderTextColor={colors.text.disabled}
                        keyboardType="number-pad"
                        selectTextOnFocus
                        editable={!isCompleted}
                    />
                    <Text style={styles.inputUnit}>reps</Text>
                </View>
            )}

            {/* Duration input (for stretches, planks) */}
            {trackTime && !trackReps && (
                <View style={styles.inputContainer}>
                    <TextInput
                        style={[styles.input, isCompleted && styles.inputCompleted]}
                        value={set.duration?.toString() ?? ''}
                        onChangeText={handleDurationChange}
                        placeholder="—"
                        placeholderTextColor={colors.text.disabled}
                        keyboardType="number-pad"
                        selectTextOnFocus
                        editable={!isCompleted}
                    />
                    <Text style={styles.inputUnit}>sec</Text>
                </View>
            )}

            {/* Completion checkbox */}
            <TouchableOpacity
                style={[styles.checkbox, isCompleted && styles.checkboxCompleted]}
                onPress={onComplete}
            >
                {isCompleted && (
                    <Text style={styles.checkmark}>✓</Text>
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        borderRadius: borderRadius.sm,
        marginBottom: spacing.xs,
    },
    rowCompleted: {
        opacity: 0.6,
    },
    rowWarmup: {
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
    },

    // Set number
    setNumber: {
        width: 28,
        height: 28,
        borderRadius: borderRadius.full,
        backgroundColor: colors.background.tertiary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    setNumberWarmup: {
        backgroundColor: colors.accent.warning,
    },
    setNumberText: {
        color: colors.text.primary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
    },
    setNumberTextWarmup: {
        color: colors.background.primary,
    },

    // Previous value hint
    previousValue: {
        width: 40,
        marginRight: spacing.xs,
    },
    previousText: {
        color: colors.text.disabled,
        fontSize: typography.size.xs,
        textAlign: 'center',
    },

    // Input container
    inputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: spacing.xs,
    },
    input: {
        backgroundColor: colors.background.tertiary,
        color: colors.text.primary,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        textAlign: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
        minWidth: 60,
    },
    inputCompleted: {
        backgroundColor: colors.background.secondary,
    },
    inputUnit: {
        color: colors.text.secondary,
        fontSize: typography.size.xs,
        marginLeft: spacing.xs,
        minWidth: 24,
    },

    // Checkbox
    checkbox: {
        width: 36,
        height: 36,
        borderRadius: borderRadius.md,
        borderWidth: 2,
        borderColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: spacing.sm,
    },
    checkboxCompleted: {
        backgroundColor: colors.accent.success,
        borderColor: colors.accent.success,
    },
    checkmark: {
        color: colors.text.primary,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
    },
});
