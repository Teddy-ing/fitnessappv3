import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Exercise } from '../../models/exercise';
import { colors, spacing, typography } from '../../theme';
import ExerciseDetailsContent from './ExerciseDetailsContent';

/** Shows the guide inside the current native modal, keeping its editor mounted. */
export default function ExerciseInfoView({ exercise, onBack, returnLabel }: {
    exercise: Exercise;
    onBack: () => void;
    returnLabel: string;
}) {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={onBack}
                    style={styles.backButton}
                    accessibilityRole="button"
                    accessibilityLabel={returnLabel}
                >
                    <MaterialIcons name="arrow-back" size={24} color={colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.title} numberOfLines={2}>{exercise.name}</Text>
            </View>
            <ExerciseDetailsContent key={exercise.id} exerciseId={exercise.id} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background.primary },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: { padding: spacing.sm, minWidth: 44, minHeight: 44 },
    title: {
        flex: 1,
        color: colors.text.primary,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        marginHorizontal: spacing.sm,
    },
});
