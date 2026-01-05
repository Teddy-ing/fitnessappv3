/**
 * Profile Screen
 * 
 * User profile, statistics, measurements, and settings.
 * All data stored locally - no account required.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, borderRadius, typography } from '../theme';

export default function ProfileScreen() {
    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Profile header */}
                <View style={styles.profileHeader}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>👤</Text>
                    </View>
                    <Text style={styles.username}>Your Profile</Text>
                    <Text style={styles.subtitle}>All data stored locally on your device</Text>
                </View>

                {/* Stats overview */}
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>0</Text>
                        <Text style={styles.statLabel}>Workouts</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>0</Text>
                        <Text style={styles.statLabel}>This Week</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>0</Text>
                        <Text style={styles.statLabel}>Day Streak</Text>
                    </View>
                </View>

                {/* Menu sections */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Your Data</Text>

                    <TouchableOpacity style={styles.menuItem}>
                        <Text style={styles.menuIcon}>📊</Text>
                        <Text style={styles.menuText}>Statistics</Text>
                        <Text style={styles.menuArrow}>›</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <Text style={styles.menuIcon}>📅</Text>
                        <Text style={styles.menuText}>Workout Calendar</Text>
                        <Text style={styles.menuArrow}>›</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <Text style={styles.menuIcon}>📏</Text>
                        <Text style={styles.menuText}>Body Measurements</Text>
                        <Text style={styles.menuArrow}>›</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <Text style={styles.menuIcon}>🏆</Text>
                        <Text style={styles.menuText}>Personal Records</Text>
                        <Text style={styles.menuArrow}>›</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Data Management</Text>

                    <TouchableOpacity style={styles.menuItem}>
                        <Text style={styles.menuIcon}>📤</Text>
                        <Text style={styles.menuText}>Export Data</Text>
                        <Text style={styles.menuArrow}>›</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <Text style={styles.menuIcon}>📥</Text>
                        <Text style={styles.menuText}>Import Data</Text>
                        <Text style={styles.menuArrow}>›</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <Text style={styles.menuIcon}>☁️</Text>
                        <Text style={styles.menuText}>Cloud Backup</Text>
                        <Text style={styles.menuArrow}>›</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>App</Text>

                    <TouchableOpacity style={styles.menuItem}>
                        <Text style={styles.menuIcon}>⚙️</Text>
                        <Text style={styles.menuText}>Settings</Text>
                        <Text style={styles.menuArrow}>›</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <Text style={styles.menuIcon}>❤️</Text>
                        <Text style={styles.menuText}>Support the App</Text>
                        <Text style={styles.menuArrow}>›</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <Text style={styles.menuIcon}>ℹ️</Text>
                        <Text style={styles.menuText}>About</Text>
                        <Text style={styles.menuArrow}>›</Text>
                    </TouchableOpacity>
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

    // Profile header
    profileHeader: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.background.tertiary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    avatarText: {
        fontSize: 40,
    },
    username: {
        fontSize: typography.size.xxl,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    subtitle: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
    },

    // Stats grid
    statsGrid: {
        flexDirection: 'row',
        marginBottom: spacing.lg,
    },
    statCard: {
        flex: 1,
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: 'center',
        marginHorizontal: spacing.xs,
    },
    statValue: {
        fontSize: typography.size.xxl,
        fontWeight: typography.weight.bold,
        color: colors.accent.primary,
    },
    statLabel: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        marginTop: spacing.xs,
    },

    // Sections
    section: {
        marginTop: spacing.lg,
    },
    sectionTitle: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.text.secondary,
        letterSpacing: 1,
        marginBottom: spacing.sm,
        marginLeft: spacing.xs,
    },

    // Menu items
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.xs,
    },
    menuIcon: {
        fontSize: 20,
        marginRight: spacing.md,
    },
    menuText: {
        flex: 1,
        fontSize: typography.size.md,
        color: colors.text.primary,
    },
    menuArrow: {
        fontSize: typography.size.xl,
        color: colors.text.secondary,
    },
});
