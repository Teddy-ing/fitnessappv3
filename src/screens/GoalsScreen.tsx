/**
 * Goals Screen
 *
 * Two-tab goals interface:
 * - Active: List of in-progress goals with progress bars
 * - Trophy Case: Completed goals log
 *
 * Entry point: Profile → Goals (stack navigation push)
 * Uses the same SegmentedControl component as Measurements.
 *
 * Sub-components:
 * - GoalCard — progress bar, deadline badge, title (src/components/goals/)
 * - CompletedGoalCard — gold accent 100% card (src/components/goals/)
 * - GoalContextMenu — long-press action sheet (src/components/goals/)
 * - GoalEmptyState — empty state + quick-add chips (src/components/goals/)
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    Text,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing, borderRadius, typography } from '../theme';
import {
    getActiveGoals,
    getCompletedGoals,
    deleteGoal,
    markGoalCompleted,
    abandonGoal,
} from '../services';
import { getExercises } from '../services/exerciseService';
import { getMeasurementTypes } from '../services/measurementService';
import type { Goal, GoalType } from '../models';
import type { MeasurementType } from '../models/measurement';
import type { Exercise } from '../models/exercise';
import SegmentedControl from '../components/measurements/SegmentedControl';
import GoalCard, { type GoalDisplayInfo } from '../components/goals/GoalCard';
import CompletedGoalCard from '../components/goals/CompletedGoalCard';
import GoalCreationModal from '../components/goals/GoalCreationModal';
import GoalDetailModal from '../components/goals/GoalDetailModal';
import GoalContextMenu from '../components/goals/GoalContextMenu';
import GoalEmptyState from '../components/goals/GoalEmptyState';
import type { PrefillParams } from '../hooks/useGoalCreation';

// ============================================================
// Types
// ============================================================

type TabId = 'active' | 'trophy';

const TABS: { id: TabId; label: string }[] = [
    { id: 'active', label: 'Active' },
    { id: 'trophy', label: 'Trophy Case' },
];

// Metric labels for exercise goal types
const METRIC_LABELS: Record<GoalType, string> = {
    exercise_1rm: '1RM',
    exercise_volume: 'Volume',
    exercise_reps: 'Reps',
    measurement: '',
    consistency: '',
};

// ============================================================
// Main Screen
// ============================================================

export default function GoalsScreen() {
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState<TabId>('active');
    const [activeGoals, setActiveGoals] = useState<Goal[]>([]);
    const [completedGoals, setCompletedGoals] = useState<Goal[]>([]);
    const [displayInfoMap, setDisplayInfoMap] = useState<Map<string, GoalDisplayInfo>>(new Map());
    const [isLoading, setIsLoading] = useState(true);

    // Context menu state
    const [contextGoal, setContextGoal] = useState<Goal | null>(null);
    const [contextVisible, setContextVisible] = useState(false);

    // Creation modal state
    const [showCreation, setShowCreation] = useState(false);
    const [prefillData, setPrefillData] = useState<PrefillParams | null>(null);

    // Detail modal state
    const [detailGoal, setDetailGoal] = useState<Goal | null>(null);

    useEffect(() => {
        loadGoals();
    }, []);

    const loadGoals = useCallback(async () => {
        setIsLoading(true);
        const [active, completed] = await Promise.all([
            getActiveGoals(),
            getCompletedGoals(),
        ]);

        // Resolve display names for all goals
        const allGoals = [...active, ...completed];
        const infoMap = await resolveDisplayInfoBatch(allGoals);

        setActiveGoals(active);
        setCompletedGoals(completed);
        setDisplayInfoMap(infoMap);
        setIsLoading(false);
    }, []);

    // --------------------------------------------------------
    // Display info resolution (PP-033 fix: batch via cached getExercises)
    // --------------------------------------------------------

    const resolveDisplayInfoBatch = async (
        goals: Goal[],
    ): Promise<Map<string, GoalDisplayInfo>> => {
        const map = new Map<string, GoalDisplayInfo>();

        // Batch-fetch measurement types + exercises once (PP-033)
        const hasMeasurementGoals = goals.some((g) => g.goalType === 'measurement');
        const hasExerciseGoals = goals.some((g) => !!g.exerciseId);

        const [measurementTypes, exercises] = await Promise.all([
            hasMeasurementGoals ? getMeasurementTypes() : Promise.resolve([]),
            hasExerciseGoals ? getExercises() : Promise.resolve([]),
        ]);

        // Build Map for O(1) lookups
        const exerciseMap = new Map<string, Exercise>();
        for (const ex of exercises) {
            exerciseMap.set(ex.id, ex);
        }

        // Resolve each goal's display info (no more per-goal DB calls)
        for (const goal of goals) {
            const info = resolveGoalDisplayInfo(goal, measurementTypes, exerciseMap);
            map.set(goal.id, info);
        }

        return map;
    };

    const resolveGoalDisplayInfo = (
        goal: Goal,
        measurementTypes: MeasurementType[],
        exerciseMap: Map<string, Exercise>,
    ): GoalDisplayInfo => {
        const metricLabel = METRIC_LABELS[goal.goalType];

        if (goal.goalType === 'consistency') {
            return { name: 'Consistency', metricLabel: '', unit: 'workouts' };
        }

        if (goal.goalType === 'measurement' && goal.measurementTypeId) {
            const mt = measurementTypes.find((t) => t.id === goal.measurementTypeId);
            return {
                name: mt?.name ?? 'Measurement',
                metricLabel: '',
                unit: mt?.unitImperial ?? '',
            };
        }

        if (goal.exerciseId) {
            const exercise = exerciseMap.get(goal.exerciseId);
            return {
                name: exercise?.name ?? 'Exercise',
                metricLabel,
                unit: goal.goalType === 'exercise_reps' ? 'reps' : 'lbs',
            };
        }

        return { name: 'Goal', metricLabel, unit: '' };
    };

    // --------------------------------------------------------
    // Context menu actions
    // --------------------------------------------------------

    const handleLongPress = (goal: Goal) => {
        setContextGoal(goal);
        setContextVisible(true);
    };

    const handleContextAction = async (action: 'complete' | 'delete' | 'abandon') => {
        if (!contextGoal) return;
        setContextVisible(false);

        switch (action) {
            case 'complete':
                Alert.alert(
                    'Mark Complete',
                    'Mark this goal as achieved?',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Complete',
                            onPress: async () => {
                                await markGoalCompleted(
                                    contextGoal.id,
                                    contextGoal.currentBest ?? contextGoal.targetValue,
                                );
                                loadGoals();
                            },
                        },
                    ],
                );
                break;

            case 'abandon':
                Alert.alert(
                    'Abandon Goal',
                    'This goal will be hidden. Are you sure?',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Abandon',
                            style: 'destructive',
                            onPress: async () => {
                                await abandonGoal(contextGoal.id);
                                loadGoals();
                            },
                        },
                    ],
                );
                break;

            case 'delete':
                Alert.alert(
                    'Delete Goal',
                    'This cannot be undone. Delete this goal?',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: async () => {
                                await deleteGoal(contextGoal.id);
                                loadGoals();
                            },
                        },
                    ],
                );
                break;
        }

        setContextGoal(null);
    };

    // --------------------------------------------------------
    // Render helpers
    // --------------------------------------------------------

    const defaultInfo: GoalDisplayInfo = { name: 'Goal', metricLabel: '', unit: '' };

    const renderActiveGoal = ({ item: goal }: { item: Goal }) => (
        <GoalCard
            goal={goal}
            displayInfo={displayInfoMap.get(goal.id) ?? defaultInfo}
            onPress={() => setDetailGoal(goal)}
            onLongPress={() => handleLongPress(goal)}
        />
    );

    const renderCompletedGoal = ({ item: goal }: { item: Goal }) => (
        <CompletedGoalCard
            goal={goal}
            displayInfo={displayInfoMap.get(goal.id) ?? defaultInfo}
            onPress={() => setDetailGoal(goal)}
            onLongPress={() => handleLongPress(goal)}
        />
    );

    const handleQuickAdd = (prefill: PrefillParams) => {
        setPrefillData(prefill);
        setShowCreation(true);
    };

    // --------------------------------------------------------
    // Main render
    // --------------------------------------------------------

    return (
        <View style={styles.container}>
            <SegmentedControl
                tabs={TABS}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />

            <View style={styles.tabContent}>
                {activeTab === 'active' && (
                    activeGoals.length === 0 && !isLoading ? (
                        <GoalEmptyState
                            onQuickAdd={handleQuickAdd}
                            onCreateCustom={() => setShowCreation(true)}
                        />
                    ) : (
                        <FlatList
                            data={activeGoals}
                            keyExtractor={(item) => item.id}
                            renderItem={renderActiveGoal}
                            contentContainerStyle={[styles.listContent, { paddingBottom: 80 + insets.bottom }]}
                            showsVerticalScrollIndicator={false}
                        />
                    )
                )}
                {activeTab === 'trophy' && (
                    completedGoals.length === 0 && !isLoading ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyEmoji}>🏆</Text>
                            <Text style={styles.emptyTitle}>No trophies yet</Text>
                            <Text style={styles.emptySubtitle}>
                                Completed goals will appear here
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={completedGoals}
                            keyExtractor={(item) => item.id}
                            renderItem={renderCompletedGoal}
                            contentContainerStyle={[styles.listContent, { paddingBottom: 80 + insets.bottom }]}
                            showsVerticalScrollIndicator={false}
                        />
                    )
                )}
            </View>

            {/* Context menu */}
            <GoalContextMenu
                visible={contextVisible}
                goal={contextGoal}
                onAction={handleContextAction}
                onClose={() => setContextVisible(false)}
            />

            {/* FAB — opens creation flow */}
            <TouchableOpacity
                style={[styles.fab, { bottom: 24 + insets.bottom }]}
                activeOpacity={0.85}
                onPress={() => setShowCreation(true)}
            >
                <LinearGradient
                    colors={colors.gradient.primary}
                    style={styles.fabGradient}
                >
                    <MaterialIcons name="add" size={28} color="#fff" />
                </LinearGradient>
            </TouchableOpacity>

            {/* Goal creation modal */}
            <GoalCreationModal
                visible={showCreation}
                onClose={() => {
                    setShowCreation(false);
                    setPrefillData(null);
                }}
                onCreated={loadGoals}
                prefillData={prefillData}
            />

            {/* Goal detail modal */}
            <GoalDetailModal
                visible={!!detailGoal}
                goal={detailGoal}
                displayInfo={detailGoal ? displayInfoMap.get(detailGoal.id) ?? defaultInfo : null}
                onClose={() => setDetailGoal(null)}
            />
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
    tabContent: {
        flex: 1,
    },
    listContent: {
        padding: spacing.md,
    },

    // Trophy empty state (kept inline — only 5 lines of JSX)
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    emptyEmoji: {
        fontSize: 48,
        marginBottom: spacing.md,
    },
    emptyTitle: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    emptySubtitle: {
        fontSize: typography.size.md,
        color: colors.text.secondary,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },

    // FAB
    fab: {
        position: 'absolute',
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        shadowColor: colors.accent.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    fabGradient: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
