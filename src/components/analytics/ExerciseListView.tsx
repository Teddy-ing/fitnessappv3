/**
 * ExerciseListView
 *
 * Exercises tab content: 3-layer navigation architecture with
 * persistent search bar, horizontally scrolling filter pills,
 * and a virtualized FlatList of performed exercises.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    TextInput,
    FlatList,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, borderRadius, typography } from '../../theme';
import { PerformedExercise } from '../../models/analytics';
import { getPerformedExercises } from '../../services/analyticsService';
import type { ProfileStackParamList } from '../../navigation/AppNavigator';

// ============================================================
// Filter types and helpers
// ============================================================

/** Filter pill definition */
type ExerciseFilter = 'recent' | 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core';

const EXERCISE_FILTERS: { key: ExerciseFilter; label: string }[] = [
    { key: 'recent', label: 'Recent' },
    { key: 'chest', label: 'Chest' },
    { key: 'back', label: 'Back' },
    { key: 'legs', label: 'Legs' },
    { key: 'shoulders', label: 'Shoulders' },
    { key: 'arms', label: 'Arms' },
    { key: 'core', label: 'Core' },
];

/** Map composite filter pills to actual MuscleGroup values stored in DB */
function getMuscleGroupsForFilter(filter: ExerciseFilter): string[] | undefined {
    switch (filter) {
        case 'recent':
            return undefined;
        case 'chest':
            return ['chest'];
        case 'back':
            return ['back', 'lats', 'traps'];
        case 'legs':
            return ['quads', 'hamstrings', 'glutes', 'calves'];
        case 'shoulders':
            return ['shoulders'];
        case 'arms':
            return ['biceps', 'triceps', 'forearms'];
        case 'core':
            return ['core'];
    }
}

// ============================================================
// Component
// ============================================================

