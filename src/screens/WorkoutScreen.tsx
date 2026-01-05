/**
 * Workout Screen
 * 
 * The main/primary screen of the app.
 * This is where users log their workouts.
 * 
 * Design inspired by:
 * - Hevy's card-based layout for exercises
 * - Strong's "checkmark flow" for quick set completion
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, borderRadius, typography } from '../theme';

export default function WorkoutScreen() {
    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Empty state - shown when no workout is active */}
                <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>💪</Text>
                    <Text style={styles.emptyTitle}>Ready to workout?</Text>
                    <Text style={styles.emptySubtitle}>
                        Start a new workout or choose from your templates
                    </Text>
                </View>

                {/* Quick actions */}
                <View style={styles.quickActions}>
                    <TouchableOpacity style={styles.primaryButton}>
                        <Text style={styles.primaryButtonText}>Start Empty Workout</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.secondaryButton}>
                        <Text style={styles.secondaryButtonText}>Choose Template</Text>
                    </TouchableOpacity>
                </View>

                {/* Recent workouts preview */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Recent Workouts</Text>
                    <View style={styles.placeholder}>
                        <Text style={styles.placeholderText}>No recent workouts yet</Text>
                    </View>
                </View>

                {/* Templates preview */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Your Templates</Text>
                    <View style={styles.placeholder}>
                        <Text style={styles.placeholderText}>No templates yet</Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.primary,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.md,
        paddingBottom: spacing.xxl,
    },

    // Empty state
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: spacing.md,
    },
    emptyTitle: {
        fontSize: typography.size.xxl,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    emptySubtitle: {
        fontSize: typography.size.md,
        color: colors.text.secondary,
        textAlign: 'center',
    },

    // Quick actions
    quickActions: {
        gap: spacing.sm,
        marginTop: spacing.lg,
    },
    primaryButton: {
        backgroundColor: colors.accent.primary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
    },
    primaryButtonText: {
        color: colors.text.primary,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
    },
    secondaryButton: {
        backgroundColor: colors.background.tertiary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    secondaryButtonText: {
        color: colors.text.primary,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.medium,
    },

    // Sections
    section: {
        marginTop: spacing.xl,
    },
    sectionTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
        marginBottom: spacing.md,
    },
    placeholder: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        alignItems: 'center',
    },
    placeholderText: {
        color: colors.text.secondary,
        fontSize: typography.size.md,
    },
});
