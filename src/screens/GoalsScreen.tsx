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
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { getExerciseById } from '../services/exerciseService';
import { getMeasurementTypes } from '../services/measurementService';
import type { Goal, GoalType } from '../models';
import type { MeasurementType } from '../models/measurement';
import SegmentedControl from '../components/measurements/SegmentedControl';
import GoalCard, { type GoalDisplayInfo } from '../components/goals/GoalCard';
import CompletedGoalCard from '../components/goals/CompletedGoalCard';
import GoalCreationModal from '../components/goals/GoalCreationModal';
import GoalDetailModal from '../components/goals/GoalDetailModal';

// ============================================================
// Types
// ============================================================

type TabId = 'active' | 'trophy';

const TABS: { id: TabId; label: string }[] = [
    { id: 'active', label: 'Active' },
    { id: 'trophy', label: 'Trophy Case' },
];

// Quick-add chip definitions (onPress wired in Phase 4)
const QUICK_ADD_CHIPS = [
    { label: 'Bench 135 lbs', emoji: '🏋️' },
    { label: 'Squat 1.5× BW', emoji: '🦵' },
    { label: 'Deadlift 2× BW', emoji: '💪' },
    { label: '30 Day Streak', emoji: '🔥' },
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
    // Display info resolution
    // --------------------------------------------------------

    const resolveDisplayInfoBatch = async (
        goals: Goal[],
    ): Promise<Map<string, GoalDisplayInfo>> => {
        const map = new Map<string, GoalDisplayInfo>();

        // Batch-fetch measurement types once
        let measurementTypes: MeasurementType[] = [];
        const hasMeasurementGoals = goals.some((g) => g.goalType === 'measurement');
        if (hasMeasurementGoals) {
            measurementTypes = await getMeasurementTypes();
        }

        // Resolve each goal's display info
        for (const goal of goals) {
            const info = await resolveGoalDisplayInfo(goal, measurementTypes);
            map.set(goal.id, info);
        }

        return map;
    };

    const resolveGoalDisplayInfo = async (
        goal: Goal,
        measurementTypes: MeasurementType[],
    ): Promise<GoalDisplayInfo> => {
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
            const exercise = await getExerciseById(goal.exerciseId);
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

    const renderActiveGoal = ({ item: goal }: { item: Goal }) => {
        const info = displayInfoMap.get(goal.id) ?? {
            name: 'Goal',
            metricLabel: '',
            unit: '',
        };

        return (
            <GoalCard
                goal={goal}
                displayInfo={info}
                onPress={() => setDetailGoal(goal)}
                onLongPress={() => handleLongPress(goal)}
            />
        );
    };

    const renderCompletedGoal = ({ item: goal }: { item: Goal }) => {
        const info = displayInfoMap.get(goal.id) ?? {
            name: 'Goal',
            metricLabel: '',
            unit: '',
        };

        return (
            <CompletedGoalCard
                goal={goal}
                displayInfo={info}
                onPress={() => setDetailGoal(goal)}
                onLongPress={() => handleLongPress(goal)}
            />
        );
    };

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🎯</Text>
            <Text style={styles.emptyTitle}>What are we aiming for?</Text>
            <Text style={styles.emptySubtitle}>
                Set a target and watch your progress
            </Text>

            {/* Quick-add chips */}
            <View style={styles.chipGrid}>
                {QUICK_ADD_CHIPS.map((chip) => (
                    <TouchableOpacity
                        key={chip.label}
                        style={styles.quickAddChip}
                        activeOpacity={0.7}
                        // onPress wired in Phase 4
                    >
                        <Text style={styles.chipEmoji}>{chip.emoji}</Text>
                        <Text style={styles.chipLabel}>{chip.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity
                style={styles.createCustomButton}
                activeOpacity={0.7}
                onPress={() => setShowCreation(true)}
            >
                <MaterialIcons name="add" size={18} color={colors.accent.primary} />
                <Text style={styles.createCustomText}>Create Custom Goal</Text>
            </TouchableOpacity>
        </View>
    );

    const renderTrophyEmpty = () => (
        <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🏆</Text>
            <Text style={styles.emptyTitle}>No trophies yet</Text>
            <Text style={styles.emptySubtitle}>
                Completed goals will appear here
            </Text>
        </View>
    );

    // --------------------------------------------------------
    // Context menu modal
    // --------------------------------------------------------

    const renderContextMenu = () => {
        if (!contextGoal) return null;
        const isActive = contextGoal.status === 'active';

        return (
            <Modal
                visible={contextVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setContextVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setContextVisible(false)}
                >
                    <View style={styles.contextMenu}>
                        {isActive && (
                            <TouchableOpacity
                                style={styles.contextMenuItem}
                                onPress={() => handleContextAction('complete')}
                            >
                                <MaterialIcons
                                    name="check-circle"
                                    size={20}
                                    color={colors.accent.success}
                                />
                                <Text style={styles.contextMenuText}>Mark Complete</Text>
                            </TouchableOpacity>
                        )}

                        {isActive && (
                            <TouchableOpacity
                                style={styles.contextMenuItem}
                                onPress={() => handleContextAction('abandon')}
                            >
                                <MaterialIcons
                                    name="pause-circle-filled"
                                    size={20}
                                    color={colors.accent.warning}
                                />
                                <Text style={styles.contextMenuText}>Abandon</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={[styles.contextMenuItem, styles.contextMenuItemLast]}
                            onPress={() => handleContextAction('delete')}
                        >
                            <MaterialIcons
                                name="delete"
                                size={20}
                                color={colors.accent.error}
                            />
                            <Text style={[styles.contextMenuText, { color: colors.accent.error }]}>
                                Delete
                            </Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        );
    };

    // --------------------------------------------------------
    // Main render
    // --------------------------------------------------------

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <SegmentedControl
                tabs={TABS}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />

            <View style={styles.tabContent}>
                {activeTab === 'active' && (
                    activeGoals.length === 0 && !isLoading ? (
                        renderEmptyState()
                    ) : (
                        <FlatList
                            data={activeGoals}
                            keyExtractor={(item) => item.id}
                            renderItem={renderActiveGoal}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                        />
                    )
                )}
                {activeTab === 'trophy' && (
                    completedGoals.length === 0 && !isLoading ? (
                        renderTrophyEmpty()
                    ) : (
                        <FlatList
                            data={completedGoals}
                            keyExtractor={(item) => item.id}
                            renderItem={renderCompletedGoal}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                        />
                    )
                )}
            </View>

            {/* Context menu modal */}
            {renderContextMenu()}

            {/* FAB — opens creation flow (Phase 4) */}
            <TouchableOpacity
                style={styles.fab}
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
                onClose={() => setShowCreation(false)}
                onCreated={loadGoals}
            />

            {/* Goal detail modal */}
            <GoalDetailModal
                visible={!!detailGoal}
                goal={detailGoal}
                displayInfo={detailGoal ? displayInfoMap.get(detailGoal.id) ?? { name: 'Goal', metricLabel: '', unit: '' } : null}
                onClose={() => setDetailGoal(null)}
            />
        </SafeAreaView>
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
        paddingBottom: 80, // Space for FAB
    },

    // Empty state
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

    // Quick-add chips
    chipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    quickAddChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.xl,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderWidth: 1,
        borderColor: colors.glass.border,
    },
    chipEmoji: {
        fontSize: 16,
        marginRight: spacing.xs,
    },
    chipLabel: {
        fontSize: typography.size.sm,
        color: colors.text.primary,
        fontWeight: typography.weight.medium,
    },

    // Create custom button
    createCustomButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    createCustomText: {
        fontSize: typography.size.md,
        color: colors.accent.primary,
        fontWeight: typography.weight.semibold,
        marginLeft: spacing.xs,
    },

    // Context menu modal
    modalOverlay: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contextMenu: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        width: 240,
        overflow: 'hidden',
    },
    contextMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    contextMenuItemLast: {
        borderBottomWidth: 0,
    },
    contextMenuText: {
        fontSize: typography.size.md,
        color: colors.text.primary,
        marginLeft: spacing.sm,
    },

    // FAB
    fab: {
        position: 'absolute',
        bottom: 24,
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
