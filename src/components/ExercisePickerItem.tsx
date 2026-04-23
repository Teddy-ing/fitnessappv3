/**
 * ExercisePickerItem Component
 *
 * Renders a single exercise row in the ExercisePicker list.
 * Extracted from ExercisePicker (TD-040 component size fix).
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Exercise } from '../models/exercise';
import { colors, spacing, borderRadius, typography } from '../theme';

// Placeholder image for exercises
const EXERCISE_PLACEHOLDER = require('../../assets/exercise-placeholder.png');

interface ExercisePickerItemProps {
    exercise: Exercise;
    isHiddenView: boolean;
    onSelect: (exercise: Exercise) => void;
    onToggleFavorite: (exercise: Exercise) => void;
    onLongPress: (exercise: Exercise) => void;
    onUnhide: (exercise: Exercise) => void;
}

function ExercisePickerItem({
    exercise,
    isHiddenView,
    onSelect,
    onToggleFavorite,
    onLongPress,
    onUnhide,
}: ExercisePickerItemProps) {
    const primaryMuscle = exercise.muscleGroups.find(mg => mg.isPrimary)?.muscle ?? '';
    const formattedMuscle = primaryMuscle.replace('_', ' ');
    const equipment = exercise.equipment[0]?.replace('_', ' ') ?? '';

    return (
        <TouchableOpacity
            style={styles.exerciseItem}
            onPress={() => isHiddenView ? null : onSelect(exercise)}
            onLongPress={() => onLongPress(exercise)}
            disabled={isHiddenView}
        >
            <Image
                source={exercise.imageUrl ? { uri: exercise.imageUrl } : EXERCISE_PLACEHOLDER}
                style={styles.exerciseImage}
                resizeMode="cover"
            />
            <View style={styles.exerciseInfo}>
                <View style={styles.exerciseNameRow}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    {exercise.isCustom && <Text style={styles.customBadge}>Custom</Text>}
                    {exercise.isHidden && <Text style={styles.hiddenBadge}>Hidden</Text>}
                </View>
                <Text style={styles.exerciseMeta}>
                    {formattedMuscle} • {equipment}
                </Text>
            </View>
            {isHiddenView ? (
                <TouchableOpacity
                    style={styles.unhideButton}
                    onPress={() => onUnhide(exercise)}
                >
                    <Text style={styles.unhideButtonText}>Unhide</Text>
                </TouchableOpacity>
            ) : (
                <>
                    <TouchableOpacity
                        style={styles.starButton}
                        onPress={() => onToggleFavorite(exercise)}
                    >
                        <Text style={[styles.starIcon, exercise.isFavorite && styles.starIconActive]}>
                            {exercise.isFavorite ? '★' : '☆'}
                        </Text>
                    </TouchableOpacity>
                    <Text style={styles.addIcon}>+</Text>
                </>
            )}
        </TouchableOpacity>
    );
}

export default React.memo(ExercisePickerItem);

const styles = StyleSheet.create({
    exerciseItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    exerciseImage: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.sm,
        marginRight: spacing.md,
        backgroundColor: colors.background.tertiary,
    },
    exerciseInfo: {
        flex: 1,
    },
    exerciseNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    exerciseName: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
    },
    customBadge: {
        color: colors.accent.primary,
        fontSize: typography.size.xs,
        marginLeft: spacing.sm,
        backgroundColor: colors.accent.primary + '20',
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    hiddenBadge: {
        color: colors.text.disabled,
        fontSize: typography.size.xs,
        marginLeft: spacing.sm,
        backgroundColor: colors.background.tertiary,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    exerciseMeta: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
    },
    starButton: {
        padding: spacing.sm,
    },
    starIcon: {
        color: colors.text.secondary,
        fontSize: 20,
    },
    starIconActive: {
        color: colors.accent.warning,
    },
    addIcon: {
        color: colors.accent.primary,
        fontSize: typography.size.xxl,
        fontWeight: typography.weight.bold,
    },
    unhideButton: {
        backgroundColor: colors.accent.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
    },
    unhideButtonText: {
        color: colors.text.primary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
    },
});
