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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Exercise, MuscleGroup, ExerciseCategory } from '../models/exercise';
import { INDIVIDUAL_MUSCLE_FILTERS } from '../models/muscleGroups';
import { getExercises, toggleExerciseFavorite, toggleExerciseHidden } from '../services';
import { colors, spacing, borderRadius, typography } from '../theme';
import AddExerciseScreen from '../screens/AddExerciseScreen';
import ExercisePickerItem from './ExercisePickerItem';

interface ExercisePickerProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (exercise: Exercise) => void;
}

// Filter tabs
type FilterTab = 'all' | 'favorites' | 'hidden' | MuscleGroup;
type CategoryTab = 'all' | ExerciseCategory;

// Track if user has hidden an exercise during this session
let hasShownHideNotice = false;



const CATEGORY_TABS: { key: CategoryTab; label: string; icon: string }[] = [
    { key: 'all', label: 'All', icon: '🏋️' },
    { key: 'strength', label: 'Strength', icon: '💪' },
    { key: 'cardio', label: 'Cardio', icon: '❤️' },
    { key: 'stretch', label: 'Stretch', icon: '🧘' },
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

        // Sort favorites to top
        result = [...result].sort((a, b) => {
            if (a.isFavorite && !b.isFavorite) return -1;
            if (!a.isFavorite && b.isFavorite) return 1;
            return a.name.localeCompare(b.name);
        });

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

                    // Show notice first time only (per session)
                    if (!hasShownHideNotice) {
                        hasShownHideNotice = true;
                        Alert.alert(
                            'Exercise Hidden',
                            `"${exercise.name}" is now hidden. You can find hidden exercises by scrolling to the end of the filter tabs and tapping "👁 Hidden".`
                        );
                    }
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

    // Handle unhide (from hidden tab)
    const handleUnhide = useCallback(async (exercise: Exercise) => {
        await toggleExerciseHidden(exercise.id);
        loadExercises();
    }, [loadExercises]);

    // Render exercise item
    const renderExerciseItem = useCallback(({ item }: { item: Exercise }) => (
        <ExercisePickerItem
            exercise={item}
            isHiddenView={activeFilter === 'hidden'}
            onSelect={handleSelect}
            onToggleFavorite={handleToggleFavorite}
            onLongPress={handleLongPress}
            onUnhide={handleUnhide}
        />
    ), [activeFilter, handleSelect, handleToggleFavorite, handleLongPress, handleUnhide]);

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
                                ...INDIVIDUAL_MUSCLE_FILTERS,
                                { key: 'hidden', label: '👁 Hidden' },
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
        marginBottom: spacing.sm,
    },
    categoryTab: {
        alignItems: 'center',
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: borderRadius.md,
    },
    categoryTabActive: {
        backgroundColor: colors.accent.primary + '20',
    },
    categoryIcon: {
        fontSize: 18,
        marginBottom: 2,
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

    hint: {
        color: colors.text.disabled,
        fontSize: typography.size.xs,
        textAlign: 'center',
        marginTop: spacing.md,
        marginBottom: spacing.xl,
    },

    // Exercise list & empty state (referenced by FlatList in render)
    listContent: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
        paddingHorizontal: spacing.lg,
    },
    emptyText: {
        color: colors.text.secondary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
        marginBottom: spacing.sm,
    },
    emptySubtext: {
        color: colors.text.disabled,
        fontSize: typography.size.sm,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    createExerciseButton: {
        backgroundColor: colors.accent.primary + '20',
        borderRadius: borderRadius.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderWidth: 1,
        borderColor: colors.accent.primary + '40',
        borderStyle: 'dashed',
    },
    createExerciseButtonText: {
        color: colors.accent.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
    },
});
