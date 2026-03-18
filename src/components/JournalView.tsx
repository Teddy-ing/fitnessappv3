/**
 * JournalView
 *
 * A searchable vertical timeline of workout notes.
 * Replaces the calendar grid when the Notes filter + Journal toggle are active.
 * Each entry shows date, workout name, duration, and all notes.
 */

import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../theme';
import { searchNotes, type JournalEntry } from '../services';

// ============================================================
// Helpers
// ============================================================

/** Format "2026-03-17" → "Mon, Mar 17, 2026" */
function formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

/** Format seconds → "47m" or "1h 05m" */
function formatDuration(seconds: number | null): string {
    if (!seconds || seconds <= 0) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
    return `${m}m`;
}

// ============================================================
// Sub-components
// ============================================================

function JournalCard({ entry }: { entry: JournalEntry }) {
    const duration = formatDuration(entry.duration);

    return (
        <View style={styles.card}>
            {/* Date header */}
            <Text style={styles.dateText}>{formatDate(entry.date)}</Text>

            {/* Workout header */}
            <View style={styles.workoutHeader}>
                <Text style={styles.workoutName} numberOfLines={1}>
                    {entry.workoutName}
                </Text>
                {duration ? (
                    <Text style={styles.durationText}>🕐 {duration}</Text>
                ) : null}
            </View>

            {/* Workout note */}
            {entry.workoutNote ? (
                <View style={styles.noteBlock}>
                    <MaterialIcons
                        name="edit-note"
                        size={14}
                        color={colors.accent.primary}
                    />
                    <Text style={styles.noteText}>{entry.workoutNote}</Text>
                </View>
            ) : null}

            {/* Exercise notes */}
            {entry.exerciseNotes.map((en, i) => (
                <View key={i} style={styles.exerciseNoteBlock}>
                    <Text style={styles.exerciseLabel}>{en.name}</Text>
                    <Text style={styles.exerciseNoteText}>{en.note}</Text>
                </View>
            ))}
        </View>
    );
}

// ============================================================
// Main Component
// ============================================================

export default function JournalView() {
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const loadEntries = useCallback(async (query?: string) => {
        setLoading(true);
        const data = await searchNotes(query);
        setEntries(data);
        setLoading(false);
    }, []);

    // Initial load
    useEffect(() => {
        loadEntries();
    }, [loadEntries]);

    // Debounced search
    const handleSearchChange = useCallback((text: string) => {
        setSearchQuery(text);

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            loadEntries(text || undefined);
        }, 300);
    }, [loadEntries]);

    const renderItem = useCallback(({ item }: { item: JournalEntry }) => (
        <JournalCard entry={item} />
    ), []);

    return (
        <View style={styles.container}>
            {/* Search bar */}
            <View style={styles.searchContainer}>
                <MaterialIcons
                    name="search"
                    size={18}
                    color={colors.text.disabled}
                    style={styles.searchIcon}
                />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search notes..."
                    placeholderTextColor={colors.text.disabled}
                    value={searchQuery}
                    onChangeText={handleSearchChange}
                    returnKeyType="search"
                    autoCorrect={false}
                />
                {searchQuery.length > 0 ? (
                    <MaterialIcons
                        name="close"
                        size={16}
                        color={colors.text.secondary}
                        onPress={() => {
                            setSearchQuery('');
                            loadEntries();
                        }}
                        style={styles.clearIcon}
                    />
                ) : null}
            </View>

            {/* Results */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.accent.primary} />
                </View>
            ) : entries.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <MaterialIcons
                        name="event-note"
                        size={48}
                        color={colors.text.disabled}
                    />
                    <Text style={styles.emptyTitle}>
                        {searchQuery ? 'No matching notes' : 'No notes yet'}
                    </Text>
                    <Text style={styles.emptySubtext}>
                        {searchQuery
                            ? 'Try a different search term'
                            : 'Add notes to your workouts and they\'ll appear here'}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={entries}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.workoutId}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        marginHorizontal: spacing.md,
        marginVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        height: 40,
    },
    searchIcon: {
        marginRight: spacing.xs,
    },
    searchInput: {
        flex: 1,
        fontSize: typography.size.sm,
        color: colors.text.primary,
        padding: 0,
    },
    clearIcon: {
        padding: spacing.xs,
    },
    listContent: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.xxl,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Empty state
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
    },
    emptyTitle: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
        color: colors.text.secondary,
        marginTop: spacing.md,
    },
    emptySubtext: {
        fontSize: typography.size.sm,
        color: colors.text.disabled,
        textAlign: 'center',
        marginTop: spacing.xs,
    },

    // Card
    card: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    dateText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: spacing.xs,
    },
    workoutHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    workoutName: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
        color: colors.accent.primary,
        flex: 1,
    },
    durationText: {
        fontSize: typography.size.xs,
        color: colors.text.secondary,
        marginLeft: spacing.sm,
    },

    // Note blocks
    noteBlock: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'rgba(168, 85, 247, 0.08)',
        borderRadius: borderRadius.md,
        padding: spacing.sm,
        marginBottom: spacing.xs,
        gap: spacing.xs,
    },
    noteText: {
        fontSize: typography.size.sm,
        color: colors.text.primary,
        flex: 1,
        lineHeight: 20,
    },
    exerciseNoteBlock: {
        paddingLeft: spacing.sm,
        paddingVertical: spacing.xs,
        borderLeftWidth: 2,
        borderLeftColor: colors.accent.primary,
        marginBottom: spacing.xs,
    },
    exerciseLabel: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.semibold,
        color: colors.text.secondary,
        marginBottom: 2,
    },
    exerciseNoteText: {
        fontSize: typography.size.sm,
        color: colors.text.primary,
        lineHeight: 18,
    },
});
