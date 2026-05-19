/**
 * Custom Exercise Config Modal
 *
 * Modal for configuring a new custom exercise during competitor import.
 * Shows the exercise name from the CSV and lets the user pick a
 * muscle group and equipment type before creating the exercise.
 *
 * Extracted from ExerciseMappingScreen (TD-052) to keep the parent under
 * the 600-line guardrail.
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Modal,
} from 'react-native';

import { colors, spacing, borderRadius, typography } from '../../theme';
import type { MuscleGroup, Equipment } from '../../models/exercise';

// ============================================================
// Config Options
// ============================================================

const MUSCLE_GROUP_OPTIONS: { key: MuscleGroup; label: string }[] = [
    { key: 'chest', label: 'Chest' },
    { key: 'back', label: 'Back' },
    { key: 'shoulders', label: 'Shoulders' },
    { key: 'biceps', label: 'Biceps' },
    { key: 'triceps', label: 'Triceps' },
    { key: 'quads', label: 'Quads' },
    { key: 'hamstrings', label: 'Hamstrings' },
    { key: 'glutes', label: 'Glutes' },
    { key: 'calves', label: 'Calves' },
    { key: 'core', label: 'Core' },
    { key: 'traps', label: 'Traps' },
    { key: 'lats', label: 'Lats' },
    { key: 'forearms', label: 'Forearms' },
    { key: 'full_body', label: 'Full Body' },
];

const EQUIPMENT_OPTIONS: { key: Equipment; label: string }[] = [
    { key: 'barbell', label: 'Barbell' },
    { key: 'dumbbell', label: 'Dumbbell' },
    { key: 'cable', label: 'Cable' },
    { key: 'machine', label: 'Machine' },
    { key: 'smith_machine', label: 'Smith Machine' },
    { key: 'bodyweight', label: 'Bodyweight' },
    { key: 'kettlebell', label: 'Kettlebell' },
    { key: 'ez_bar', label: 'EZ Bar' },
    { key: 'resistance_band', label: 'Band' },
    { key: 'other', label: 'Other' },
    { key: 'none', label: 'None' },
];

// ============================================================
// Props
// ============================================================

interface CustomExerciseConfigModalProps {
    visible: boolean;
    exerciseName: string;
    onClose: () => void;
    onConfirm: (muscleGroup: MuscleGroup | null, equipment: Equipment | null) => void;
}

// ============================================================
// Component
// ============================================================

export default function CustomExerciseConfigModal({
    visible,
    exerciseName,
    onClose,
    onConfirm,
}: CustomExerciseConfigModalProps) {
    const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null);
    const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);

    const handleConfirm = useCallback(() => {
        onConfirm(selectedMuscle, selectedEquipment);
        // Reset for next use
        setSelectedMuscle(null);
        setSelectedEquipment(null);
    }, [selectedMuscle, selectedEquipment, onConfirm]);

    const handleClose = useCallback(() => {
        onClose();
        setSelectedMuscle(null);
        setSelectedEquipment(null);
    }, [onClose]);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleClose}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>New Exercise</Text>
                    <TouchableOpacity onPress={handleConfirm}>
                        <Text style={styles.doneText}>Create</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.scroll}>
                    <Text style={styles.exerciseName}>
                        "{exerciseName}"
                    </Text>

                    <Text style={styles.sectionTitle}>MUSCLE GROUP</Text>
                    <View style={styles.chipGrid}>
                        {MUSCLE_GROUP_OPTIONS.map((opt) => (
                            <TouchableOpacity
                                key={opt.key}
                                style={[
                                    styles.chip,
                                    selectedMuscle === opt.key && styles.chipSelected,
                                ]}
                                onPress={() => setSelectedMuscle(
                                    selectedMuscle === opt.key ? null : opt.key,
                                )}
                            >
                                <Text style={[
                                    styles.chipText,
                                    selectedMuscle === opt.key && styles.chipTextSelected,
                                ]}>
                                    {opt.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.sectionTitle}>EQUIPMENT</Text>
                    <View style={styles.chipGrid}>
                        {EQUIPMENT_OPTIONS.map((opt) => (
                            <TouchableOpacity
                                key={opt.key}
                                style={[
                                    styles.chip,
                                    selectedEquipment === opt.key && styles.chipSelected,
                                ]}
                                onPress={() => setSelectedEquipment(
                                    selectedEquipment === opt.key ? null : opt.key,
                                )}
                            >
                                <Text style={[
                                    styles.chipText,
                                    selectedEquipment === opt.key && styles.chipTextSelected,
                                ]}>
                                    {opt.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background.primary },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: spacing.md, paddingVertical: spacing.md,
        borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    cancelText: { fontSize: typography.size.md, color: colors.text.secondary },
    title: { fontSize: typography.size.lg, fontWeight: typography.weight.semibold, color: colors.text.primary },
    doneText: { fontSize: typography.size.md, fontWeight: typography.weight.semibold, color: colors.accent.primary },
    scroll: { padding: spacing.lg },
    exerciseName: {
        fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.text.primary,
        textAlign: 'center', marginBottom: spacing.xl,
    },
    sectionTitle: {
        fontSize: typography.size.xs, fontWeight: typography.weight.semibold,
        color: colors.text.secondary, letterSpacing: 0.5, marginBottom: spacing.sm, marginTop: spacing.md,
    },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    chip: {
        paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
        borderRadius: borderRadius.full, backgroundColor: colors.background.secondary,
        borderWidth: 1, borderColor: colors.border,
    },
    chipSelected: { backgroundColor: colors.accent.primary + '20', borderColor: colors.accent.primary },
    chipText: { fontSize: typography.size.sm, color: colors.text.secondary },
    chipTextSelected: { color: colors.accent.primary, fontWeight: typography.weight.semibold },
});
