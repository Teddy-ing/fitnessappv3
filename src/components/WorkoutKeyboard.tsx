/**
 * WorkoutKeyboard Component
 * 
 * Custom numeric keyboard for workout input.
 * Features:
 * - Slide-up/slide-down animation
 * - Positioned at absolute bottom (covers tab bar)
 * - Numeric pad (0-9, decimal, clear, backspace)
 * - +5/-5 weight adjustment buttons
 * - "Next" button for field navigation
 * - Hide button to dismiss
 */

import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Dimensions,
    BackHandler,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const KEYBOARD_HEIGHT = 340; // Total height including padding

export type KeyboardFieldType = 'weight' | 'reps' | 'duration';

interface WorkoutKeyboardProps {
    visible: boolean;
    currentValue: string;
    fieldType: KeyboardFieldType;
    fieldLabel: string;
    onKeyPress: (key: string) => void;
    onBackspace: () => void;
    onClear: () => void;
    onAdjust: (delta: number) => void;
    onNext: () => void;
    onHide: () => void;
}

export default function WorkoutKeyboard({
    visible,
    currentValue,
    fieldType,
    fieldLabel,
    onKeyPress,
    onBackspace,
    onClear,
    onAdjust,
    onNext,
    onHide,
}: WorkoutKeyboardProps) {
    const slideAnim = useRef(new Animated.Value(KEYBOARD_HEIGHT)).current;
    const hasBeenVisible = useRef(false);

    // Track if keyboard has ever been shown
    useEffect(() => {
        if (visible) {
            hasBeenVisible.current = true;
        }
    }, [visible]);

    // Animate slide up/down
    useEffect(() => {
        Animated.spring(slideAnim, {
            toValue: visible ? 0 : KEYBOARD_HEIGHT,
            useNativeDriver: true,
            tension: 100,
            friction: 12,
        }).start();
    }, [visible]);

    // Handle Android back button
    useEffect(() => {
        if (!visible) return;

        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            onHide();
            return true; // Prevent default back behavior
        });

        return () => backHandler.remove();
    }, [visible, onHide]);

    // Don't render until keyboard has been shown at least once
    // And hide completely when not visible to avoid black curved area
    if (!visible && !hasBeenVisible.current) {
        return null;
    }

    // When hidden, don't render at all to avoid the rounded corner showing
    if (!visible) {
        return null;
    }

    // Get unit label
    const getUnitLabel = () => {
        switch (fieldType) {
            case 'weight': return 'lbs';
            case 'reps': return 'reps';
            case 'duration': return 'sec';
            default: return '';
        }
    };

    // Get adjustment amount based on field type
    const getAdjustAmount = () => {
        switch (fieldType) {
            case 'weight': return 5;
            case 'reps': return 1;
            case 'duration': return 10;
            default: return 1;
        }
    };

    const adjustAmount = getAdjustAmount();

    // Render a key button
    const renderKey = (
        label: string,
        onPress: () => void,
        style?: object,
        textStyle?: object
    ) => (
        <TouchableOpacity
            style={[styles.key, style]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Text style={[styles.keyText, textStyle]}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <Animated.View
            style={[
                styles.container,
                { transform: [{ translateY: slideAnim }] }
            ]}
        >
            {/* Current value display */}
            <View style={styles.displayRow}>
                <View style={styles.displayLeft}>
                    <Text style={styles.fieldLabel}>{fieldLabel}</Text>
                    <Text style={styles.currentValue}>
                        {currentValue || '—'} <Text style={styles.unitLabel}>{getUnitLabel()}</Text>
                    </Text>
                </View>
                <TouchableOpacity style={styles.hideButton} onPress={onHide}>
                    <Text style={styles.hideButtonText}>Hide ↓</Text>
                </TouchableOpacity>
            </View>

            {/* Keyboard layout */}
            <View style={styles.keyboardContainer}>
                {/* Left side: +/- buttons */}
                <View style={styles.adjustColumn}>
                    {renderKey(
                        `−${adjustAmount}`,
                        () => onAdjust(-adjustAmount),
                        styles.adjustKey,
                        styles.adjustKeyText
                    )}
                    {renderKey(
                        `+${adjustAmount}`,
                        () => onAdjust(adjustAmount),
                        styles.adjustKeyPositive,
                        styles.adjustKeyText
                    )}
                </View>

                {/* Center: Number pad */}
                <View style={styles.numpadContainer}>
                    <View style={styles.numpadRow}>
                        {renderKey('1', () => onKeyPress('1'))}
                        {renderKey('2', () => onKeyPress('2'))}
                        {renderKey('3', () => onKeyPress('3'))}
                    </View>
                    <View style={styles.numpadRow}>
                        {renderKey('4', () => onKeyPress('4'))}
                        {renderKey('5', () => onKeyPress('5'))}
                        {renderKey('6', () => onKeyPress('6'))}
                    </View>
                    <View style={styles.numpadRow}>
                        {renderKey('7', () => onKeyPress('7'))}
                        {renderKey('8', () => onKeyPress('8'))}
                        {renderKey('9', () => onKeyPress('9'))}
                    </View>
                    <View style={styles.numpadRow}>
                        {fieldType === 'weight'
                            ? renderKey('.', () => onKeyPress('.'), styles.keySecondary)
                            : <View style={styles.keyPlaceholder} />
                        }
                        {renderKey('0', () => onKeyPress('0'))}
                        {renderKey('C', onClear, styles.keySecondary)}
                    </View>
                </View>

                {/* Right side: Backspace and Next */}
                <View style={styles.actionColumn}>
                    {renderKey('⌫', onBackspace, styles.backspaceKey)}
                    <TouchableOpacity
                        style={styles.nextKey}
                        onPress={onNext}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.nextKeyText}>NEXT</Text>
                        <Text style={styles.nextArrow}>→</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: KEYBOARD_HEIGHT,
        backgroundColor: colors.background.secondary,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        // Shadow for elevation effect
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 20,
    },

    // Display row
    displayRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.separator,
    },
    displayLeft: {
        flex: 1,
    },
    fieldLabel: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        marginBottom: spacing.xs,
    },
    currentValue: {
        color: colors.text.primary,
        fontSize: typography.size.xxl,
        fontWeight: typography.weight.bold,
    },
    unitLabel: {
        color: colors.text.secondary,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.regular,
    },
    hideButton: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.md,
    },
    hideButtonText: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
    },

    // Keyboard container
    keyboardContainer: {
        flexDirection: 'row',
        paddingHorizontal: spacing.sm,
        paddingTop: spacing.md,
        flex: 1,
    },

    // Adjust column (left)
    adjustColumn: {
        width: 70,
        paddingRight: spacing.sm,
    },
    adjustKey: {
        flex: 1,
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.xs,
        borderWidth: 1,
        borderColor: colors.accent.error,
    },
    adjustKeyPositive: {
        flex: 1,
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.xs,
        borderWidth: 1,
        borderColor: colors.accent.success,
    },
    adjustKeyText: {
        color: colors.text.primary,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
    },

    // Numpad container (center)
    numpadContainer: {
        flex: 1,
    },
    numpadRow: {
        flexDirection: 'row',
        flex: 1,
        marginBottom: spacing.xs,
    },

    // Key styles
    key: {
        flex: 1,
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 2,
    },
    keyText: {
        color: colors.text.primary,
        fontSize: typography.size.xl,
        fontWeight: typography.weight.medium,
    },
    keySecondary: {
        backgroundColor: colors.background.primary,
    },
    keyPlaceholder: {
        flex: 1,
        marginHorizontal: 2,
    },

    // Action column (right)
    actionColumn: {
        width: 80,
        paddingLeft: spacing.sm,
    },
    backspaceKey: {
        height: 52,
        marginBottom: spacing.xs,
        backgroundColor: colors.background.tertiary,
    },
    nextKey: {
        flex: 1,
        backgroundColor: colors.accent.primary,
        borderRadius: borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    nextKeyText: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.bold,
    },
    nextArrow: {
        color: colors.text.primary,
        fontSize: typography.size.lg,
        marginTop: 2,
    },
});
