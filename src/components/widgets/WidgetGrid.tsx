/**
 * WidgetGrid
 *
 * Orchestrator component that renders an array of WidgetConfig into a
 * flexbox grid layout. Handles data fetching, layout logic, and routing
 * each widget type to its concrete component.
 *
 * Grid rules (from PRD):
 * - Two squares → side-by-side in one row
 * - One rectangle → full-width row
 * - Orphan square → left-aligned, half-width (no stretching)
 * - Any combination must produce a clean layout
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography, borderRadius } from '../../theme';
import { WidgetConfig } from '../../models/widget';
import { ProfileStackParamList } from '../../navigation/AppNavigator';
import {
    getWorkoutStreak,
    getAggregatedMetric,
    getSparklineData,
} from '../../services';

import WidgetCard from './WidgetCard';
import StreakBadgeWidget from './StreakBadgeWidget';
import WeeklyWrapUpWidget, { WeeklyData } from './WeeklyWrapUpWidget';
import BodyweightSparklineWidget, { SparklinePoint } from './BodyweightSparklineWidget';

// ============================================================
// Types
// ============================================================

interface WidgetGridProps {
    widgets: WidgetConfig[];
    onEditPress: () => void;
}

interface WidgetData {
    streak: number;
    weeklyData: WeeklyData;
    bodyweightData: SparklinePoint[];
}

// ============================================================
// Data fetching
// ============================================================

async function fetchWidgetData(): Promise<WidgetData> {
    // Fetch all widget data in parallel for speed
    const [streak, volumeData, setsData, repsData, durationData, bodyweightData] =
        await Promise.all([
            getWorkoutStreak(),
            getAggregatedMetric('volume', 'per_week', '1M'),
            getAggregatedMetric('sets', 'per_week', '1M'),
            getAggregatedMetric('reps', 'per_week', '1M'),
            getAggregatedMetric('duration', 'per_week', '1M'),
            getSparklineData('bodyweight', 30),
        ]);

    // Weekly data: take the last (current) data point from each metric
    const lastVolume = volumeData.length > 0 ? volumeData[volumeData.length - 1].value : 0;
    const lastSets = setsData.length > 0 ? setsData[setsData.length - 1].value : 0;
    const lastReps = repsData.length > 0 ? repsData[repsData.length - 1].value : 0;
    const lastDuration = durationData.length > 0 ? durationData[durationData.length - 1].value : 0;

    return {
        streak,
        weeklyData: {
            volume: lastVolume,
            sets: lastSets,
            reps: lastReps,
            duration: lastDuration,
        },
        bodyweightData,
    };
}

// ============================================================
// Component
// ============================================================

export default function WidgetGrid({ widgets, onEditPress }: WidgetGridProps) {
    const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
    const [data, setData] = useState<WidgetData>({
        streak: 0,
        weeklyData: { volume: 0, sets: 0, reps: 0, duration: 0 },
        bodyweightData: [],
    });
    const [isLoading, setIsLoading] = useState(true);

    const loadData = useCallback(async () => {
        try {
            const result = await fetchWidgetData();
            setData(result);
        } catch (error) {
            console.error('[WidgetGrid] Failed to fetch widget data:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Build rows from widget configs
    const rows = useMemo(() => {
        const result: WidgetConfig[][] = [];
        let pendingSquare: WidgetConfig | null = null;

        for (const widget of widgets) {
            if (widget.size === 'rectangle') {
                // Flush pending square as its own row first
                if (pendingSquare) {
                    result.push([pendingSquare]);
                    pendingSquare = null;
                }
                result.push([widget]);
            } else {
                // Square
                if (pendingSquare) {
                    result.push([pendingSquare, widget]);
                    pendingSquare = null;
                } else {
                    pendingSquare = widget;
                }
            }
        }

        // Flush any remaining orphan square
        if (pendingSquare) {
            result.push([pendingSquare]);
        }

        return result;
    }, [widgets]);

    // Render individual widget content
    const renderWidgetContent = useCallback(
        (config: WidgetConfig) => {
            switch (config.type) {
                case 'streak_badge':
                    return <StreakBadgeWidget streak={data.streak} />;
                case 'weekly_wrapup':
                    return <WeeklyWrapUpWidget data={data.weeklyData} />;
                case 'bodyweight_sparkline':
                    return <BodyweightSparklineWidget data={data.bodyweightData} />;
                default:
                    return (
                        <View style={styles.comingSoon}>
                            <Text style={styles.comingSoonText}>Coming Soon</Text>
                        </View>
                    );
            }
        },
        [data],
    );

    // Get tap handler for a widget type
    const getWidgetPressHandler = useCallback(
        (type: string) => {
            switch (type) {
                case 'streak_badge':
                    return () => navigation.navigate('Calendar');
                case 'weekly_wrapup':
                    return () => navigation.navigate('Analytics');
                case 'bodyweight_sparkline':
                    return () => navigation.navigate('Measurements');
                case 'goal_progress':
                    return () => navigation.navigate('Goals');
                default:
                    return undefined;
            }
        },
        [navigation],
    );

    if (widgets.length === 0) {
        return (
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>WIDGETS</Text>
                    <TouchableOpacity onPress={onEditPress} activeOpacity={0.7}>
                        <MaterialIcons name="add" size={20} color={colors.accent.primary} />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity
                    style={styles.emptyState}
                    onPress={onEditPress}
                    activeOpacity={0.7}
                >
                    <MaterialIcons name="widgets" size={32} color={colors.text.disabled} />
                    <Text style={styles.emptyTitle}>Add your first widget</Text>
                    <Text style={styles.emptySubtitle}>
                        Track streaks, weekly stats, and body trends at a glance
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>WIDGETS</Text>
                <TouchableOpacity onPress={onEditPress} activeOpacity={0.7} style={styles.editButton}>
                    <MaterialIcons name="edit" size={16} color={colors.text.secondary} />
                </TouchableOpacity>
            </View>

            {rows.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.row}>
                    {row.map((widget) => (
                        <WidgetCard
                            key={widget.id}
                            size={widget.size}
                            onPress={getWidgetPressHandler(widget.type)}
                            style={
                                widget.size === 'square'
                                    ? row.length === 2
                                        ? styles.squareInPair
                                        : styles.squareAlone
                                    : undefined
                            }
                        >
                            {renderWidgetContent(widget)}
                        </WidgetCard>
                    ))}
                </View>
            ))}
        </View>
    );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
    section: {
        marginBottom: spacing.md,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
        marginLeft: spacing.xs,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: typography.weight.bold,
        color: colors.text.secondary,
        letterSpacing: 1,
    },
    editButton: {
        padding: spacing.xs,
    },
    row: {
        flexDirection: 'row',
        marginBottom: spacing.sm,
    },
    squareInPair: {
        flex: 1,
        marginHorizontal: spacing.xs,
    },
    squareAlone: {
        width: '48%',
        marginHorizontal: spacing.xs,
    },
    // Empty state
    emptyState: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.glass.borderLight,
        borderStyle: 'dashed',
        padding: spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyTitle: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
        color: colors.text.secondary,
        marginTop: spacing.sm,
    },
    emptySubtitle: {
        fontSize: typography.size.xs,
        color: colors.text.disabled,
        marginTop: spacing.xs,
        textAlign: 'center',
    },
    // Coming soon placeholder
    comingSoon: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    comingSoonText: {
        fontSize: typography.size.sm,
        color: colors.text.disabled,
    },
});
