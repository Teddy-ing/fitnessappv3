/**
 * WorkoutHomeView
 * 
 * The home screen displayed when no workout is active.
 * Extracted from WorkoutScreen for maintainability.
 * 
 * Layout (matching mockup):
 * 1. Header with settings gear (non-functional)
 * 2. Weekly day tracker
 * 3. Current split card with START WORKOUT button
 * 4. Widgets section (Body Weight + Latest PR placeholders)
 * 5. Browse templates / Start empty workout links
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    RefreshControl,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, spacing, borderRadius, typography } from '../theme';
import { Template } from '../services';
import { Split } from '../models/split';
import WeeklyTracker from '../components/WeeklyTracker';

interface WorkoutHomeViewProps {
    // Data
    activeSplit: Split | null;
    currentTemplate: Template | null;
    currentTemplateIndex: number;
    templates: Template[];
    workoutDatesThisWeek: Date[];

    // Refresh
    refreshing: boolean;
    onRefresh: () => void;

    // Actions
    onStartWorkout: () => void;
    onStartFromTemplate: (template: Template) => void;
    onShowSplitsModal: () => void;
    onShowTemplatesModal: () => void;
    onShowTemplatePicker: () => void;

    // Modal components (rendered as children from parent)
    modals: React.ReactNode;
}

export default function WorkoutHomeView({
    activeSplit,
    currentTemplate,
    currentTemplateIndex,
    templates,
    workoutDatesThisWeek,
    refreshing,
    onRefresh,
    onStartWorkout,
    onStartFromTemplate,
    onShowSplitsModal,
    onShowTemplatesModal,
    onShowTemplatePicker,
    modals,
}: WorkoutHomeViewProps) {
    // Exercise count for current template
    const exerciseCount = currentTemplate?.exerciseCount ?? 0;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header with settings gear */}
            <View style={styles.header}>
                <View style={styles.headerSpacer} />
                <TouchableOpacity style={styles.settingsButton} activeOpacity={0.7}>
                    <MaterialIcons name="settings" size={24} color={colors.text.secondary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.text.secondary}
                    />
                }
            >
                {/* Weekly Day Tracker */}
                <WeeklyTracker
                    workoutDates={workoutDatesThisWeek}
                    splitSchedule={activeSplit?.schedule ?? []}
                    currentScheduleIndex={currentTemplateIndex}
                />

                {/* Current Split Card */}
                <View style={styles.splitCard}>
                    {/* Card Header */}
                    <View style={styles.splitCardHeader}>
                        <Text style={styles.splitCardLabel}>CURRENT SPLIT</Text>
                        {activeSplit && (
                            <View style={styles.dayBadge}>
                                <Text style={styles.dayBadgeText}>
                                    DAY {currentTemplateIndex + 1} OF {activeSplit.schedule.length}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Split Name */}
                    <TouchableOpacity
                        onPress={onShowSplitsModal}
                        activeOpacity={0.7}
                        style={styles.splitNameRow}
                    >
                        <Text style={styles.splitName}>
                            {activeSplit?.name ?? 'No split selected'}
                        </Text>
                        <MaterialIcons name="chevron-right" size={28} color={colors.text.secondary} />
                    </TouchableOpacity>

                    {/* Up Next */}
                    {currentTemplate ? (
                        <View style={styles.upNextRow}>
                            <Text style={styles.upNextLabel}>Up next: </Text>
                            <Text style={styles.upNextName}>{currentTemplate.name}</Text>
                            {activeSplit && activeSplit.schedule.length > 1 && (
                                <TouchableOpacity
                                    onPress={onShowTemplatePicker}
                                    style={styles.swapButton}
                                    activeOpacity={0.7}
                                >
                                    <MaterialIcons name="swap-horiz" size={20} color={colors.text.primary} />
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : activeSplit && activeSplit.schedule[currentTemplateIndex]?.type === 'rest' ? (
                        <View style={styles.upNextRow}>
                            <MaterialIcons name="hotel" size={18} color={colors.text.secondary} />
                            <Text style={[styles.upNextLabel, { marginLeft: spacing.xs }]}>Rest Day</Text>
                            {activeSplit.schedule.length > 1 && (
                                <TouchableOpacity
                                    onPress={onShowTemplatePicker}
                                    style={styles.swapButton}
                                    activeOpacity={0.7}
                                >
                                    <MaterialIcons name="swap-horiz" size={20} color={colors.text.primary} />
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (
                        <View style={styles.upNextRow}>
                            <Text style={styles.upNextLabel}>
                                {activeSplit ? 'No templates in split' : 'Select a split to get started'}
                            </Text>
                        </View>
                    )}

                    {/* Exercise count + estimated time */}
                    {currentTemplate && (
                        <View style={styles.metaRow}>
                            <View style={styles.metaItem}>
                                <MaterialIcons name="fitness-center" size={14} color={colors.text.secondary} />
                                <Text style={styles.metaText}>{exerciseCount} Exercises</Text>
                            </View>
                            <View style={styles.metaItem}>
                                <MaterialIcons name="schedule" size={14} color={colors.text.secondary} />
                                <Text style={styles.metaText}>~45m est</Text>
                            </View>
                        </View>
                    )}

                    {/* START WORKOUT Button */}
                    <TouchableOpacity
                        onPress={() => {
                            if (currentTemplate) {
                                onStartFromTemplate(currentTemplate);
                            } else {
                                onStartWorkout();
                            }
                        }}
                        activeOpacity={0.9}
                        style={styles.startButtonContainer}
                    >
                        <LinearGradient
                            colors={colors.gradient.primary}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.startButton}
                        >
                            <Text style={styles.startButtonText}>START WORKOUT</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Widgets Section */}
                <View style={styles.widgetsSection}>
                    <View style={styles.widgetsSectionHeader}>
                        <Text style={styles.widgetsSectionTitle}>Widgets</Text>
                        <TouchableOpacity activeOpacity={0.7}>
                            <MaterialIcons name="edit" size={20} color={colors.accent.primary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.widgetsRow}>
                        {/* Body Weight Placeholder */}
                        <View style={[styles.widgetCard, styles.widgetCardLeft]}>
                            <View style={styles.widgetCardHeader}>
                                <MaterialIcons name="monitor-weight" size={14} color={colors.text.secondary} />
                                <Text style={styles.widgetCardLabel}>BODY WEIGHT</Text>
                            </View>
                            <Text style={styles.widgetCardValue}>--</Text>
                            <Text style={styles.widgetCardUnit}>lbs</Text>
                        </View>

                        {/* Latest PR Placeholder */}
                        <View style={[styles.widgetCard, styles.widgetCardRight]}>
                            <View style={styles.widgetCardHeader}>
                                <MaterialIcons name="emoji-events" size={14} color={colors.text.secondary} />
                                <Text style={styles.widgetCardLabel}>LATEST PR</Text>
                            </View>
                            <Text style={styles.widgetCardValue}>--</Text>
                            <Text style={styles.widgetCardUnit}>lb</Text>
                        </View>
                    </View>
                </View>

                {/* Footer Links */}
                <View style={styles.footerLinks}>
                    <TouchableOpacity
                        onPress={onShowTemplatesModal}
                        activeOpacity={0.7}
                        style={styles.footerLink}
                    >
                        <Text style={styles.footerLinkText}>Browse all templates →</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={onStartWorkout}
                        activeOpacity={0.7}
                        style={styles.footerLink}
                    >
                        <Text style={styles.footerLinkTextMuted}>Start an empty workout</Text>
                    </TouchableOpacity>
                </View>

                {/* Bottom spacer for tab bar */}
                <View style={{ height: spacing.xxl }} />
            </ScrollView>

            {/* Modals rendered from parent */}
            {modals}
        </SafeAreaView>
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
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    headerSpacer: {
        flex: 1,
    },
    settingsButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Scroll
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: spacing.md,
    },

    // Split Card
    splitCard: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        marginTop: spacing.md,
        borderWidth: 1,
        borderColor: colors.glass.borderLight,
    },
    splitCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    splitCardLabel: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.bold,
        color: colors.accent.primary,
        letterSpacing: 1,
    },
    dayBadge: {
        backgroundColor: colors.background.tertiary,
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
    },
    dayBadgeText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.semibold,
        color: colors.text.secondary,
        letterSpacing: 0.5,
    },
    splitNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    splitName: {
        fontSize: typography.size.xxl + 2,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        flex: 1,
    },
    upNextRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    upNextLabel: {
        fontSize: typography.size.md,
        color: colors.text.secondary,
    },
    upNextName: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    swapButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.background.tertiary,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: spacing.sm,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: spacing.lg,
    },
    metaText: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        marginLeft: spacing.xs,
    },

    // START WORKOUT button
    startButtonContainer: {
        borderRadius: borderRadius['2xl'],
        overflow: 'hidden',
        shadowColor: colors.accent.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    startButton: {
        paddingVertical: spacing.md + 2,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: borderRadius['2xl'],
    },
    startButtonText: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.bold,
        letterSpacing: 1.5,
    },

    // Widgets Section
    widgetsSection: {
        marginTop: spacing.xl,
    },
    widgetsSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    widgetsSectionTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    widgetsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    widgetCard: {
        flex: 1,
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.glass.borderLight,
    },
    widgetCardLeft: {
        marginRight: spacing.sm,
    },
    widgetCardRight: {
        marginLeft: spacing.sm,
    },
    widgetCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    widgetCardLabel: {
        fontSize: 10,
        fontWeight: typography.weight.bold,
        color: colors.text.secondary,
        letterSpacing: 0.5,
        marginLeft: spacing.xs,
    },
    widgetCardValue: {
        fontSize: typography.size.xxxl,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    widgetCardUnit: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
    },

    // Footer Links
    footerLinks: {
        alignItems: 'center',
        marginTop: spacing.xl,
    },
    footerLink: {
        paddingVertical: spacing.sm,
    },
    footerLinkText: {
        fontSize: typography.size.md,
        color: colors.text.secondary,
    },
    footerLinkTextMuted: {
        fontSize: typography.size.sm,
        color: colors.text.disabled,
    },
});
