/**
 * Profile Screen
 * 
 * User profile hub with customizable widgets, a 2×2 data dashboard grid,
 * and access to settings.
 * All data stored locally - no account required.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useIsFocused } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, spacing, borderRadius, typography } from '../theme';
import { ProfileStackParamList } from '../navigation/AppNavigator';
import { WidgetConfig, DEFAULT_WIDGETS } from '../models/widget';
import { getSettings } from '../services';
import WidgetGrid from '../components/widgets/WidgetGrid';
import WidgetEditorModal from '../components/widgets/WidgetEditorModal';

type ProfileScreenProps = {
    navigation: NativeStackNavigationProp<ProfileStackParamList, 'ProfileHome'>;
};

// Dashboard grid items
const DASHBOARD_ITEMS: {
    key: string;
    label: string;
    icon: keyof typeof MaterialIcons.glyphMap;
    route: keyof ProfileStackParamList;
    color: string;
}[] = [
    { key: 'statistics', label: 'Statistics', icon: 'bar-chart', route: 'Analytics', color: '#a855f7' },
    { key: 'calendar', label: 'Calendar', icon: 'calendar-today', route: 'Calendar', color: '#3b82f6' },
    { key: 'measurements', label: 'Measurements', icon: 'straighten', route: 'Measurements', color: '#22c55e' },
    { key: 'goals', label: 'Goals', icon: 'flag', route: 'Goals', color: '#f59e0b' },
];

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
    const isFocused = useIsFocused();
    const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS);
    const [editorVisible, setEditorVisible] = useState(false);

    // Load widget config on focus
    const loadConfig = useCallback(async () => {
        try {
            const settings = await getSettings();
            if (settings.widgetConfig) {
                setWidgets(settings.widgetConfig);
            }
        } catch (error) {
            console.error('[ProfileScreen] Failed to load widget config:', error);
        }
    }, []);

    useEffect(() => {
        if (isFocused) {
            loadConfig();
        }
    }, [isFocused, loadConfig]);

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Profile header */}
                <View style={styles.profileHeader}>
                    {/* Settings gear — top right */}
                    <TouchableOpacity
                        style={styles.settingsGear}
                        onPress={() => navigation.navigate('Settings')}
                        activeOpacity={0.7}
                    >
                        <MaterialIcons name="settings" size={24} color={colors.text.secondary} />
                    </TouchableOpacity>

                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>👤</Text>
                    </View>
                    <Text style={styles.username}>Your Profile</Text>
                    <Text style={styles.subtitle}>All data stored locally on your device</Text>
                </View>

                {/* Widget Grid */}
                <WidgetGrid
                    widgets={widgets}
                    onEditPress={() => setEditorVisible(true)}
                />

                {/* Your Data — 2×2 Dashboard Grid */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>YOUR DATA</Text>
                    <View style={styles.dashboardGrid}>
                        {DASHBOARD_ITEMS.map((item) => (
                            <TouchableOpacity
                                key={item.key}
                                style={styles.dashboardCell}
                                onPress={() => navigation.navigate(item.route as never)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.dashboardCard}>
                                    <View style={[styles.dashboardIcon, { backgroundColor: `${item.color}20` }]}>
                                        <MaterialIcons name={item.icon} size={24} color={item.color} />
                                    </View>
                                    <Text style={styles.dashboardLabel}>{item.label}</Text>
                                    <MaterialIcons
                                        name="chevron-right"
                                        size={16}
                                        color={colors.text.disabled}
                                        style={styles.dashboardChevron}
                                    />
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Bottom spacer */}
                <View style={{ height: spacing.xxl }} />
            </ScrollView>

            {/* Widget Editor Modal */}
            <WidgetEditorModal
                visible={editorVisible}
                onClose={() => setEditorVisible(false)}
                widgets={widgets}
                onWidgetsChange={setWidgets}
            />
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
        paddingBottom: spacing.md,
    },

    // Profile header
    profileHeader: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
        position: 'relative',
    },
    settingsGear: {
        position: 'absolute',
        top: spacing.xl,
        right: 0,
        padding: spacing.xs,
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

    // Section
    section: {
        marginTop: spacing.sm,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: typography.weight.bold,
        color: colors.text.secondary,
        letterSpacing: 1,
        marginBottom: spacing.sm,
        marginLeft: spacing.xs,
    },

    // Dashboard Grid (2×2)
    dashboardGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -spacing.xs,
    },
    dashboardCell: {
        width: '50%',
        paddingHorizontal: spacing.xs,
        marginBottom: spacing.sm,
    },
    dashboardCard: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.glass.borderLight,
        padding: spacing.md,
    },
    dashboardIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    dashboardLabel: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
    },
    dashboardChevron: {
        position: 'absolute',
        top: spacing.md,
        right: spacing.md,
    },
});
