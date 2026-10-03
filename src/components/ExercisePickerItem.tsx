/**
 * ExercisePickerItem Component
 *
 * Renders a single exercise row in the ExercisePicker list.
 * Extracted from ExercisePicker (TD-040 component size fix).
 */

import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Exercise } from '../models/exercise';
import { useThemeColors, createThemedStyles, spacing, borderRadius, typography } from '../theme';

// Placeholder image for exercises
const EXERCISE_PLACEHOLDER = require('../../assets/exercise-placeholder.jpg');

interface ExercisePickerItemProps {
    exercise: Exercise;
    isHiddenView: boolean;
    onSelect: (exercise: Exercise) => void;
    onToggleFavorite: (exercise: Exercise) => void;
    onLongPress: (exercise: Exercise) => void;
    onUnhide: (exercise: Exercise) => void;
    onShowInfo: (exercise: Exercise) => void;
}

function ExercisePickerItem({
    exercise,
    isHiddenView,
    onSelect,
    onToggleFavorite,
    onLongPress,
    onUnhide,
    onShowInfo,
}: ExercisePickerItemProps) {
    const styles = useStyles();
    const colors = useThemeColors();
    const primaryMuscle = exercise.muscleGroups.find(mg => mg.isPrimary)?.muscle ?? '';
    const formattedMuscle = primaryMuscle.replace('_', ' ');
    const equipment = exercise.equipment[0]?.replace('_', ' ') ?? '';

    return (
        <View style={styles.exerciseItem}>
            <TouchableOpacity
                style={styles.selectButton}
                accessibilityRole="button"
                accessibilityLabel={`Add ${exercise.name}`}
                onPress={() => onSelect(exercise)}
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
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.infoButton}
                accessibilityRole="button"
                accessibilityLabel={`Information about ${exercise.name}`}
                onPress={() => onShowInfo(exercise)}
            >
                <MaterialIcons name="info-outline" size={22} color={colors.text.secondary} />
            </TouchableOpacity>
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
                        accessibilityRole="button"
                        accessibilityLabel={`${exercise.isFavorite ? 'Unfavorite' : 'Favorite'} ${exercise.name}`}
                        onPress={() => onToggleFavorite(exercise)}
                    >
                        <Text style={[styles.starIcon, exercise.isFavorite && styles.starIconActive]}>
                            {exercise.isFavorite ? '★' : '☆'}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.addButton}
                        accessibilityRole="button"
                        accessibilityLabel={`Add ${exercise.name}`}
                        onPress={() => onSelect(exercise)}
                    >
                        <Text style={styles.addIcon}>+</Text>
                    </TouchableOpacity>
                </>
            )}
        </View>
    );
}

export default React.memo(ExercisePickerItem);

const useStyles = createThemedStyles((colors) => ({
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
        marginRight: spacing.sm,
        backgroundColor: colors.background.tertiary,
    },
    exerciseInfo: {
        flex: 1,
    },
    selectButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 44,
    },
    infoButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    exerciseNameRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    exerciseName: {
        flexShrink: 1,
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
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addButton: {
        minWidth: 36,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
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
        color: colors.text.onAccent,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
    },
}));
