/**
 * AddExerciseScreen
 * 
 * Modal screen for creating and editing custom exercises.
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Modal,
    TextInput,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, borderRadius, typography } from '../theme';
import { createCustomExercise, updateCustomExercise, deleteExercise } from '../services';
import { Exercise, ExerciseCategory, MuscleGroup, Equipment } from '../models/exercise';

interface AddExerciseScreenProps {
    visible: boolean;
    onClose: () => void;
    onSave: () => void;
    editingExercise?: Exercise | null; // If provided, we're editing
}

const CATEGORIES: { value: ExerciseCategory; label: string }[] = [
    { value: 'strength', label: 'Strength' },
    { value: 'cardio', label: 'Cardio' },
    { value: 'stretch', label: 'Stretch' },
    { value: 'mobility', label: 'Mobility' },
    { value: 'warmup', label: 'Warmup' },
    { value: 'plyometric', label: 'Plyometric' },
    { value: 'isometric', label: 'Isometric' },
];

const MUSCLE_GROUPS: { value: MuscleGroup; label: string }[] = [
    { value: 'chest', label: 'Chest' },
    { value: 'back', label: 'Back' },
    { value: 'shoulders', label: 'Shoulders' },
    { value: 'biceps', label: 'Biceps' },
    { value: 'triceps', label: 'Triceps' },
    { value: 'forearms', label: 'Forearms' },
    { value: 'core', label: 'Core' },
    { value: 'quads', label: 'Quads' },
    { value: 'hamstrings', label: 'Hamstrings' },
    { value: 'glutes', label: 'Glutes' },
    { value: 'calves', label: 'Calves' },
    { value: 'traps', label: 'Traps' },
    { value: 'lats', label: 'Lats' },
    { value: 'full_body', label: 'Full Body' },
];

const EQUIPMENT: { value: Equipment; label: string }[] = [
    { value: 'barbell', label: 'Barbell' },
    { value: 'dumbbell', label: 'Dumbbell' },
    { value: 'kettlebell', label: 'Kettlebell' },
    { value: 'cable', label: 'Cable' },
    { value: 'machine', label: 'Machine' },
    { value: 'bodyweight', label: 'Bodyweight' },
    { value: 'resistance_band', label: 'Resistance Band' },
    { value: 'pull_up_bar', label: 'Pull-up Bar' },
    { value: 'bench', label: 'Bench' },
    { value: 'none', label: 'None' },
];

export default function AddExerciseScreen({ visible, onClose, onSave, editingExercise }: AddExerciseScreenProps) {
    const [name, setName] = useState('');
    const [category, setCategory] = useState<ExerciseCategory>('strength');
    const [selectedMuscles, setSelectedMuscles] = useState<MuscleGroup[]>([]);
    const [selectedEquipment, setSelectedEquipment] = useState<Equipment[]>([]);
    const [description, setDescription] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Populate form when editing
    useEffect(() => {
        if (editingExercise) {
            setName(editingExercise.name);
            setCategory(editingExercise.category);
            setSelectedMuscles(editingExercise.muscleGroups.filter(m => m.isPrimary).map(m => m.muscle));
            setSelectedEquipment(editingExercise.equipment);
            setDescription(editingExercise.description || '');
        } else {
            resetForm();
        }
    }, [editingExercise, visible]);

    const resetForm = () => {
        setName('');
        setCategory('strength');
        setSelectedMuscles([]);
        setSelectedEquipment([]);
        setDescription('');
    };

    const toggleMuscle = (muscle: MuscleGroup) => {
        setSelectedMuscles(prev =>
            prev.includes(muscle)
                ? prev.filter(m => m !== muscle)
                : [...prev, muscle]
        );
    };

    const toggleEquipment = (equip: Equipment) => {
        setSelectedEquipment(prev =>
            prev.includes(equip)
                ? prev.filter(e => e !== equip)
                : [...prev, equip]
        );
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter an exercise name.');
            return;
        }

        if (selectedMuscles.length === 0) {
            Alert.alert('Error', 'Please select at least one muscle group.');
            return;
        }

        setIsSaving(true);

        try {
            if (editingExercise) {
                // Update existing
                await updateCustomExercise(editingExercise.id, {
                    name: name.trim(),
                    category,
                    muscleGroups: selectedMuscles.map(muscle => ({
                        muscle,
                        contribution: Math.floor(100 / selectedMuscles.length),
                        isPrimary: true,
                    })),
                    equipment: selectedEquipment.length > 0 ? selectedEquipment : ['none'],
                    description: description.trim() || undefined,
                });
            } else {
                // Create new
                await createCustomExercise(
                    name.trim(),
                    category,
                    selectedMuscles,
                    selectedEquipment.length > 0 ? selectedEquipment : ['none'],
                    {
                        description: description.trim() || undefined,
                    }
                );
            }

            onSave();
            onClose();
            resetForm();
        } catch (error) {
            console.error('Error saving exercise:', error);
            Alert.alert('Error', 'Failed to save exercise. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = () => {
        if (!editingExercise) return;

        Alert.alert(
            'Delete Exercise',
            `Are you sure you want to delete "${editingExercise.name}"? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteExercise(editingExercise.id);
                        onSave();
                        onClose();
                        resetForm();
                    },
                },
            ]
        );
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
            <SafeAreaView style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={styles.closeButton}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>
                        {editingExercise ? 'Edit Exercise' : 'Add Exercise'}
                    </Text>
                    <TouchableOpacity onPress={handleSave} disabled={isSaving}>
                        <Text style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}>
                            {isSaving ? 'Saving...' : 'Save'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
                    {/* Name */}
                    <Text style={styles.label}>Exercise Name</Text>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="e.g., Bulgarian Split Squat"
                        placeholderTextColor={colors.text.disabled}
                    />

                    {/* Category */}
                    <Text style={styles.label}>Category</Text>
                    <View style={styles.chipContainer}>
                        {CATEGORIES.map(cat => (
                            <TouchableOpacity
                                key={cat.value}
                                style={[styles.chip, category === cat.value && styles.chipSelected]}
                                onPress={() => setCategory(cat.value)}
                            >
                                <Text style={[styles.chipText, category === cat.value && styles.chipTextSelected]}>
                                    {cat.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Muscle Groups */}
                    <Text style={styles.label}>Muscle Groups</Text>
                    <View style={styles.chipContainer}>
                        {MUSCLE_GROUPS.map(muscle => (
                            <TouchableOpacity
                                key={muscle.value}
                                style={[styles.chip, selectedMuscles.includes(muscle.value) && styles.chipSelected]}
                                onPress={() => toggleMuscle(muscle.value)}
                            >
                                <Text style={[styles.chipText, selectedMuscles.includes(muscle.value) && styles.chipTextSelected]}>
                                    {muscle.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Equipment */}
                    <Text style={styles.label}>Equipment</Text>
                    <View style={styles.chipContainer}>
                        {EQUIPMENT.map(equip => (
                            <TouchableOpacity
                                key={equip.value}
                                style={[styles.chip, selectedEquipment.includes(equip.value) && styles.chipSelected]}
                                onPress={() => toggleEquipment(equip.value)}
                            >
                                <Text style={[styles.chipText, selectedEquipment.includes(equip.value) && styles.chipTextSelected]}>
                                    {equip.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Description */}
                    <Text style={styles.label}>Description (Optional)</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Add notes about this exercise..."
                        placeholderTextColor={colors.text.disabled}
                        multiline
                        numberOfLines={3}
                    />

                    {/* Delete button (edit mode only) */}
                    {editingExercise && editingExercise.isCustom && (
                        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                            <Text style={styles.deleteButtonText}>Delete Exercise</Text>
                        </TouchableOpacity>
                    )}

                    <View style={styles.bottomSpacer} />
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.primary,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    closeButton: {
        color: colors.text.secondary,
        fontSize: typography.size.md,
    },
    title: {
        color: colors.text.primary,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
    },
    saveButton: {
        color: colors.accent.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
    },
    saveButtonDisabled: {
        opacity: 0.5,
    },
    content: {
        flex: 1,
        padding: spacing.md,
    },
    label: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
    },
    input: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        color: colors.text.primary,
        fontSize: typography.size.md,
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    chip: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    chipSelected: {
        backgroundColor: colors.accent.primary + '20',
        borderColor: colors.accent.primary,
    },
    chipText: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
    },
    chipTextSelected: {
        color: colors.accent.primary,
        fontWeight: typography.weight.medium,
    },
    deleteButton: {
        backgroundColor: colors.accent.error,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        alignItems: 'center',
        marginTop: spacing.xl,
    },
    deleteButtonText: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
    },
    bottomSpacer: {
        height: spacing.xxl,
    },
});
