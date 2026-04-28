/**
 * Export Bottom Sheet
 *
 * Two-option modal sheet for choosing export format:
 * - Spreadsheet (.xlsx): Human-readable formatted data
 * - App Backup (.json): Full database backup for restore
 *
 * Uses React Native Modal with slide-up animation.
 * Implements Guardrail #14 concurrent invocation guard.
 */

import React, { useCallback, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '../../theme';

interface ExportBottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onExportSpreadsheet: () => Promise<void>;
    onExportJSON: () => Promise<void>;
}

export default function ExportBottomSheet({
    isOpen,
    onClose,
    onExportSpreadsheet,
    onExportJSON,
}: ExportBottomSheetProps) {
    const isRunning = useRef(false);
    const [loadingType, setLoadingType] = React.useState<'xlsx' | 'json' | null>(null);
    const insets = useSafeAreaInsets();

    const handleExport = useCallback(async (type: 'xlsx' | 'json') => {
        // Guardrail #14: concurrent invocation guard
        if (isRunning.current) return;
        isRunning.current = true;
        setLoadingType(type);

        try {
            if (type === 'xlsx') {
                await onExportSpreadsheet();
            } else {
                await onExportJSON();
            }
        } catch (error) {
            // BH-068: Surface export errors to the user instead of swallowing them
            Alert.alert(
                'Export Failed',
                String(error instanceof Error ? error.message : error),
            );
        } finally {
            isRunning.current = false;
            setLoadingType(null);
            onClose();
        }
    }, [onExportSpreadsheet, onExportJSON, onClose]);

    return (
        <Modal
            visible={isOpen}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
                            <View style={styles.handle} />

                            <View style={styles.content}>
                                <Text style={styles.title}>Export Data</Text>

                                <TouchableOpacity
                                    style={styles.option}
                                    onPress={() => handleExport('xlsx')}
                                    disabled={loadingType !== null}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.iconContainer, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                                        {loadingType === 'xlsx' ? (
                                            <ActivityIndicator size="small" color={colors.accent.success} />
                                        ) : (
                                            <MaterialIcons name="table-chart" size={22} color={colors.accent.success} />
                                        )}
                                    </View>
                                    <View style={styles.optionText}>
                                        <Text style={styles.optionLabel}>Spreadsheet (.xlsx)</Text>
                                        <Text style={styles.optionSubtitle}>
                                            Human-readable export for viewing in Excel or Google Sheets
                                        </Text>
                                    </View>
                                    <MaterialIcons name="chevron-right" size={20} color={colors.text.secondary} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.option}
                                    onPress={() => handleExport('json')}
                                    disabled={loadingType !== null}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.iconContainer, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                                        {loadingType === 'json' ? (
                                            <ActivityIndicator size="small" color={colors.accent.primary} />
                                        ) : (
                                            <MaterialIcons name="backup" size={22} color={colors.accent.primary} />
                                        )}
                                    </View>
                                    <View style={styles.optionText}>
                                        <Text style={styles.optionLabel}>App Backup (.json)</Text>
                                        <Text style={styles.optionSubtitle}>
                                            Full backup for restoring into this app later
                                        </Text>
                                    </View>
                                    <MaterialIcons name="chevron-right" size={20} color={colors.text.secondary} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: colors.background.secondary,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        paddingTop: spacing.sm,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.text.disabled,
        alignSelf: 'center',
        marginBottom: spacing.md,
    },
    content: {
        paddingHorizontal: spacing.lg,
    },
    title: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
        marginBottom: spacing.md,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    optionText: {
        flex: 1,
    },
    optionLabel: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
    },
    optionSubtitle: {
        fontSize: typography.size.xs,
        color: colors.text.secondary,
        marginTop: 2,
    },
});
