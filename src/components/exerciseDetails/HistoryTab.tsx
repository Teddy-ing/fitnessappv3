/**
 * History Tab — Exercise Details
 *
 * Reverse-chronological feed of every session where this exercise
 * was performed. Supports incremental pagination (20 at a time).
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, spacing, borderRadius, typography } from '../../theme';
import { getExerciseSessionHistory } from '../../services/exerciseDetailsService';
import { ExerciseSession } from '../../models/exerciseDetails';
import { useWeightUnit } from '../../hooks/useWeightUnit';

const PAGE_SIZE = 20;

// ============================================================
// Sub-components
// ============================================================

const SessionCard = React.memo(function SessionCard({ session, weightUnit }: { session: ExerciseSession; weightUnit: string }) {
    const dateStr = new Date(session.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });

    return (
        <View style={styles.sessionCard}>
            {/* Header: date + workout name */}
            <View style={styles.sessionHeader}>
                <Text style={styles.sessionDate}>{dateStr}</Text>
                <Text style={styles.sessionWorkoutName} numberOfLines={1}>
                    {session.workoutName}
                </Text>
            </View>

            {/* Sets list */}
            <View style={styles.setsList}>
                {session.sets.map((set, idx) => {
                    const isWarmup = set.type === 'warmup';
                    const prefix = isWarmup ? 'W' : `${set.setNumber}`;
                    let detail = '';

                    if (set.weight != null && set.reps != null) {
                        detail = `${set.weight} ${weightUnit} × ${set.reps}`;
                    } else if (set.reps != null) {
                        detail = `${set.reps} reps`;
                    } else if (set.duration != null) {
                        const mins = Math.floor(set.duration / 60);
                        const secs = set.duration % 60;
                        detail = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
                    }

                    return (
                        <View key={idx} style={styles.setRow}>
                            <Text style={[styles.setNumber, isWarmup && styles.setWarmup]}>
                                {prefix}.
                            </Text>
                            <Text style={[styles.setDetail, isWarmup && styles.setWarmup]}>
                                {detail}
                            </Text>
                        </View>
                    );
                })}
            </View>

            {/* Volume summary */}
            {session.totalVolume > 0 && (
                <View style={styles.volumeRow}>
                    <Text style={styles.volumeLabel}>Volume</Text>
                    <Text style={styles.volumeValue}>
                        {session.totalVolume >= 1000
                            ? `${(session.totalVolume / 1000).toFixed(1)}k`
                            : Math.round(session.totalVolume)}{' '}
                        {weightUnit}
                    </Text>
                </View>
            )}
        </View>
    );
});

// ============================================================
// Main Tab Component
// ============================================================

interface HistoryTabProps {
    exerciseId: string;
}

export default function HistoryTab({ exerciseId }: HistoryTabProps) {
    const [sessions, setSessions] = useState<ExerciseSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const loadingMoreRef = useRef(false); // BH-038: synchronous guard against double-fetch
    const weightUnit = useWeightUnit();

    // Initial load
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setSessions([]);
        setHasMore(true);
        loadingMoreRef.current = false;

        getExerciseSessionHistory(exerciseId, PAGE_SIZE, 0).then((data) => {
            if (cancelled) return;
            setSessions(data);
            setHasMore(data.length === PAGE_SIZE);
            setLoading(false);
        });

        return () => { cancelled = true; };
    }, [exerciseId]);

    // Load more — BH-038: ref guard prevents double-fetch when onEndReached fires
    // twice before React state update propagates
    const handleLoadMore = useCallback(() => {
        if (loadingMoreRef.current || !hasMore) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);

        getExerciseSessionHistory(exerciseId, PAGE_SIZE, sessions.length).then((data) => {
            setSessions((prev) => [...prev, ...data]);
            setHasMore(data.length === PAGE_SIZE);
            setLoadingMore(false);
            loadingMoreRef.current = false;
        });
    }, [exerciseId, sessions.length, hasMore]);

    const renderItem = useCallback(
        ({ item }: { item: ExerciseSession }) => (
            <SessionCard session={item} weightUnit={weightUnit} />
        ),
        [weightUnit],
    );

    const keyExtractor = useCallback(
        (item: ExerciseSession) => item.workoutId,
        [],
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accent.primary} />
                <Text style={styles.loadingText}>Loading history...</Text>
            </View>
        );
    }

    if (sessions.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <MaterialIcons name="history" size={48} color={colors.text.disabled} />
                <Text style={styles.emptyTitle}>No History Yet</Text>
                <Text style={styles.emptySubtitle}>
                    Start a workout to track your progress with this exercise!
                </Text>
            </View>
        );
    }

    return (
        <FlatList
            data={sessions}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
                loadingMore ? (
                    <ActivityIndicator
                        size="small"
                        color={colors.accent.primary}
                        style={styles.footerLoader}
                    />
                ) : null
            }
        />
    );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
    listContent: {
        padding: spacing.md,
        paddingBottom: spacing.xxl,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    loadingText: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
        gap: spacing.sm,
    },
    emptyTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        color: colors.text.secondary,
        marginTop: spacing.sm,
    },
    emptySubtitle: {
        fontSize: typography.size.sm,
        color: colors.text.disabled,
        textAlign: 'center',
    },
    footerLoader: {
        paddingVertical: spacing.lg,
    },

    // Session card
    sessionCard: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    sessionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    sessionDate: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    sessionWorkoutName: {
        fontSize: typography.size.xs,
        color: colors.text.secondary,
        maxWidth: '50%',
        textAlign: 'right',
    },

    // Sets
    setsList: {
        gap: spacing.xs,
    },
    setRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    setNumber: {
        width: 24,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
    },
    setDetail: {
        fontSize: typography.size.sm,
        color: colors.text.primary,
    },
    setWarmup: {
        color: colors.text.disabled,
    },

    // Volume summary
    volumeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.sm,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.background.tertiary,
    },
    volumeLabel: {
        fontSize: typography.size.xs,
        color: colors.text.secondary,
    },
    volumeValue: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.accent.primary,
    },
});
