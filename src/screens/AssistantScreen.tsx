/**
 * Assistant Screen
 * 
 * AI-powered assistant for workout advice, weak point detection,
 * and optimization suggestions.
 * 
 * This is a paid feature in the cloud AI tier, but the UI
 * placeholder is available for all users.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

import { colors, spacing, borderRadius, typography } from '../theme';

export default function AssistantScreen() {
    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerIcon}>🤖</Text>
                    <Text style={styles.headerTitle}>AI Assistant</Text>
                    <Text style={styles.headerSubtitle}>
                        Get personalized workout advice and insights
                    </Text>
                </View>

                {/* Quick queries - preformatted buttons */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Insights</Text>

                    <TouchableOpacity style={styles.queryButton}>
                        <Text style={styles.queryIcon}>🎯</Text>
                        <View style={styles.queryContent}>
                            <Text style={styles.queryTitle}>Detect Weak Points</Text>
                            <Text style={styles.queryDescription}>
                                Analyze your workout history for muscle imbalances
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.queryButton}>
                        <Text style={styles.queryIcon}>📈</Text>
                        <View style={styles.queryContent}>
                            <Text style={styles.queryTitle}>Suggest Optimizations</Text>
                            <Text style={styles.queryDescription}>
                                Get recommendations to improve your routine
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.queryButton}>
                        <Text style={styles.queryIcon}>📋</Text>
                        <View style={styles.queryContent}>
                            <Text style={styles.queryTitle}>Create a Template</Text>
                            <Text style={styles.queryDescription}>
                                Generate a workout template for your goals
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.queryButton}>
                        <Text style={styles.queryIcon}>📅</Text>
                        <View style={styles.queryContent}>
                            <Text style={styles.queryTitle}>Build a Plan</Text>
                            <Text style={styles.queryDescription}>
                                Create a multi-week training program
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Coming soon notice */}
                <View style={styles.notice}>
                    <Text style={styles.noticeText}>
                        🚧 AI features coming soon! This will be part of the optional paid tier.
                    </Text>
                </View>
            </ScrollView>
        </View>
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

    // Header
    header: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },
    headerIcon: {
        fontSize: 48,
        marginBottom: spacing.md,
    },
    headerTitle: {
        fontSize: typography.size.xxl,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    headerSubtitle: {
        fontSize: typography.size.md,
        color: colors.text.secondary,
        textAlign: 'center',
    },

    // Sections
    section: {
        marginTop: spacing.lg,
    },
    sectionTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
        marginBottom: spacing.md,
    },

    // Query buttons
    queryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    queryIcon: {
        fontSize: 28,
        marginRight: spacing.md,
    },
    queryContent: {
        flex: 1,
    },
    queryTitle: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    queryDescription: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
    },

    // Notice
    notice: {
        marginTop: spacing.xl,
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.accent.warning,
    },
    noticeText: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        textAlign: 'center',
    },
});
