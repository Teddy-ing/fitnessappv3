/**
 * SetRow Component
 * 
 * A single set row within an exercise card — redesigned for Phase 1.
 * Strict table layout: [ SET | PREVIOUS | WEIGHT | REPS | ✓ ]
 * 
 * Visual system:
 * - Completed sets: 50% opacity (entire row)
 * - Active set: bright text, pulsing purple checkbox
 * - Future sets: default styling
 * - Warmup sets: muted gray badge, 70% opacity text
 * 
 * Swipe left to reveal delete button.
 */

import React, { useRef, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { WorkoutSet, SetType } from '../models/workout';
import { PreviousSetData } from '../services/workoutService';
import { colors, spacing, borderRadius, typography } from '../theme';
import { getWeightUnitSync } from '../hooks/useWeightUnit';
import SetTypeMenu from './SetTypeMenu';
import RpeSelector from './RpeSelector';

// PP-005 fix: Props use store-shaped action signatures so the parent can pass
// stable references (from getState()) instead of inline arrow closures.
interface SetRowProps {
    set: WorkoutSet;
    exerciseId: string;
    setId: string;
    setNumber: number;
    trackWeight: boolean;
    trackReps: boolean;
    trackTime: boolean;
    previousData?: PreviousSetData | null;  // Previous session data for this set index
    isActiveSet?: boolean;                   // Is this the first uncompleted set?
    weightUnit?: string;
    showSwipeHint?: boolean;
    isWeightFocused?: boolean;
    isRepsFocused?: boolean;
    onUpdateSet: (exerciseId: string, setId: string, updates: Partial<WorkoutSet>) => void;
    onCompleteSet: (exerciseId: string, setId: string) => void;
    onRemoveSet: (exerciseId: string, setId: string) => void;
    onFocusField?: (exerciseId: string, setId: string, field: 'weight' | 'reps') => void;
    showRpe?: boolean;
}

function SetRowInner({
    set,
    exerciseId,
    setId,
    setNumber,
    trackWeight,
    trackReps,
    trackTime,
    previousData = null,
    isActiveSet = false,
    weightUnit = getWeightUnitSync(),
    showSwipeHint = false,
    isWeightFocused = false,
    isRepsFocused = false,
    onUpdateSet,
    onCompleteSet,
    onRemoveSet,
    onFocusField,
    showRpe = false,
}: SetRowProps) {
    const swipeableRef = useRef<Swipeable>(null);
    const isCompleted = set.status === 'completed';
    const isWarmup = set.type === 'warmup';

    // Set type menu visibility
    const [showTypeMenu, setShowTypeMenu] = useState(false);

    // RPE selector visibility
    const [showRpeSelector, setShowRpeSelector] = useState(false);

    // Pulsing animation for active set checkbox
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (isActiveSet && !isCompleted) {
            const animation = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 0.5,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            );
            animation.start();
            return () => animation.stop();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isActiveSet, isCompleted]);

    // Swipe-hint onboarding animation
    const swipeHintAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (showSwipeHint) {
            const timer = setTimeout(() => {
                Animated.sequence([
                    // Slide left 40px
                    Animated.timing(swipeHintAnim, {
                        toValue: -40,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                    // Hold for 800ms
                    Animated.delay(800),
                    // Spring back
                    Animated.spring(swipeHintAnim, {
                        toValue: 0,
                        useNativeDriver: true,
                        tension: 80,
                        friction: 10,
                    }),
                ]).start();
            }, 1000); // Wait 1s after mount before showing hint
            return () => clearTimeout(timer);
        }
    }, [showSwipeHint]);

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

    // Handle set type change — opens SetTypeMenu popover
    const handleSetTypePress = () => {
        if (isCompleted) return;
        setShowTypeMenu(true);
    };

    // Format previous set data: "135×8" or "—"
    const formatPrevious = (): string => {
        if (!previousData || (previousData.weight === null && previousData.reps === null)) {
            return '—';
        }
        const parts: string[] = [];
        if (previousData.weight !== null) parts.push(String(previousData.weight));
        if (previousData.reps !== null) parts.push(String(previousData.reps));
        return parts.join('×');
    };

    // Handle delete with animation
    const handleDelete = () => {
        swipeableRef.current?.close();
        onRemoveSet(exerciseId, setId);
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

    // Row opacity: completed=0.5, warmup text=0.7, else=1
    const rowOpacity = isCompleted ? 0.5 : 1;
    const textOpacity = isWarmup && !isCompleted ? 0.7 : 1;

    return (
        <Swipeable
            ref={swipeableRef}
            renderRightActions={renderRightActions}
            rightThreshold={40}
            overshootRight={false}
        >
            <Animated.View style={[
                styles.row,
                { opacity: rowOpacity },
                showSwipeHint && { transform: [{ translateX: swipeHintAnim }] },
            ]}>
                {/* Set number/type badge — tap to change type */}
                <TouchableOpacity
                    style={[
                        styles.setBadge,
                        isWarmup && styles.setBadgeWarmup,
                    ]}
                    onPress={handleSetTypePress}
                    disabled={isCompleted}
                >
                    <Text style={[
                        styles.setBadgeText,
                        { opacity: textOpacity },
                    ]}>
                        {getSetTypeLabel(set.type)}
                    </Text>
                </TouchableOpacity>

                {/* Previous column */}
                <View style={styles.prevCell}>
                    <Text style={[styles.prevText, { opacity: textOpacity }]}>
                        {formatPrevious()}
                    </Text>
                </View>

                {/* Weight input — borderless inline text */}
                {trackWeight && (
                    <TouchableOpacity
                        style={styles.dataCell}
                        onPress={() => onFocusField?.(exerciseId, setId, 'weight')}
                        activeOpacity={0.7}
                    >
                        <View style={[
                            styles.inlineInput,
                            isWeightFocused && styles.inlineInputFocused,
                        ]}>
                            <Text style={[
                                styles.dataText,
                                isActiveSet && !isCompleted && styles.dataTextActive,
                                !set.weight && styles.dataTextPlaceholder,
                                { opacity: textOpacity },
                            ]}>
                                {set.weight?.toString() ?? '—'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                )}

                {/* Reps input — borderless inline text */}
                {trackReps && (
                    <TouchableOpacity
                        style={styles.dataCell}
                        onPress={() => onFocusField?.(exerciseId, setId, 'reps')}
                        activeOpacity={0.7}
                    >
                        <View style={[
                            styles.inlineInput,
                            isRepsFocused && styles.inlineInputFocused,
                        ]}>
                            <Text style={[
                                styles.dataText,
                                isActiveSet && !isCompleted && styles.dataTextActive,
                                !set.reps && styles.dataTextPlaceholder,
                                { opacity: textOpacity },
                            ]}>
                                {set.reps?.toString() ?? '—'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                )}

                {/* Duration input (for stretches, planks) */}
                {trackTime && !trackReps && (
                    <TouchableOpacity
                        style={styles.dataCell}
                        onPress={() => onFocusField?.(exerciseId, setId, 'reps')}
                        activeOpacity={0.7}
                    >
                        <View style={[
                            styles.inlineInput,
                            isRepsFocused && styles.inlineInputFocused,
                        ]}>
                            <Text style={[
                                styles.dataText,
                                !set.duration && styles.dataTextPlaceholder,
                                { opacity: textOpacity },
                            ]}>
                                {set.duration?.toString() ?? '—'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                )}

                {/* RPE column (conditional) */}
                {showRpe && (
                    <TouchableOpacity
                        style={styles.rpeCell}
                        onPress={() => setShowRpeSelector(true)}
                        activeOpacity={0.7}
                    >
                        <Text style={[
                            styles.rpeText,
                            !set.rpe && styles.dataTextPlaceholder,
                            { opacity: textOpacity },
                        ]}>
                            {set.rpe != null ? (set.rpe % 1 === 0 ? set.rpe.toString() : set.rpe.toFixed(1)) : '—'}
                        </Text>
                    </TouchableOpacity>
                )}

                {/* Completion checkbox */}
                <Animated.View style={[
                    styles.checkboxContainer,
                    isActiveSet && !isCompleted && { opacity: pulseAnim },
                ]}>
                    <TouchableOpacity
                        style={[
                            styles.checkbox,
                            isCompleted && styles.checkboxCompleted,
                            isActiveSet && !isCompleted && styles.checkboxActive,
                        ]}
                        onPress={() => onCompleteSet(exerciseId, setId)}
                    >
                        {isCompleted && (
                            <Text style={styles.checkmark}>✓</Text>
                        )}
                    </TouchableOpacity>
                </Animated.View>
            </Animated.View>

            {/* Set type selection menu */}
            <SetTypeMenu
                visible={showTypeMenu}
                currentType={set.type}
                onSelect={(type) => onUpdateSet(exerciseId, setId, { type })}
                onClose={() => setShowTypeMenu(false)}
            />

            {/* RPE selector modal */}
            <RpeSelector
                visible={showRpeSelector}
                currentValue={set.rpe}
                onSelect={(val) => onUpdateSet(exerciseId, setId, { rpe: val })}
                onClose={() => setShowRpeSelector(false)}
            />
        </Swipeable>
    );
}

export default React.memo(SetRowInner);

const styles = StyleSheet.create({
    // Row — strict 40px height, no rounded corners, separator via border
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 40,
        paddingHorizontal: spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: colors.separator,
        backgroundColor: colors.background.secondary,
    },

    // Set badge — subtle rounded pill
    setBadge: {
        width: 28,
        height: 28,
        borderRadius: borderRadius.full,
        backgroundColor: colors.background.tertiary,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 6,
    },
    setBadgeWarmup: {
        // Muted gray for warmups — no bright colors
        backgroundColor: colors.background.tertiary,
    },
    setBadgeText: {
        color: colors.text.primary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
    },

    // Previous column — fixed 72px
    prevCell: {
        width: 72,
        justifyContent: 'center',
        alignItems: 'center',
    },
    prevText: {
        color: colors.text.disabled,
        fontSize: typography.size.sm,
        textAlign: 'center',
    },

    // Data cells — flex 1, centered
    dataCell: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    inlineInput: {
        paddingVertical: 2,
        paddingHorizontal: spacing.sm,
        borderRadius: borderRadius.sm,
        borderWidth: 1.5,
        borderColor: 'transparent',
        minWidth: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    inlineInputFocused: {
        borderColor: colors.accent.primary,
        backgroundColor: 'rgba(168, 85, 247, 0.08)',
    },
    dataText: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
        textAlign: 'center',
    },
    dataTextActive: {
        color: '#ffffff',
        fontWeight: typography.weight.bold,
    },
    dataTextPlaceholder: {
        color: colors.text.disabled,
    },

    // RPE cell
    rpeCell: {
        width: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rpeText: {
        color: colors.text.primary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        textAlign: 'center',
    },

    // Checkbox — 32×32 for tighter layout
    checkboxContainer: {
        width: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkbox: {
        width: 32,
        height: 32,
        borderRadius: borderRadius.md,
        borderWidth: 2,
        borderColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxCompleted: {
        backgroundColor: colors.accent.success,
        borderColor: colors.accent.success,
    },
    checkboxActive: {
        borderColor: colors.accent.primary,
    },
    checkmark: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.bold,
    },

    // Delete action (swipe)
    deleteAction: {
        backgroundColor: colors.accent.error,
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        height: 40,
    },
    deleteText: {
        color: colors.text.primary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
    },
});
