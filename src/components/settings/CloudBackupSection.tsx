/**
 * Cloud Backup Section
 *
 * Inline settings section for cloud backup configuration.
 * Two states:
 * - Disconnected: "Connect to Google Drive" button
 * - Connected: Auto-backup toggle, last backup time, manual backup/restore/disconnect
 *
 * Implements Guardrail #14 concurrent invocation guards on all async actions.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Switch,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, spacing, borderRadius, typography } from '../../theme';
import {
    connectGoogleDrive,
    disconnectCloudProvider,
    getCloudBackupConfig,
    backupToCloud,
    restoreFromCloud,
    setAutoBackup,
    type CloudBackupConfig,
} from '../../services/cloudBackupService';

// ============================================================
// Component
// ============================================================

export default function CloudBackupSection() {
    const [config, setConfig] = useState<CloudBackupConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isBacking, setIsBacking] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const connectGuard = useRef(false);
    const backupGuard = useRef(false);
    const restoreGuard = useRef(false);

    // Load config on mount
    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = useCallback(async () => {
        try {
            const cfg = await getCloudBackupConfig();
            setConfig(cfg);
        } catch (error) {
            console.error('[CloudBackupSection] Failed to load config:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // ============================================================
    // Handlers
    // ============================================================

    const handleConnect = useCallback(async () => {
        if (connectGuard.current) return;
        connectGuard.current = true;
        setIsConnecting(true);

        try {
            await connectGoogleDrive();
            await loadConfig();
        } catch (error) {
            console.error('[CloudBackupSection] Connect failed:', error);
            Alert.alert(
                'Connection Failed',
                String(error instanceof Error ? error.message : error),
            );
        } finally {
            connectGuard.current = false;
            setIsConnecting(false);
        }
    }, [loadConfig]);

    const handleBackupNow = useCallback(async () => {
        if (backupGuard.current) return;
        backupGuard.current = true;
        setIsBacking(true);

        try {
            const result = await backupToCloud();
            await loadConfig();
            Alert.alert('Backup Complete', `Data backed up successfully.`);
        } catch (error) {
            console.error('[CloudBackupSection] Backup failed:', error);
            await loadConfig(); // Reload to show failed status
            Alert.alert(
                'Backup Failed',
                String(error instanceof Error ? error.message : error),
            );
        } finally {
            backupGuard.current = false;
            setIsBacking(false);
        }
    }, [loadConfig]);

    const handleRestore = useCallback(() => {
        // Two-step destructive confirmation per PRD
        Alert.alert(
            'Restore from Cloud?',
            'This will REPLACE all your current data with the cloud backup.\n\n' +
            'Your existing workouts, templates, and measurements will be deleted.\n\n' +
            'This cannot be undone!',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Restore',
                    style: 'destructive',
                    onPress: () => {
                        // Second confirmation
                        Alert.alert(
                            'Are you sure?',
                            'All current data will be permanently replaced.',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Yes, Restore',
                                    style: 'destructive',
                                    onPress: executeRestore,
                                },
                            ],
                        );
                    },
                },
            ],
        );
    }, []);

    const executeRestore = useCallback(async () => {
        if (restoreGuard.current) return;
        restoreGuard.current = true;
        setIsRestoring(true);

        try {
            const success = await restoreFromCloud();
            if (success) {
                Alert.alert(
                    'Restore Complete',
                    'Your data has been restored from the cloud backup. Restart the app to see all changes.',
                );
            } else {
                Alert.alert('No Backup Found', 'No cloud backup was found for this account.');
            }
        } catch (error) {
            console.error('[CloudBackupSection] Restore failed:', error);
            Alert.alert(
                'Restore Failed',
                String(error instanceof Error ? error.message : error),
            );
        } finally {
            restoreGuard.current = false;
            setIsRestoring(false);
        }
    }, []);

    const handleDisconnect = useCallback(() => {
        Alert.alert(
            'Disconnect Cloud Backup?',
            'Auto-backup will be disabled. Your existing cloud backup will remain on Google Drive.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Disconnect',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await disconnectCloudProvider();
                            await loadConfig();
                        } catch (error) {
                            console.error('[CloudBackupSection] Disconnect failed:', error);
                        }
                    },
                },
            ],
        );
    }, [loadConfig]);

    const handleToggleAutoBackup = useCallback(async (enabled: boolean) => {
        try {
            await setAutoBackup(enabled);
            await loadConfig();
        } catch (error) {
            console.error('[CloudBackupSection] Toggle auto-backup failed:', error);
        }
    }, [loadConfig]);

    // ============================================================
    // Render helpers
    // ============================================================

    const formatLastBackup = (isoString: string | null): string => {
        if (!isoString) return 'Never';

        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        const diffHrs = Math.floor(diffMs / 3600000);

        if (diffMin < 1) return 'Just now';
        if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
        if (diffHrs < 24) return `${diffHrs} hour${diffHrs > 1 ? 's' : ''} ago`;

        return date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    // ============================================================
    // Loading state
    // ============================================================

    if (isLoading) {
        return (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>CLOUD BACKUP</Text>
                <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={colors.text.secondary} />
                </View>
            </View>
        );
    }

    // ============================================================
    // Disconnected state
    // ============================================================

    const isDisconnected = !config?.provider;

    if (isDisconnected) {
        return (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>CLOUD BACKUP</Text>

                <TouchableOpacity
                    style={styles.connectRow}
                    onPress={handleConnect}
                    disabled={isConnecting}
                    activeOpacity={0.7}
                >
                    <View style={styles.connectIconContainer}>
                        {isConnecting ? (
                            <ActivityIndicator size="small" color="#4285F4" />
                        ) : (
                            <MaterialIcons name="cloud-upload" size={22} color="#4285F4" />
                        )}
                    </View>
                    <View style={styles.connectText}>
                        <Text style={styles.connectLabel}>
                            {isConnecting ? 'Connecting...' : 'Connect to Google Drive'}
                        </Text>
                        <Text style={styles.connectSubtitle}>
                            Automatically back up your data to the cloud
                        </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={colors.text.secondary} />
                </TouchableOpacity>
            </View>
        );
    }

    // ============================================================
    // Connected state
    // ============================================================

    const isFailed = config.lastBackupStatus === 'failed';
    const isAnyAction = isBacking || isRestoring;

    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>CLOUD BACKUP</Text>

            {/* Connected status */}
            <View style={styles.statusCard}>
                <View style={styles.statusHeader}>
                    <MaterialIcons name="check-circle" size={18} color={colors.accent.success} />
                    <Text style={styles.statusTitle}>Connected to Google Drive</Text>
                </View>
                <Text style={styles.statusEmail}>{config.accountIdentifier}</Text>
            </View>

            {/* Auto-backup toggle */}
            <View style={styles.toggleRow}>
                <View style={styles.toggleLeft}>
                    <MaterialIcons name="autorenew" size={20} color={colors.text.primary} />
                    <Text style={styles.toggleLabel}>Auto-Backup</Text>
                </View>
                <Switch
                    value={config.autoBackupEnabled}
                    onValueChange={handleToggleAutoBackup}
                    trackColor={{ false: colors.background.tertiary, true: colors.accent.primary }}
                    thumbColor="#fff"
                />
            </View>

            {/* Last backup status */}
            <View style={styles.statusRow}>
                <MaterialIcons
                    name={isFailed ? 'warning' : 'access-time'}
                    size={16}
                    color={isFailed ? colors.accent.warning : colors.text.secondary}
                />
                <Text style={[styles.statusText, isFailed && styles.statusTextWarning]}>
                    {isFailed
                        ? `Last backup failed • ${formatLastBackup(config.lastBackupAt)}`
                        : `Last backed up: ${formatLastBackup(config.lastBackupAt)}`}
                </Text>
            </View>

            {/* Action buttons */}
            <View style={styles.actionsRow}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.backupButton]}
                    onPress={handleBackupNow}
                    disabled={isAnyAction}
                    activeOpacity={0.7}
                >
                    {isBacking ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <MaterialIcons name="backup" size={16} color="#fff" />
                            <Text style={styles.backupButtonText}>Back Up Now</Text>
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, styles.restoreButton]}
                    onPress={handleRestore}
                    disabled={isAnyAction}
                    activeOpacity={0.7}
                >
                    {isRestoring ? (
                        <ActivityIndicator size="small" color={colors.accent.error} />
                    ) : (
                        <>
                            <MaterialIcons name="restore" size={16} color={colors.accent.error} />
                            <Text style={styles.restoreButtonText}>Restore</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* Disconnect */}
            <TouchableOpacity
                style={styles.disconnectRow}
                onPress={handleDisconnect}
                activeOpacity={0.7}
            >
                <Text style={styles.disconnectText}>Disconnect</Text>
            </TouchableOpacity>
        </View>
    );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
    section: {
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.semibold,
        color: colors.text.secondary,
        letterSpacing: 0.5,
        marginBottom: spacing.sm,
        paddingHorizontal: spacing.md,
    },
    loadingRow: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        alignItems: 'center',
    },

    // Disconnected state
    connectRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
    },
    connectIconContainer: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.md,
        backgroundColor: 'rgba(66, 133, 244, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    connectText: {
        flex: 1,
    },
    connectLabel: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
    },
    connectSubtitle: {
        fontSize: typography.size.xs,
        color: colors.text.secondary,
        marginTop: 2,
    },

    // Connected state
    statusCard: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    statusHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    statusTitle: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
    },
    statusEmail: {
        fontSize: typography.size.xs,
        color: colors.text.secondary,
        marginTop: 2,
        marginLeft: 26, // align with text after icon
    },

    // Toggle
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    toggleLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    toggleLabel: {
        fontSize: typography.size.md,
        color: colors.text.primary,
    },

    // Status row
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        marginBottom: spacing.md,
    },
    statusText: {
        fontSize: typography.size.xs,
        color: colors.text.secondary,
    },
    statusTextWarning: {
        color: colors.accent.warning,
    },

    // Actions
    actionsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: borderRadius.lg,
        gap: spacing.xs,
    },
    backupButton: {
        backgroundColor: colors.accent.primary,
    },
    backupButtonText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: '#fff',
    },
    restoreButton: {
        backgroundColor: colors.background.secondary,
        borderWidth: 1,
        borderColor: colors.border,
    },
    restoreButtonText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.accent.error,
    },

    // Disconnect
    disconnectRow: {
        alignItems: 'center',
        padding: spacing.sm,
    },
    disconnectText: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
    },
});
