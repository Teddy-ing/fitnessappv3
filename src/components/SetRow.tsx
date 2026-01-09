/**
 * SetRow Component
 * 
 * A single set row within an exercise card.
 * Swipe left to reveal delete button.
 * 
 * Design: Strong's "checkmark flow" - 1 tap to complete set
 */

import React, { useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated, Alert } from 'react-native';
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
    showSwipeHint?: boolean;
    isWeightFocused?: boolean;  // Highlight weight field
    isRepsFocused?: boolean;    // Highlight reps field
    onUpdate: (updates: Partial<WorkoutSet>) => void;
    onComplete: () => void;
    onRemove: () => void;
    onFocusWeight?: () => void;  // Called when weight field tapped
    onFocusReps?: () => void;    // Called when reps field tapped
    onChangeSetType?: (newType: SetType) => void;  // Called when set type changed
}

export default function SetRow({
    set,
    setNumber,
    trackWeight,
    trackReps,
    trackTime,
    weightUnit = 'lbs',
    showSwipeHint = false,
    isWeightFocused = false,
    isRepsFocused = false,
    onUpdate,
    onComplete,
    onRemove,
    onFocusWeight,
    onFocusReps,
    onChangeSetType,
}: SetRowProps) {
    const swipeableRef = useRef<Swipeable>(null);
    const isCompleted = set.status === 'completed';
    const isWarmup = set.type === 'warmup';
    const isDrop = set.type === 'drop';
    const isFailure = set.type === 'failure';
    const isAmrap = set.type === 'amrap';

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

    // Get badge style based on set type
    const getBadgeStyle = () => {
        if (isWarmup) return [styles.setNumber, styles.setNumberWarmup];
        if (isDrop) return [styles.setNumber, styles.setNumberDrop];
        if (isFailure) return [styles.setNumber, styles.setNumberFailure];
        if (isAmrap) return [styles.setNumber, styles.setNumberAmrap];
        return [styles.setNumber];
    };

    // Get badge text style
    const getBadgeTextStyle = () => {
        if (isWarmup || isDrop || isFailure || isAmrap) {
            return [styles.setNumberText, styles.setNumberTextSpecial];
        }
        return [styles.setNumberText];
    };

    // Handle set type change
    const handleSetTypePress = () => {
        if (!onChangeSetType || isCompleted) return;

        Alert.alert(
            'Set Type',
            'Choose set type',
            [
                { text: 'Working', onPress: () => onChangeSetType('working') },
                { text: 'Warmup', onPress: () => onChangeSetType('warmup') },
                { text: 'Drop Set', onPress: () => onChangeSetType('drop') },
                { text: 'Failure', onPress: () => onChangeSetType('failure') },
                { text: 'AMRAP', onPress: () => onChangeSetType('amrap') },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    // Get row background based on state
    const getRowStyle = () => {
        if (isCompleted) return [styles.row, styles.rowCompleted];
        if (isWarmup) return [styles.row, styles.rowWarmup];
        if (isDrop) return [styles.row, styles.rowDrop];
        if (isFailure) return [styles.row, styles.rowFailure];
        if (isAmrap) return [styles.row, styles.rowAmrap];
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
                {/* Set number/type indicator - tap to change type */}
                <TouchableOpacity
                    style={getBadgeStyle()}
                    onPress={handleSetTypePress}
                    disabled={isCompleted || !onChangeSetType}
                >
                    <Text style={getBadgeTextStyle()}>
                        {getSetTypeLabel(set.type)}
                    </Text>
                </TouchableOpacity>

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
                    <TouchableOpacity
                        style={styles.inputContainer}
                        onPress={onFocusWeight}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.inputDisplay, isWeightFocused && styles.inputFocused, isCompleted && styles.inputCompleted]}>
                            <Text style={[styles.inputText, !set.weight && styles.inputPlaceholder]}>
                                {set.weight?.toString() ?? '—'}
                            </Text>
                        </View>
                        <Text style={styles.inputUnit}>{weightUnit}</Text>
                    </TouchableOpacity>
                )}

                {/* Reps input */}
                {trackReps && (
                    <TouchableOpacity
                        style={styles.inputContainer}
                        onPress={onFocusReps}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.inputDisplay, isRepsFocused && styles.inputFocused, isCompleted && styles.inputCompleted]}>
                            <Text style={[styles.inputText, !set.reps && styles.inputPlaceholder]}>
                                {set.reps?.toString() ?? '—'}
                            </Text>
                        </View>
                        <Text style={styles.inputUnit}>reps</Text>
                    </TouchableOpacity>
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
    rowDrop: {
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
    },
    rowFailure: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    rowAmrap: {
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
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
    setNumberDrop: {
        backgroundColor: colors.accent.primary,
    },
    setNumberFailure: {
        backgroundColor: colors.accent.error,
    },
    setNumberAmrap: {
        backgroundColor: colors.accent.success,
    },
    setNumberText: {
        color: colors.text.primary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
    },
    setNumberTextWarmup: {
        color: colors.background.primary,
    },
    setNumberTextSpecial: {
        color: colors.text.primary,
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
        opacity: 0.6,
    },
    inputDisplay: {
        backgroundColor: colors.background.tertiary,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
        minWidth: 60,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    inputFocused: {
        borderColor: colors.accent.primary,
        backgroundColor: colors.background.primary,
    },
    inputText: {
        color: colors.text.primary,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        textAlign: 'center',
    },
    inputPlaceholder: {
        color: colors.text.disabled,
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