export default function ExerciseListView({ ListHeaderComponent }: { ListHeaderComponent?: React.ReactElement }) {
    const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
    const [exercises, setExercises] = useState<PerformedExercise[]>([]);
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState<ExerciseFilter>('recent');
    const [loading, setLoading] = useState(true);

    // Re-fetch when the filter pill changes
    useEffect(() => {
        let cancelled = false;
        setLoading(true);

        const muscleGroups = getMuscleGroupsForFilter(activeFilter);
        getPerformedExercises('ALL', muscleGroups).then((result) => {
            if (!cancelled) {
                setExercises(result);
                setLoading(false);
            }
        });

        return () => { cancelled = true; };
    }, [activeFilter]);

    // Client-side search within the fetched list
    const filtered = useMemo(() => {
        const list = search
            ? exercises.filter((e) =>
                e.exerciseName.toLowerCase().includes(search.toLowerCase()),
            )
            : exercises;

        // PP-011 fix: pre-compute formatted dates so toLocaleDateString
        // isn't called per row inside the render path
        return list.map((ex) => ({
            ...ex,
            _formattedDate: new Date(ex.lastPerformed).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
            }),
        }));
    }, [exercises, search]);

    const renderExerciseRow = useCallback(({ item: ex }: { item: PerformedExercise & { _formattedDate: string } }) => (
        <TouchableOpacity
            style={styles.exerciseRow}
            activeOpacity={0.6}
            onPress={() =>
                navigation.navigate('ExerciseAnalytics', {
                    exerciseId: ex.exerciseId,
                    exerciseName: ex.exerciseName,
                })
            }
        >
            <View style={styles.exerciseIcon}>
                <MaterialIcons
                    name="fitness-center"
                    size={18}
                    color={colors.accent.primary}
                />
            </View>
            <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{ex.exerciseName}</Text>
                <Text style={styles.exerciseMeta}>
                    {ex.totalSessions} session{ex.totalSessions !== 1 ? 's' : ''}
                    {' · Last: '}
                    {ex._formattedDate}
                </Text>
            </View>
            <MaterialIcons
                name="chevron-right"
                size={20}
                color={colors.text.disabled}
            />
        </TouchableOpacity>
    ), [navigation]);

    const keyExtractor = useCallback((item: PerformedExercise) => item.exerciseId, []);

    const emptyMessage = search
        ? 'No matching exercises'
        : activeFilter === 'recent'
            ? 'No exercises performed yet'
            : `No ${EXERCISE_FILTERS.find((f) => f.key === activeFilter)?.label ?? ''} exercises found`;

    // Search bar + filter pills become the FlatList header
    const listHeader = useMemo(() => (
        <>
            {ListHeaderComponent}

            {/* Layer 1: Search Bar */}
            <View style={styles.searchContainer}>
                <MaterialIcons
                    name="search"
                    size={20}
                    color={colors.text.disabled}
                    style={styles.searchIcon}
                />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search exercises..."
                    placeholderTextColor={colors.text.disabled}
                    value={search}
                    onChangeText={setSearch}
                />
            </View>

            {/* Layer 2: Filter Pills */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterPillRow}
            >
                {EXERCISE_FILTERS.map((f) => (
                    <TouchableOpacity
                        key={f.key}
                        style={[
                            styles.filterPill,
                            activeFilter === f.key && styles.filterPillActive,
                        ]}
                        onPress={() => setActiveFilter(f.key)}
                        activeOpacity={0.7}
                    >
                        <Text
                            style={[
                                styles.filterPillText,
                                activeFilter === f.key && styles.filterPillTextActive,
                            ]}
                        >
                            {f.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </>
    ), [ListHeaderComponent, search, activeFilter]);

    const emptyComponent = useMemo(() => (
        loading ? (
            <View style={styles.exerciseLoading}>
                <ActivityIndicator size="large" color={colors.accent.primary} />
            </View>
        ) : (
            <View style={styles.placeholderContainer}>
                <MaterialIcons name="fitness-center" size={48} color={colors.text.disabled} />
                <Text style={styles.placeholderText}>{emptyMessage}</Text>
            </View>
        )
    ), [loading, emptyMessage]);

    // PP-004 fix: FlatList virtualizes the exercise list so only
    // visible rows are rendered. Replaces the old .map() approach.
    return (
        <FlatList
            data={loading ? [] : filtered}
            renderItem={renderExerciseRow}
            keyExtractor={keyExtractor}
            ListHeaderComponent={listHeader}
            ListEmptyComponent={emptyComponent}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
        />
    );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
    scrollContent: {
        padding: spacing.md,
        paddingBottom: spacing.md,
    },

    // Search bar with icon
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.md,
        marginBottom: spacing.sm,
    },
    searchIcon: {
        marginRight: spacing.sm,
    },
    searchInput: {
        flex: 1,
        paddingVertical: spacing.sm + 2,
        fontSize: typography.size.sm,
        color: colors.text.primary,
    },

    // Filter pills
    filterPillRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
        marginBottom: spacing.sm,
    },
    filterPill: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        backgroundColor: colors.background.secondary,
    },
    filterPillActive: {
        backgroundColor: colors.accent.primary,
    },
    filterPillText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
    },
    filterPillTextActive: {
        color: colors.text.primary,
        fontWeight: typography.weight.semibold,
    },

    // Exercise list
    exerciseLoading: {
        paddingVertical: spacing.xxl * 2,
        alignItems: 'center',
    },
    exerciseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    exerciseIcon: {
        width: 36,
        height: 36,
        borderRadius: borderRadius.md,
        backgroundColor: colors.background.tertiary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    exerciseInfo: {
        flex: 1,
        gap: spacing.xs / 2,
    },
    exerciseName: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
    },
    exerciseMeta: {
        fontSize: typography.size.xs,
        color: colors.text.secondary,
    },

    // Placeholder
    placeholderContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxl * 2,
        gap: spacing.md,
    },
    placeholderText: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        marginTop: spacing.xs,
    },
});
