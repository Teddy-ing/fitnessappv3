/**
 * SetRow Component
 * 
 * A single set row within an exercise card.
 * Swipe left to reveal delete button.
 * 
 * Design: Strong's "checkmark flow" - 1 tap to complete set
 */

import React, { useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { WorkoutSet, SetType } from '../models/workout';
import { colors, spacing, borderRadius, typography } from '../theme';

interface SetRowProps {
    set: WorkoutSet;
    setNumber: number;
    trackWeight: boolean;
    trackReps: boolean;
    trackTime: boolean;
    weightUnit?: 'lbs' | 'kg';
    showSwipeHint?: boolean;  // Show hint for first set
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
    weightUnit = 'lbs',
    showSwipeHint = false,
    onUpdate,
    onComplete,
    onRemove,
}: SetRowProps) {
    const swipeableRef = useRef<Swipeable>(null);
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

    // Handle delete with animation
    const handleDelete = () => {
        swipeableRef.current?.close();
        onRemove();
    };

    // Render delete action
    const renderRightActions = (
        progress: Animated.AnimatedInterpolation<number>,
        dragX: Animated.AnimatedInterpolation<number>
    ) => {
        const scale = dragX.interpolate({
            inputRange: [-80, 0],
            outputRange: [1, 0],
            extrapolate: 'clamp',
        });

        return (
            <TouchableOpacity
                style={styles.deleteAction}
                onPress={handleDelete}
            >
                <Animated.Text style={[styles.deleteText, { transform: [{ scale }] }]}>
                    Delete
                </Animated.Text>
            </TouchableOpacity>
        );
    };

    return (
        <Swipeable
            ref={swipeableRef}
            renderRightActions={renderRightActions}
            rightThreshold={40}
            overshootRight={false}
        >
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
                        <Text style={styles.inputUnit}>{weightUnit}</Text>
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

                {/* Swipe hint for first set */}
                {showSwipeHint && !isCompleted && (
                    <View style={styles.swipeHint}>
                        <Text style={styles.swipeHintText}>← swipe to delete</Text>
                    </View>
                )}
            </View>
        </Swipeable>
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
        backgroundColor: colors.background.secondary,
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

    // Delete action
    deleteAction: {
        backgroundColor: colors.accent.error,
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        borderRadius: borderRadius.sm,
        marginBottom: spacing.xs,
    },
    deleteText: {
        color: colors.text.primary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
    },

    // Swipe hint
    swipeHint: {
        position: 'absolute',
        right: -100,
        backgroundColor: colors.background.tertiary,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.sm,
    },
    swipeHintText: {
        color: colors.text.secondary,
        fontSize: typography.size.xs,
    },
});
