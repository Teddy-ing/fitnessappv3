/**
 * GoalDetailModal
 *
 * Expanded detail view shown when tapping a GoalCard.
 * Displays full goal info: progress summary, deadline projection,
 * milestones, and dates. Presented as a page-sheet modal.
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing, borderRadius, typography } from '../../theme';
import type { Goal } from '../../models';
import type { GoalDisplayInfo } from './GoalCard';

// ============================================================
// Props
// ============================================================

interface GoalDetailModalProps {
    visible: boolean;
    goal: Goal | null;
    displayInfo: GoalDisplayInfo | null;
    onClose: () => void;
}

// ============================================================
// Helpers
// ============================================================

function getProgressPercent(goal: Goal): number {
    if (!goal.currentBest || !goal.targetValue) return 0;
    return Math.min(100, Math.round((goal.currentBest / goal.targetValue) * 100));
}

function formatDate(isoString: string): string {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function getDaysElapsed(goal: Goal): number {
    const now = new Date();
    const created = new Date(goal.createdAt);
    return Math.max(1, Math.ceil((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
}

function getDailyRate(goal: Goal): number {
    const daysElapsed = getDaysElapsed(goal);
    const progress = (goal.currentBest ?? 0) - (goal.startingValue ?? 0);
    return progress / daysElapsed;
}

function getProjectedDate(goal: Goal): string | null {
    if (!goal.targetValue || !goal.currentBest) return null;
    const remaining = goal.targetValue - goal.currentBest;
    if (remaining <= 0) return 'Already reached!';

    const dailyRate = getDailyRate(goal);
    if (dailyRate <= 0) return 'Insufficient data';

    const daysNeeded = Math.ceil(remaining / dailyRate);
    const projected = new Date();
    projected.setDate(projected.getDate() + daysNeeded);
    return projected.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });
}

function getGoalTypeLabel(goal: Goal): string {
    switch (goal.goalType) {
        case 'exercise_1rm': return 'Estimated 1RM';
        case 'exercise_volume': return 'Max Volume';
        case 'exercise_reps': return 'Max Reps';
        case 'measurement': return 'Measurement';
        case 'consistency': return 'Consistency';
        default: return 'Goal';
    }
}

// ============================================================
// Component
// ============================================================

export default function GoalDetailModal({
    visible,
    goal,
    displayInfo,
    onClose,
}: GoalDetailModalProps) {
    if (!goal || !displayInfo) return null;

    const percent = getProgressPercent(goal);
    const daysElapsed = getDaysElapsed(goal);
    const dailyRate = getDailyRate(goal);
    const projectedDate = getProjectedDate(goal);

    const isCompleted = goal.status === 'completed';

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={{ width: 24 }} />
                    <Text style={styles.headerTitle}>Goal Details</Text>
                    <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                        <MaterialIcons name="close" size={24} color={colors.text.secondary} />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
                    {/* Title section */}
                    <View style={styles.titleSection}>
                        <Text style={styles.goalName}>
                            {displayInfo.name}
                        </Text>
                        <Text style={styles.goalType}>
                            {getGoalTypeLabel(goal)}
                        </Text>
                        {goal.label && (
                            <Text style={styles.goalLabel}>"{goal.label}"</Text>
                        )}
                    </View>

                    {/* Big progress ring */}
                    <View style={styles.progressSection}>
                        <View style={styles.bigProgressCircle}>
                            <Text style={styles.bigPercent}>{percent}%</Text>
                            <Text style={styles.bigPercentLabel}>
                                {isCompleted ? 'Achieved' : 'Progress'}
                            </Text>
                        </View>
                    </View>

                    {/* Progress bar */}
                    <View style={styles.barSection}>
                        <View style={styles.barTrack}>
                            <LinearGradient
                                colors={isCompleted
                                    ? ['#f59e0b', '#eab308'] as const
                                    : colors.gradient.primary}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[styles.barFill, { width: `${Math.max(percent, 2)}%` }]}
                            />
                        </View>
                        <View style={styles.barLabels}>
                            <Text style={styles.barLabelText}>
                                {goal.startingValue ?? 0} {displayInfo.unit}
                            </Text>
                            <Text style={styles.barLabelText}>
                                {goal.targetValue} {displayInfo.unit}
                            </Text>
                        </View>
                    </View>

                    {/* Stats grid */}
                    <View style={styles.statsGrid}>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>
                                {goal.currentBest ?? 0}
                            </Text>
                            <Text style={styles.statLabel}>Current Best</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>
                                {goal.targetValue}
                            </Text>
                            <Text style={styles.statLabel}>Target</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>
                                {goal.startingValue ?? '—'}
                            </Text>
                            <Text style={styles.statLabel}>Starting</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>
                                {daysElapsed}d
                            </Text>
                            <Text style={styles.statLabel}>Days Active</Text>
                        </View>
                    </View>

                    {/* Projection / Timeline */}
                    <View style={styles.infoSection}>
                        <Text style={styles.sectionTitle}>Timeline</Text>

                        <InfoRow
                            label="Created"
                            value={formatDate(goal.createdAt)}
                        />

                        {goal.deadline && (
                            <InfoRow
                                label="Deadline"
                                value={formatDate(goal.deadline)}
                            />
                        )}

                        {isCompleted && goal.completedAt && (
                            <InfoRow
                                label="Achieved"
                                value={formatDate(goal.completedAt)}
                                highlight
                            />
                        )}

                        {!isCompleted && dailyRate > 0 && (
                            <InfoRow
                                label="Projected Completion"
                                value={projectedDate ?? '—'}
                            />
                        )}

                        {!isCompleted && dailyRate > 0 && (
                            <InfoRow
                                label="Daily Rate"
                                value={`+${dailyRate.toFixed(2)} ${displayInfo.unit}/day`}
                            />
                        )}
                    </View>

                    {/* Status */}
                    <View style={styles.infoSection}>
                        <Text style={styles.sectionTitle}>Status</Text>
                        <View style={[
                            styles.statusBadge,
                            isCompleted && styles.statusBadgeCompleted,
                            goal.status === 'abandoned' && styles.statusBadgeAbandoned,
                        ]}>
                            <Text style={[
                                styles.statusText,
                                isCompleted && styles.statusTextCompleted,
                                goal.status === 'abandoned' && styles.statusTextAbandoned,
                            ]}>
                                {goal.status === 'active' ? '🔥 Active' :
                                 goal.status === 'completed' ? '🏆 Completed' :
                                 '💤 Abandoned'}
                            </Text>
                        </View>
                    </View>

                    {/* Bottom padding */}
                    <View style={{ height: spacing.xl }} />
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
}

