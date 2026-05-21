/**
 * Settings Screen
 *
 * Comprehensive app settings hub with 5 sections:
 * - General: theme, units, display preferences
 * - Data Management: export, import, cloud backup
 * - Support: rate app, donate, feedback
 * - About: changelog, privacy, app info
 * - Dev Tools: clear data, mock data (__DEV__ only)
 *
 * Reached via Profile → Settings gear icon.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Alert,
    TouchableOpacity,
    Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';

import { colors, spacing, borderRadius, typography } from '../theme';
import { getSettings, updateSettings } from '../services/preferencesService';
import type { UserSettings } from '../models/preferences';
import { clearAllData, generateMockData, exportAllData, importAllData } from '../services';
import { generateSpreadsheetExport } from '../services/exportService';
import { SettingToggleRow, SettingSegmentedRow, SettingNavigationRow } from '../components/settings';
import ExportBottomSheet from '../components/settings/ExportBottomSheet';
import ImportBottomSheet from '../components/settings/ImportBottomSheet';
import CloudBackupSection from '../components/settings/CloudBackupSection';
import { invalidateWeightUnitCache } from '../hooks/useWeightUnit';

// ============================================================
// Segment options
// ============================================================

const WEIGHT_UNIT_OPTIONS = [
    { key: 'lbs', label: 'lbs' },
    { key: 'kg', label: 'kg' },
];

const DISTANCE_UNIT_OPTIONS = [
    { key: 'mi', label: 'mi' },
    { key: 'km', label: 'km' },
];

const MEASUREMENT_UNIT_OPTIONS = [
    { key: 'in', label: 'in' },
    { key: 'cm', label: 'cm' },
];

const CALENDAR_START_OPTIONS = [
    { key: 'sunday', label: 'Sun' },
    { key: 'monday', label: 'Mon' },
];

const THEME_OPTIONS = [
    { key: 'dark', label: 'Dark' },
    { key: 'light', label: 'Light' },
];

const TRAINING_PHASE_OPTIONS = [
    { key: 'bulk', label: 'Bulk' },
    { key: 'cut', label: 'Cut' },
    { key: 'maintain', label: 'Maintain' },
    { key: 'recovery', label: 'Recovery' },
];

// ============================================================
// Component
// ============================================================

export default function SettingsScreen() {
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showExportSheet, setShowExportSheet] = useState(false);
    const [showImportSheet, setShowImportSheet] = useState(false);

    // Load settings on mount
    useEffect(() => {
        getSettings().then(setSettings);
    }, []);

    // Helper to update a setting optimistically (BH-055: with rollback on failure)
    const handleUpdate = useCallback(async (updates: Partial<UserSettings>) => {
        // Snapshot current state for rollback
        const previousSettings = settings;
        setSettings(prev => prev ? { ...prev, ...updates } : prev);

        try {
            await updateSettings(updates);

            // Invalidate the weight unit cache so all components
            // using useWeightUnit() pick up the new value
            if ('weightUnit' in updates) {
                invalidateWeightUnitCache();
            }
        } catch (error) {
            console.error('[SettingsScreen] Failed to save setting:', error);
            // Rollback to previous state
            setSettings(previousSettings);
            Alert.alert('Error', 'Failed to save setting. Please try again.');
        }
    }, [settings]);

    // ============================================================
    // Data Management Handlers
    // ============================================================

    const handleExportSpreadsheet = useCallback(async () => {
        try {
            await generateSpreadsheetExport();
        } catch (error) {
            console.error('Spreadsheet export failed:', error);
            Alert.alert('Export Failed', String(error instanceof Error ? error.message : error));
        }
    }, []);

    const handleExportJSON = useCallback(async () => {
        try {
            await exportAllData();
        } catch (error) {
            console.error('JSON export failed:', error);
            Alert.alert('Export Failed', String(error instanceof Error ? error.message : error));
        }
    }, []);

    const handleImportJSON = useCallback(() => {
        Alert.alert(
            'Import Data',
            'This will REPLACE all your current data with the imported backup. Your existing workouts, templates, and measurements will be deleted.\n\nThis cannot be undone!',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Choose File',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const success = await importAllData();
                            if (success) {
                                const refreshed = await getSettings();
                                setSettings(refreshed);
                                Alert.alert(
                                    'Import Complete',
                                    'Your data has been restored. Restart the app to see all changes.',
                                );
                            }
                        } catch (error) {
                            console.error('Import failed:', error);
                            Alert.alert(
                                'Import Failed',
                                String(error instanceof Error ? error.message : error),
                            );
                        }
                    },
                },
            ],
        );
    }, []);

    const handleClearAllData = () => {
        Alert.alert(
            'Clear All Data',
            'This will delete all workouts, templates, and exercises. This cannot be undone!',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear Everything',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await clearAllData();
                            const refreshed = await getSettings();
                            setSettings(refreshed);
                            Alert.alert('Done', 'All data has been cleared. Restart the app to see changes.');
                        } catch (error) {
                            console.error('Error clearing data:', error);
                            Alert.alert('Error', 'Failed to clear data');
                        }
                    },
                },
            ],
        );
    };

    const handleGenerateMockData = () => {
        Alert.alert(
            'Generate Mock Data',
            'This will generate 3 months of realistic workout history. This may take a few seconds. Proceed?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Generate',
                    onPress: async () => {
                        try {
                            setIsGenerating(true);
                            await generateMockData(3);
                            Alert.alert('Done', 'Mock data generated successfully. Reload the app to see the updated data throughout the app.');
                        } catch (error) {
                            console.error('Error generating mock data:', error);
                            Alert.alert('Error', 'Failed to generate mock data. Check console for details.');
                        } finally {
                            setIsGenerating(false);
                        }
                    },
                },
            ],
        );
    };

    // ============================================================
    // Theme guard — light theme is a placeholder
    // ============================================================

    const handleThemeSelect = (key: string) => {
        if (key === 'light') {
            Alert.alert('Coming Soon', 'Light theme coming soon! We\'re working on it.');
            return;
        }
        handleUpdate({ theme: key });
    };

    // ============================================================
    // Render
    // ============================================================

    if (!settings) return null;

    const appVersion = Constants.expoConfig?.version ?? '0.1.0';

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ═══════════════ GENERAL ═══════════════ */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>GENERAL</Text>

                    <SettingSegmentedRow
                        icon="brightness-6"
                        label="Theme Mode"
                        options={THEME_OPTIONS}
                        selectedKey={settings.theme}
                        onSelect={handleThemeSelect}
                    />

                    <SettingSegmentedRow
                        icon="fitness-center"
                        label="Weight Unit"
                        options={WEIGHT_UNIT_OPTIONS}
                        selectedKey={settings.weightUnit}
                        onSelect={(key) => handleUpdate({ weightUnit: key })}
                    />

                    <SettingSegmentedRow
                        icon="straighten"
                        label="Distance Unit"
                        options={DISTANCE_UNIT_OPTIONS}
                        selectedKey={settings.distanceUnit}
                        onSelect={(key) => handleUpdate({ distanceUnit: key })}
                    />

                    <SettingSegmentedRow
                        icon="square-foot"
                        label="Measurement Unit"
                        options={MEASUREMENT_UNIT_OPTIONS}
                        selectedKey={settings.measurementUnit}
                        onSelect={(key) => handleUpdate({ measurementUnit: key })}
                    />

                    <SettingSegmentedRow
                        icon="calendar-today"
                        label="Calendar Start Day"
                        options={CALENDAR_START_OPTIONS}
                        selectedKey={settings.calendarStartDay}
                        onSelect={(key) => handleUpdate({ calendarStartDay: key })}
                    />

                    <SettingToggleRow
                        icon="phone-android"
                        label="Keep Awake During Workout"
                        subtitle="Prevent screen lock while training"
                        value={settings.keepAwakeDuringWorkout}
                        onValueChange={(val) => handleUpdate({ keepAwakeDuringWorkout: val })}
                    />

                    <SettingSegmentedRow
                        icon="trending-up"
                        label="Training Phase"
                        options={TRAINING_PHASE_OPTIONS}
                        selectedKey={settings.trainingPhase}
                        onSelect={(key) => handleUpdate({ trainingPhase: key as UserSettings['trainingPhase'] })}
                    />

                    <SettingNavigationRow
                        icon="local-fire-department"
                        iconColor={colors.accent.warning}
                        label="Warm-Up Calculator"
                        subtitle="Advanced warm-up weight calculator"
                        onPress={() => {
                            Alert.alert(
                                'Coming Soon',
                                'Warm-up calculator coming in a future update! This will help you calculate optimal warm-up weights based on your working weight.',
                            );
                        }}
                    />

                    <SettingToggleRow
                        icon="image"
                        label="Show Exercise Media"
                        subtitle="Show icons in exercise list"
                        value={settings.showExerciseMedia}
                        onValueChange={(val) => handleUpdate({ showExerciseMedia: val })}
                    />

                    <SettingToggleRow
                        icon="description"
                        label="Show Exercise Instructions"
                        subtitle="Show form instructions on exercise details"
                        value={settings.showExerciseInstructions}
                        onValueChange={(val) => handleUpdate({ showExerciseInstructions: val })}
                    />
                </View>

                {/* ═══════════════ DATA MANAGEMENT ═══════════════ */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>DATA MANAGEMENT</Text>

                    <SettingNavigationRow
                        icon="upload"
                        label="Export Data"
                        onPress={() => setShowExportSheet(true)}
                    />

                    <SettingNavigationRow
                        icon="download"
                        label="Import Data"
                        onPress={() => setShowImportSheet(true)}
                    />
                </View>

                {/* ═══════════════ CLOUD BACKUP ═══════════════ */}
                <CloudBackupSection />

                {/* ═══════════════ SUPPORT ═══════════════ */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>SUPPORT</Text>

                    <SettingNavigationRow
                        icon="star-outline"
                        iconColor={colors.accent.warning}
                        label="Rate App"
                        onPress={() => {
                            Alert.alert('Thank You!', 'Rating will be available once the app is published to the store.');
                        }}
                    />

                    <SettingNavigationRow
                        icon="favorite"
                        iconColor={colors.accent.error}
                        label="Support the Dev"
                        onPress={() => {
                            Alert.alert(
                                'Thank You! 💜',
                                'Thank you for your interest in supporting the project! Donation options are coming soon.',
                            );
                        }}
                    />

                    <SettingNavigationRow
                        icon="feedback"
                        iconColor={colors.accent.primary}
                        label="Send Feedback"
                        onPress={() => {
                            Linking.openURL('mailto:feedback@example.com?subject=Workout App Feedback').catch(() => {
                                Alert.alert('Error', 'Could not open email client.');
                            });
                        }}
                    />
                </View>

                {/* ═══════════════ ABOUT ═══════════════ */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ABOUT</Text>

                    <SettingNavigationRow
                        icon="new-releases"
                        label="Changelog"
                        onPress={() => {
                            Alert.alert(
                                `What's New — v${appVersion}`,
                                '• Settings screen with app-wide preferences\n• Expanded workout settings menu\n• Configurable units and display options\n• Exercise Details master guide screen',
                            );
                        }}
                    />

                    <SettingNavigationRow
                        icon="shield"
                        label="Privacy Policy"
                        subtitle="Your data stays on your device"
                        onPress={() => {
                            Alert.alert(
                                'Privacy First',
                                'Privacy policy will be available before the app launches. Your data is stored locally on your device — we never collect or transmit workout data.',
                            );
                        }}
                    />

                    <SettingNavigationRow
                        icon="info-outline"
                        label="About"
                        onPress={() => {
                            Alert.alert(
                                'About',
                                `Workout App v${appVersion}\n\nA free, privacy-first workout tracker.\n\nMade with 💜`,
                            );
                        }}
                    />
                </View>

                {/* ═══════════════ DEV TOOLS ═══════════════ */}
                {__DEV__ && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>🛠️ DEV TOOLS</Text>

                        <TouchableOpacity
                            style={[styles.menuItem, styles.dangerItem]}
                            onPress={handleClearAllData}
                            disabled={isGenerating}
                        >
                            <View style={styles.menuIconContainer}>
                                <MaterialIcons name="delete-forever" size={20} color={colors.accent.error} />
                            </View>
                            <Text style={[styles.menuText, styles.dangerText]}>Clear All Data</Text>
                            <MaterialIcons name="chevron-right" size={20} color={colors.text.secondary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={handleGenerateMockData}
                            disabled={isGenerating}
                        >
                            <View style={styles.menuIconContainer}>
                                <MaterialIcons
                                    name={isGenerating ? 'hourglass-top' : 'science'}
                                    size={20}
                                    color={colors.text.primary}
                                />
                            </View>
                            <Text style={styles.menuText}>
                                {isGenerating ? 'Generating...' : 'Generate Mock Data (3 Months)'}
                            </Text>
                            <MaterialIcons name="chevron-right" size={20} color={colors.text.secondary} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* ═══════════════ VERSION FOOTER ═══════════════ */}
                <View style={styles.versionFooter}>
                    <Text style={styles.versionText}>v{appVersion}</Text>
                </View>

                {/* Bottom spacer */}
                <View style={{ height: spacing.xxl }} />
            </ScrollView>

            {/* Bottom Sheets — rendered outside ScrollView for proper overlay */}
            <ExportBottomSheet
                isOpen={showExportSheet}
                onClose={() => setShowExportSheet(false)}
                onExportSpreadsheet={handleExportSpreadsheet}
                onExportJSON={handleExportJSON}
            />
            <ImportBottomSheet
                isOpen={showImportSheet}
                onClose={() => setShowImportSheet(false)}
                onImportJSON={handleImportJSON}
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.md,
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

    // Dev tools menu items (legacy pattern for Clear/Generate)
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.xs,
    },
    menuIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: colors.background.tertiary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    menuText: {
        flex: 1,
        fontSize: typography.size.md,
        color: colors.text.primary,
    },

    // Danger
    dangerItem: {
        borderWidth: 1,
        borderColor: colors.accent.error,
    },
    dangerText: {
        color: colors.accent.error,
    },

    // Version footer
    versionFooter: {
        alignItems: 'center',
        paddingVertical: spacing.lg,
        marginTop: spacing.md,
    },
    versionText: {
        fontSize: typography.size.sm,
        color: colors.text.disabled,
    },
});
