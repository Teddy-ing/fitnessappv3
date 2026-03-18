/**
 * CalendarHeader
 *
 * Streak/rest badges, heatmap metric pills, start-day toggle,
 * and filter toggles (PRs, Notes, Fatigue, Journal).
 *
 * Extracted from CalendarScreen.tsx to satisfy the 600-line guardrail.
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { METRIC_OPTIONS, START_DAY_OPTIONS } from './types';

// ============================================================
// Props
// ============================================================

interface CalendarHeaderProps {
    streak: number;
    restDays: number;
    heatmapMetric: string;
    startDay: string;
    showPRFilter: boolean;
    showNoteFilter: boolean;
    showFatigueFilter: boolean;
    showJournalView: boolean;
    onMetricChange: (metric: string) => void;
    onStartDayChange: (day: string) => void;
    onPRFilterToggle: () => void;
    onNoteFilterToggle: () => void;
    onFatigueFilterToggle: () => void;
    onJournalViewToggle: () => void;
}

// ============================================================
// Component
// ============================================================

export default function CalendarHeader({
    streak,
    restDays,
    heatmapMetric,
    startDay,
    showPRFilter,
    showNoteFilter,
    showFatigueFilter,
    showJournalView,
    onMetricChange,
    onStartDayChange,
    onPRFilterToggle,
    onNoteFilterToggle,
    onFatigueFilterToggle,
    onJournalViewToggle,
}: CalendarHeaderProps) {
    return (
        <View style={styles.headerContainer}>
            {/* Streak and rest day badges */}
            <View style={styles.headerBadges}>
                {streak > 0 && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                            🔥 {streak} Week Streak
                        </Text>
                    </View>
                )}
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                        🛌 {restDays} Rest Day{restDays !== 1 ? 's' : ''}
                    </Text>
                </View>
            </View>

            {/* Metric toggle pills + start day toggle */}
            <View style={styles.controlsRow}>
                {/* Metric pills */}
                <View style={styles.pillRow}>
                    {METRIC_OPTIONS.map((opt) => (
                        <TouchableOpacity
                            key={opt.key}
                            style={[
                                styles.pill,
                                heatmapMetric === opt.key && styles.pillActive,
                            ]}
                            onPress={() => onMetricChange(opt.key)}
                            activeOpacity={0.7}
                        >
                            <Text
                                style={[
                                    styles.pillText,
                                    heatmapMetric === opt.key && styles.pillTextActive,
                                ]}
                            >
                                {opt.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Start day toggle */}
                <View style={styles.startDayToggle}>
                    {START_DAY_OPTIONS.map((opt) => (
                        <TouchableOpacity
                            key={opt.key}
                            style={[
                                styles.startDayPill,
                                startDay === opt.key && styles.startDayPillActive,
                            ]}
                            onPress={() => onStartDayChange(opt.key)}
                            activeOpacity={0.7}
                        >
                            <Text
                                style={[
                                    styles.startDayText,
                                    startDay === opt.key && styles.startDayTextActive,
                                ]}
                            >
                                {opt.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Filter toggles row */}
            <View style={styles.filterRow}>
                <TouchableOpacity
                    style={[
                        styles.filterPill,
                        showPRFilter && styles.filterPillActive,
                    ]}
                    onPress={onPRFilterToggle}
                    activeOpacity={0.7}
                >
                    <Text
                        style={[
                            styles.filterPillText,
                            showPRFilter && styles.filterPillTextActive,
                        ]}
                    >
                        🏆 PRs
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.filterPill,
                        showNoteFilter && styles.filterPillActive,
                    ]}
                    onPress={onNoteFilterToggle}
                    activeOpacity={0.7}
                >
                    <Text
                        style={[
                            styles.filterPillText,
                            showNoteFilter && styles.filterPillTextActive,
                        ]}
                    >
                        📝 Notes
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.filterPill,
                        showFatigueFilter && styles.filterPillActive,
                    ]}
                    onPress={onFatigueFilterToggle}
                    activeOpacity={0.7}
                >
                    <Text
                        style={[
                            styles.filterPillText,
                            showFatigueFilter && styles.filterPillTextActive,
                        ]}
                    >
                        ⚡ Fatigue
                    </Text>
                </TouchableOpacity>

                {/* Journal toggle — only visible when Notes is active */}
                {showNoteFilter && (
                    <TouchableOpacity
                        style={[
                            styles.filterPill,
                            showJournalView && styles.journalPillActive,
                        ]}
                        onPress={onJournalViewToggle}
                        activeOpacity={0.7}
                    >
                        <Text
                            style={[
                                styles.filterPillText,
                                showJournalView && styles.journalPillTextActive,
                            ]}
                        >
                            📖 Journal
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
    headerContainer: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerBadges: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    badge: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
    },
    badgeText: {
        color: colors.text.primary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
    },

    // Controls row (metric pills + start day toggle)
    controlsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.sm,
    },
    pillRow: {
        flexDirection: 'row',
        gap: spacing.xs,
    },
    pill: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
        borderRadius: borderRadius.full,
        backgroundColor: colors.background.secondary,
    },
    pillActive: {
        backgroundColor: colors.accent.primary,
    },
    pillText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
    },
    pillTextActive: {
        color: '#ffffff',
        fontWeight: typography.weight.semibold,
    },
    startDayToggle: {
        flexDirection: 'row',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.full,
        padding: 2,
    },
    startDayPill: {
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
    },
    startDayPillActive: {
        backgroundColor: colors.background.tertiary,
    },
    startDayText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.medium,
        color: colors.text.disabled,
    },
    startDayTextActive: {
        color: colors.text.primary,
    },

    // Filter pills
    filterRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
    filterPill: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
        borderRadius: borderRadius.full,
        backgroundColor: colors.background.secondary,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    filterPillActive: {
        borderColor: colors.accent.primary,
        backgroundColor: 'rgba(168, 85, 247, 0.15)',
    },
    filterPillText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
    },
    filterPillTextActive: {
        color: colors.accent.tertiary,
        fontWeight: typography.weight.semibold,
    },

    // Journal pill (distinct teal color when active)
    journalPillActive: {
        borderColor: '#14B8A6',
        backgroundColor: 'rgba(20, 184, 166, 0.15)',
    },
    journalPillTextActive: {
        color: '#5EEAD4',
        fontWeight: typography.weight.semibold,
    },
});
