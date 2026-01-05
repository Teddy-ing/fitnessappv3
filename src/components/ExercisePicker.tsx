/**
 * ExercisePicker Component
 * 
 * Modal for selecting exercises to add to the workout.
 * Features:
 * - Search functionality
 * - Category filtering
 * - Recent exercises (TODO)
 * - Favorites (TODO)
 */

import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    Modal,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Exercise, ExerciseCategory, MuscleGroup } from '../models/exercise';
import { SEED_EXERCISES, searchExercises } from '../data';
import { colors, spacing, borderRadius, typography } from '../theme';

interface ExercisePickerProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (exercise: Exercise) => void;
}

// Filter tabs
type FilterTab = 'all' | 'favorites' | 'recent' | MuscleGroup;

const MUSCLE_FILTERS: { key: MuscleGroup; label: string }[] = [
    { key: 'chest', label: 'Chest' },
    { key: 'back', label: 'Back' },
    { key: 'shoulders', label: 'Shoulders' },
    { key: 'biceps', label: 'Biceps' },
    { key: 'triceps', label: 'Triceps' },
    { key: 'quads', label: 'Quads' },
    { key: 'hamstrings', label: 'Hamstrings' },
    { key: 'glutes', label: 'Glutes' },
    { key: 'core', label: 'Core' },
    { key: 'calves', label: 'Calves' },
];

export default function ExercisePicker({
    visible,
    onClose,
    onSelect,
}: ExercisePickerProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

    // Filter and search exercises
    const filteredExercises = useMemo(() => {
        let exercises = SEED_EXERCISES;

        // Apply muscle group filter
        if (activeFilter !== 'all' && activeFilter !== 'favorites' && activeFilter !== 'recent') {
            exercises = exercises.filter(ex =>
                ex.muscleGroups.some(mg => mg.muscle === activeFilter && mg.isPrimary)
            );
        }

        // Apply favorites filter (TODO: track favorites in store)
        if (activeFilter === 'favorites') {
            exercises = exercises.filter(ex => ex.isFavorite);
        }

        // Apply search
        if (searchQuery.trim()) {
            const lowerQuery = searchQuery.toLowerCase();
            exercises = exercises.filter(ex =>
                ex.name.toLowerCase().includes(lowerQuery)
            );
        }

        return exercises;
    }, [searchQuery, activeFilter]);

    // Handle exercise selection
    const handleSelect = (exercise: Exercise) => {
        onSelect(exercise);
        setSearchQuery('');
        setActiveFilter('all');
    };

    // Handle close
    const handleClose = () => {
        setSearchQuery('');
        setActiveFilter('all');
        onClose();
    };

    // Render exercise item
    const renderExerciseItem = ({ item }: { item: Exercise }) => {
        const primaryMuscle = item.muscleGroups.find(mg => mg.isPrimary)?.muscle ?? '';
        const formattedMuscle = primaryMuscle.replace('_', ' ');
        const equipment = item.equipment[0]?.replace('_', ' ') ?? '';

        return (
            <TouchableOpacity
                style={styles.exerciseItem}
                onPress={() => handleSelect(item)}
            >
                <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName}>{item.name}</Text>
                    <Text style={styles.exerciseMeta}>
                        {formattedMuscle} • {equipment}
                    </Text>
                </View>
                <Text style={styles.addIcon}>+</Text>
            </TouchableOpacity>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <SafeAreaView style={styles.container} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleClose}>
                        <Text style={styles.cancelButton}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Add Exercise</Text>
                    <View style={styles.headerSpacer} />
                </View>

                {/* Search bar */}
                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search exercises..."
                        placeholderTextColor={colors.text.secondary}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                </View>

                {/* Filter tabs */}
                <View style={styles.filterContainer}>
                    <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        data={[
                            { key: 'all', label: 'All' },
                            ...MUSCLE_FILTERS,
                        ]}
                        keyExtractor={(item) => item.key}
                        contentContainerStyle={styles.filterList}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[
                                    styles.filterTab,
                                    activeFilter === item.key && styles.filterTabActive,
                                ]}
                                onPress={() => setActiveFilter(item.key as FilterTab)}
                            >
                                <Text
                                    style={[
                                        styles.filterTabText,
                                        activeFilter === item.key && styles.filterTabTextActive,
                                    ]}
                                >
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>

                {/* Exercise list */}
                <FlatList
                    data={filteredExercises}
                    keyExtractor={(item) => item.id}
                    renderItem={renderExerciseItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No exercises found</Text>
                            <Text style={styles.emptySubtext}>
                                Try a different search or filter
                            </Text>
                        </View>
                    }
                />
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.primary,
    },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.separator,
    },
    cancelButton: {
        color: colors.accent.primary,
        fontSize: typography.size.md,
    },
    title: {
        color: colors.text.primary,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
    },
    headerSpacer: {
        width: 60,
    },

    // Search
    searchContainer: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
    },
    searchInput: {
        backgroundColor: colors.background.secondary,
        color: colors.text.primary,
        fontSize: typography.size.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
    },

    // Filters
    filterContainer: {
        borderBottomWidth: 1,
        borderBottomColor: colors.separator,
    },
    filterList: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.md,
    },
    filterTab: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.full,
        backgroundColor: colors.background.secondary,
        marginRight: spacing.sm,
    },
    filterTabActive: {
        backgroundColor: colors.accent.primary,
    },
    filterTabText: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
    },
    filterTabTextActive: {
        color: colors.text.primary,
    },

    // List
    listContent: {
        padding: spacing.md,
    },
    exerciseItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    exerciseInfo: {
        flex: 1,
    },
    exerciseName: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
        marginBottom: spacing.xs,
    },
    exerciseMeta: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
    },
    addIcon: {
        color: colors.accent.primary,
        fontSize: typography.size.xxl,
        fontWeight: typography.weight.bold,
    },

    // Empty state
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyText: {
        color: colors.text.primary,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.medium,
        marginBottom: spacing.sm,
    },
    emptySubtext: {
        color: colors.text.secondary,
        fontSize: typography.size.md,
    },
});
