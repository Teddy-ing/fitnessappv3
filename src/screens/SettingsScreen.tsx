/**
 * Settings Screen
 *
 * App settings, data management, and developer tools.
 * Reached via Profile → Settings.
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, spacing, borderRadius, typography } from '../theme';
import { clearAllData, generateMockData, exportAllData, importAllData } from '../services';

export default function SettingsScreen() {
    const [isGenerating, setIsGenerating] = React.useState(false);
    const [isExporting, setIsExporting] = React.useState(false);
    const [isImporting, setIsImporting] = React.useState(false);

    // ============================================================
    // Handlers (moved from ProfileScreen)
    // ============================================================

    const handleExportData = async () => {
        try {
            setIsExporting(true);
            await exportAllData();
        } catch (error) {
            console.error('Export failed:', error);
            Alert.alert('Export Failed', String(error instanceof Error ? error.message : error));
        } finally {
            setIsExporting(false);
        }
    };

    const handleImportData = () => {
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
                            setIsImporting(true);
                            const success = await importAllData();
                            if (success) {
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
                        } finally {
                            setIsImporting(false);
                        }
                    },
                },
            ],
        );
    };

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
    // Render
    // ============================================================

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Data Management */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Data Management</Text>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={handleExportData}
                        disabled={isExporting || isImporting}
                    >
                        <View style={styles.menuIconContainer}>
                            <MaterialIcons
                                name={isExporting ? 'hourglass-top' : 'upload'}
                                size={20}
                                color={colors.text.primary}
                            />
                        </View>
                        <Text style={styles.menuText}>
                            {isExporting ? 'Exporting...' : 'Export Data'}
                        </Text>
                        <MaterialIcons name="chevron-right" size={20} color={colors.text.secondary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={handleImportData}
                        disabled={isExporting || isImporting}
                    >
                        <View style={styles.menuIconContainer}>
                            <MaterialIcons
                                name={isImporting ? 'hourglass-top' : 'download'}
                                size={20}
                                color={colors.text.primary}
                            />
                        </View>
                        <Text style={styles.menuText}>
                            {isImporting ? 'Importing...' : 'Import Data'}
                        </Text>
                        <MaterialIcons name="chevron-right" size={20} color={colors.text.secondary} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <View style={styles.menuIconContainer}>
                            <MaterialIcons name="cloud-upload" size={20} color={colors.text.primary} />
                        </View>
                        <Text style={styles.menuText}>Cloud Backup</Text>
                        <MaterialIcons name="chevron-right" size={20} color={colors.text.secondary} />
                    </TouchableOpacity>
                </View>

                {/* App */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>App</Text>

                    <TouchableOpacity style={styles.menuItem}>
                        <View style={styles.menuIconContainer}>
                            <MaterialIcons name="favorite" size={20} color={colors.accent.error} />
                        </View>
                        <Text style={styles.menuText}>Support the App</Text>
                        <MaterialIcons name="chevron-right" size={20} color={colors.text.secondary} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <View style={styles.menuIconContainer}>
                            <MaterialIcons name="info-outline" size={20} color={colors.text.primary} />
                        </View>
                        <Text style={styles.menuText}>About</Text>
                        <MaterialIcons name="chevron-right" size={20} color={colors.text.secondary} />
                    </TouchableOpacity>
                </View>

                {/* Dev Tools */}
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

                {/* Bottom spacer */}
                <View style={{ height: spacing.xxl }} />
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
});
