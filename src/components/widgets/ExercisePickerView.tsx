/**
 * ExercisePickerView
 *
 * Extracted sub-component of WidgetEditorModal. Renders the exercise
 * picker flow for adding a Pinned Exercise widget: metric toggle
 * (1RM / Volume), searchable exercise list, and a "Back to catalog" button.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, spacing, typography, borderRadius } from '../../theme';
import { getPerformedExercises } from '../../services';
import { PerformedExercise } from '../../models/analytics';

// ============================================================
// Types
// ============================================================

interface ExercisePickerViewProps {
    /** Called when the user selects an exercise + metric */
    onSelect: (exercise: PerformedExercise, metric: '1rm' | 'volume') => void;
    /** Called when the user taps "Back to catalog" */
    onBack: () => void;
}

// ============================================================
// Component
// ============================================================

export default function ExercisePickerView({ onSelect, onBack }: ExercisePickerViewProps) {
    const [exercises, setExercises] = useState<PerformedExercise[]>([]);
    const [exerciseSearch, setExerciseSearch] = useState('');
    const [selectedMetric, setSelectedMetric] = useState<'1rm' | 'volume'>('1rm');

    // Load performed exercises on mount
    useEffect(() => {
        getPerformedExercises('ALL').then(setExercises).catch(() => setExercises([]));
    }, []);

    const handleSelect = useCallback(
        (exercise: PerformedExercise) => {
            onSelect(exercise, selectedMetric);
        },
        [onSelect, selectedMetric],
    );

    const filteredExercises = exercises
        .filter((e) =>
            exerciseSearch.length === 0 ||
            e.exerciseName.toLowerCase().includes(exerciseSearch.toLowerCase()),
        )
        .slice(0, 20);

    return (
        <>
            {/* Metric toggle */}
            <View style={styles.metricToggle}>
                <TouchableOpacity
                    style={[styles.metricButton, selectedMetric === '1rm' && styles.metricButtonActive]}
                    onPress={() => setSelectedMetric('1rm')}
                >
                    <Text style={[styles.metricButtonText, selectedMetric === '1rm' && styles.metricButtonTextActive]}>
                        Est. 1RM
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.metricButton, selectedMetric === 'volume' && styles.metricButtonActive]}
                    onPress={() => setSelectedMetric('volume')}
                >
                    <Text style={[styles.metricButtonText, selectedMetric === 'volume' && styles.metricButtonTextActive]}>
                        Volume
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <MaterialIcons name="search" size={18} color={colors.text.disabled} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search exercises..."
                    placeholderTextColor={colors.text.disabled}
                    value={exerciseSearch}
                    onChangeText={setExerciseSearch}
                    autoCapitalize="none"
                />
                {exerciseSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setExerciseSearch('')}>
                        <MaterialIcons name="close" size={16} color={colors.text.disabled} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Exercise list */}
            {filteredExercises.map((exercise) => (
                <TouchableOpacity
                    key={exercise.exerciseId}
                    style={styles.exerciseItem}
                    onPress={() => handleSelect(exercise)}
                    activeOpacity={0.7}
                >
                    <View style={styles.exerciseInfo}>
                        <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
                        {exercise.primaryMuscle && (
                            <Text style={styles.exerciseMuscle}>{exercise.primaryMuscle}</Text>
                        )}
                    </View>
                    <Text style={styles.exerciseSessions}>{exercise.totalSessions} sessions</Text>
                </TouchableOpacity>
            ))}

            <TouchableOpacity
                style={styles.backButton}
                onPress={onBack}
                activeOpacity={0.7}
            >
                <MaterialIcons name="arrow-back" size={18} color={colors.text.secondary} />
                <Text style={styles.backButtonText}>Back to catalog</Text>
            </TouchableOpacity>
        </>
    );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
    // Metric toggle
    metricToggle: {
        flexDirection: 'row',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.md,
        marginBottom: spacing.md,
        padding: 3,
    },
    metricButton: {
        flex: 1,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        borderRadius: borderRadius.sm,
    },
    metricButtonActive: {
        backgroundColor: colors.accent.primary,
    },
    metricButtonText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
    },
    metricButtonTextActive: {
        color: '#fff',
    },

    // Search
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        marginBottom: spacing.md,
    },
    searchInput: {
        flex: 1,
        fontSize: typography.size.sm,
        color: colors.text.primary,
        marginLeft: spacing.sm,
        paddingVertical: 0,
    },

    // Exercise list items
    exerciseItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.xs,
    },
    exerciseInfo: {
        flex: 1,
        marginRight: spacing.sm,
    },
    exerciseName: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
    },
    exerciseMuscle: {
        fontSize: typography.size.xs,
        color: colors.text.secondary,
        marginTop: 2,
    },
    exerciseSessions: {
        fontSize: typography.size.xs,
        color: colors.text.disabled,
    },

    // Back button
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.md,
        marginTop: spacing.sm,
    },
    backButtonText: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        marginLeft: spacing.xs,
    },
});
