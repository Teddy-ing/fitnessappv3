/**
 * ExercisePicker Component
 * 
 * Modal for selecting exercises to add to the workout.
 * Features:
 * - Search functionality
 * - Category filtering
 * - Custom exercise creation
 * - Favorites with star toggle
 * - Hide exercises (long-press)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    Modal,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    Alert,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Exercise, MuscleGroup, ExerciseCategory } from '../models/exercise';
import { getExercises, toggleExerciseFavorite, toggleExerciseHidden } from '../services';
import { colors, spacing, borderRadius, typography } from '../theme';
import AddExerciseScreen from '../screens/AddExerciseScreen';

interface ExercisePickerProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (exercise: Exercise) => void;
}

// Filter tabs
type FilterTab = 'all' | 'favorites' | 'hidden' | MuscleGroup;
type CategoryTab = 'all' | ExerciseCategory;

// Placeholder image for exercises
const EXERCISE_PLACEHOLDER = require('../../assets/exercise-placeholder.png');

const CATEGORY_TABS: { key: CategoryTab; label: string; icon: string }[] = [
    { key: 'all', label: 'All', icon: '🏋️' },
    { key: 'strength', label: 'Strength', icon: '💪' },
    { key: 'cardio', label: 'Cardio', icon: '❤️' },
    { key: 'stretch', label: 'Stretch', icon: '🧘' },
];

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
    const [activeCategory, setActiveCategory] = useState<CategoryTab>('all');
    const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [hiddenExercises, setHiddenExercises] = useState<Exercise[]>([]);
    const [showAddExercise, setShowAddExercise] = useState(false);
    const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);

    // Load exercises from service
    const loadExercises = useCallback(async () => {
        const [visible, hidden] = await Promise.all([
            getExercises(false),
            getExercises(true),
        ]);
        setExercises(visible);
        // Hidden = all that are in 'all' but not in 'visible'
        setHiddenExercises(hidden.filter(ex => ex.isHidden));
    }, []);

    useEffect(() => {
        if (visible) {
            loadExercises();
        }
    }, [visible, loadExercises]);

    // Filter and search exercises
    const filteredExercises = React.useMemo(() => {
        // For hidden tab, show hidden exercises
        if (activeFilter === 'hidden') {
            if (searchQuery.trim()) {
                const lowerQuery = searchQuery.toLowerCase();
                return hiddenExercises.filter(ex => ex.name.toLowerCase().includes(lowerQuery));
            }
            return hiddenExercises;
        }

        let result = exercises;

        // Apply category filter first
        if (activeCategory !== 'all') {
            result = result.filter(ex => ex.category === activeCategory);
        }

        // Apply muscle group filter (only for strength exercises)
        if (activeFilter !== 'all' && activeFilter !== 'favorites') {
            result = result.filter(ex =>
                ex.muscleGroups.some(mg => mg.muscle === activeFilter && mg.isPrimary)
            );
        }

        // Apply favorites filter
        if (activeFilter === 'favorites') {
            result = result.filter(ex => ex.isFavorite);
        }

        // Apply search
        if (searchQuery.trim()) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(ex =>
                ex.name.toLowerCase().includes(lowerQuery)
            );
        }

        return result;
    }, [exercises, hiddenExercises, searchQuery, activeFilter, activeCategory]);

    // Handle exercise selection
    const handleSelect = (exercise: Exercise) => {
        onSelect(exercise);
        setSearchQuery('');
        setActiveFilter('all');
    };

    // Handle close
    const handleClose = () => {
        setSearchQuery('');
        setActiveCategory('all');
        setActiveFilter('all');
        onClose();
    };

    // Toggle favorite (optimistic update)
    const handleToggleFavorite = async (exercise: Exercise) => {
        setExercises(prev => prev.map(ex =>
            ex.id === exercise.id ? { ...ex, isFavorite: !ex.isFavorite } : ex
        ));
        await toggleExerciseFavorite(exercise.id);
    };

    // Handle long-press to show options (hide/edit)
    const handleLongPress = (exercise: Exercise) => {
        const buttons: { text: string; onPress?: () => void; style?: 'cancel' | 'default' | 'destructive' }[] = [
            { text: 'Cancel', style: 'cancel' },
            {
                text: exercise.isFavorite ? 'Unfavorite' : 'Favorite',
                onPress: () => handleToggleFavorite(exercise),
            },
            {
                text: 'Hide Exercise',
                onPress: async () => {
                    await toggleExerciseHidden(exercise.id);
                    loadExercises();
                },
            },
        ];

        // Add edit option for custom exercises
        if (exercise.isCustom) {
            buttons.push({
                text: 'Edit Exercise',
                onPress: () => {
                    setEditingExercise(exercise);
                    setShowAddExercise(true);
                },
            });
        }

        Alert.alert(exercise.name, 'Choose an action', buttons);
    };

    // Render exercise item
    const renderExerciseItem = ({ item }: { item: Exercise }) => {
        const primaryMuscle = item.muscleGroups.find(mg => mg.isPrimary)?.muscle ?? '';
        const formattedMuscle = primaryMuscle.replace('_', ' ');
        const equipment = item.equipment[0]?.replace('_', ' ') ?? '';
        const isHiddenView = activeFilter === 'hidden';

        return (
            <TouchableOpacity
                style={styles.exerciseItem}
                onPress={() => isHiddenView ? null : handleSelect(item)}
                onLongPress={() => handleLongPress(item)}
                disabled={isHiddenView}
            >
                <Image
                    source={item.imageUrl ? { uri: item.imageUrl } : EXERCISE_PLACEHOLDER}
                    style={styles.exerciseImage}
                    resizeMode="cover"
                />
                <View style={styles.exerciseInfo}>
                    <View style={styles.exerciseNameRow}>
                        <Text style={styles.exerciseName}>{item.name}</Text>
                        {item.isCustom && <Text style={styles.customBadge}>Custom</Text>}
                        {item.isHidden && <Text style={styles.hiddenBadge}>Hidden</Text>}
                    </View>
                    <Text style={styles.exerciseMeta}>
                        {formattedMuscle} • {equipment}
                    </Text>
                </View>
                {isHiddenView ? (
                    <TouchableOpacity
                        style={styles.unhideButton}
                        onPress={async () => {
                            await toggleExerciseHidden(item.id);
                            loadExercises();
                        }}
                    >
                        <Text style={styles.unhideButtonText}>Unhide</Text>
                    </TouchableOpacity>
                ) : (
                    <>
                        <TouchableOpacity
                            style={styles.starButton}
                            onPress={() => handleToggleFavorite(item)}
                        >
                            <Text style={[styles.starIcon, item.isFavorite && styles.starIconActive]}>
                                {item.isFavorite ? '★' : '☆'}
                            </Text>
                        </TouchableOpacity>
                        <Text style={styles.addIcon}>+</Text>
                    </>
                )}
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
                    <TouchableOpacity onPress={() => {
                        setEditingExercise(null);
                        setShowAddExercise(true);
                    }}>
                        <Text style={styles.createButton}>+ New</Text>
                    </TouchableOpacity>
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

                {/* Category tabs */}
                <View style={styles.categoryContainer}>
                    {CATEGORY_TABS.map(cat => (
                        <TouchableOpacity
                            key={cat.key}
                            style={[
                                styles.categoryTab,
                                activeCategory === cat.key && styles.categoryTabActive,
                            ]}
                            onPress={() => {
                                setActiveCategory(cat.key);
                                // Reset muscle filter when changing category
                                if (cat.key !== 'all' && cat.key !== 'strength') {
                                    setActiveFilter('all');
                                }
                            }}
                        >
                            <Text style={styles.categoryIcon}>{cat.icon}</Text>
                            <Text style={[
                                styles.categoryTabText,
                                activeCategory === cat.key && styles.categoryTabTextActive,
                            ]}>
                                {cat.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Filter tabs - only show muscle filters for strength */}
                {(activeCategory === 'all' || activeCategory === 'strength') && (
                    <View style={styles.filterContainer}>
                        <FlatList
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            data={[
                                { key: 'all', label: 'All' },
                                { key: 'favorites', label: '★ Favorites' },
                                { key: 'hidden', label: '👁 Hidden' },
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
                )}
                <FlatList
                    data={filteredExercises}
                    keyExtractor={(item) => item.id}
                    renderItem={renderExerciseItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No exercises found</Text>
                            <Text style={styles.emptySubtext}>
                                {activeFilter === 'favorites'
                                    ? 'Tap ★ to favorite exercises'
                                    : 'Try a different search or filter'}
                            </Text>
                            <TouchableOpacity
                                style={styles.createExerciseButton}
                                onPress={() => {
                                    setEditingExercise(null);
                                    setShowAddExercise(true);
                                }}
                            >
                                <Text style={styles.createExerciseButtonText}>+ Create Custom Exercise</Text>
                            </TouchableOpacity>
                        </View>
                    }
                    ListFooterComponent={
                        <Text style={styles.hint}>Long-press to hide or edit exercises</Text>
                    }
                />
            </SafeAreaView>

            {/* Add/Edit Exercise Modal */}
            <AddExerciseScreen
                visible={showAddExercise}
                onClose={() => {
                    setShowAddExercise(false);
                    setEditingExercise(null);
                }}
                onSave={() => {
                    loadExercises();
                }}
                editingExercise={editingExercise}
            />
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
        color: colors.text.secondary,
        fontSize: typography.size.md,
    },
    title: {
        color: colors.text.primary,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
    },
    createButton: {
        color: colors.accent.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
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

    // Category tabs
    categoryContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.separator,
    },
    categoryTab: {
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
    },
    categoryTabActive: {
        backgroundColor: colors.accent.primary + '20',
    },
    categoryIcon: {
        fontSize: 24,
        marginBottom: spacing.xs,
    },
    categoryTabText: {
        color: colors.text.secondary,
        fontSize: typography.size.xs,
        fontWeight: typography.weight.medium,
    },
    categoryTabTextActive: {
        color: colors.accent.primary,
        fontWeight: typography.weight.semibold,
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
        marginBottom: spacing.lg,
    },
    createExerciseButton: {
        backgroundColor: colors.accent.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
    },
    createExerciseButtonText: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
    },
    hint: {
        color: colors.text.disabled,
        fontSize: typography.size.xs,
        textAlign: 'center',
        marginTop: spacing.md,
        marginBottom: spacing.xl,
    },
    exerciseImage: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.sm,
        marginRight: spacing.md,
        backgroundColor: colors.background.tertiary,
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