// ============================================================
// InfoRow sub-component
// ============================================================

function InfoRow({
    label,
    value,
    highlight,
}: {
    label: string;
    value: string;
    highlight?: boolean;
}) {
    return (
        <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={[styles.infoValue, highlight && styles.infoValueHighlight]}>
                {value}
            </Text>
        </View>
    );
}

// ============================================================
// Styles
// ============================================================

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
        borderBottomColor: colors.separator,
    },
    headerTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
    },
    body: {
        flex: 1,
        paddingHorizontal: spacing.lg,
    },

    // Title section
    titleSection: {
        alignItems: 'center',
        paddingTop: spacing.xl,
        marginBottom: spacing.lg,
    },
    goalName: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        textAlign: 'center',
        marginBottom: spacing.xs,
    },
    goalType: {
        fontSize: typography.size.md,
        color: colors.text.secondary,
        marginBottom: spacing.xs,
    },
    goalLabel: {
        fontSize: typography.size.md,
        color: colors.text.secondary,
        fontStyle: 'italic',
    },

    // Progress circle
    progressSection: {
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    bigProgressCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.background.secondary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: colors.accent.primary,
    },
    bigPercent: {
        fontSize: 32,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    bigPercentLabel: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
    },

    // Progress bar
    barSection: {
        marginBottom: spacing.lg,
    },
    barTrack: {
        height: 10,
        backgroundColor: colors.background.tertiary,
        borderRadius: 5,
        overflow: 'hidden',
        marginBottom: spacing.xs,
    },
    barFill: {
        height: '100%',
        borderRadius: 5,
    },
    barLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    barLabelText: {
        fontSize: typography.size.xs,
        color: colors.text.disabled,
    },

    // Stats grid
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    statCard: {
        flex: 1,
        minWidth: '40%',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: 'center',
    },
    statValue: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        marginBottom: 2,
    },
    statLabel: {
        fontSize: typography.size.xs,
        color: colors.text.secondary,
    },

    // Info sections
    infoSection: {
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.separator,
    },
    infoLabel: {
        fontSize: typography.size.md,
        color: colors.text.secondary,
    },
    infoValue: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
    },
    infoValueHighlight: {
        color: '#f59e0b',
        fontWeight: typography.weight.bold,
    },

    // Status badge
    statusBadge: {
        alignSelf: 'flex-start',
        backgroundColor: colors.accent.primary + '20',
        borderRadius: borderRadius.xl,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    statusBadgeCompleted: {
        backgroundColor: '#f59e0b20',
    },
    statusBadgeAbandoned: {
        backgroundColor: colors.text.secondary + '20',
    },
    statusText: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
        color: colors.accent.primary,
    },
    statusTextCompleted: {
        color: '#f59e0b',
    },
    statusTextAbandoned: {
        color: colors.text.secondary,
    },
});
