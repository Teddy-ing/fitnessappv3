/**
 * Widget Editor Modal
 *
 * Allows users to add, remove, and reorder widgets on their profile.
 * Accessed via the edit icon in the widgets section header.
 *
 * Features:
 * - Current widgets with move up/down and delete buttons
 * - "Add Widget" opens a catalog picker (only shows available, not-yet-added types)
 * - MAX_WIDGETS = 6 limit enforcement
 * - Saves config via updateSettings()
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    Alert,
    TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';

import { colors, spacing, typography, borderRadius } from '../../theme';
import {
    WidgetConfig,
    WidgetCatalogEntry,
    WIDGET_CATALOG,
    MAX_WIDGETS,
} from '../../models/widget';
import { updateSettings, getPerformedExercises } from '../../services';
import { PerformedExercise } from '../../models/analytics';

// ============================================================
// Types
// ============================================================

interface WidgetEditorModalProps {
    visible: boolean;
    onClose: () => void;
    widgets: WidgetConfig[];
    onWidgetsChange: (widgets: WidgetConfig[]) => void;
}

// ============================================================
// Component
// ============================================================

export default function WidgetEditorModal({
    visible,
    onClose,
    widgets,
    onWidgetsChange,
}: WidgetEditorModalProps) {
    const [showCatalog, setShowCatalog] = useState(false);
    const [showExercisePicker, setShowExercisePicker] = useState(false);
    const [exercises, setExercises] = useState<PerformedExercise[]>([]);
    const [exerciseSearch, setExerciseSearch] = useState('');
    const [selectedMetric, setSelectedMetric] = useState<'1rm' | 'volume'>('1rm');

    // Load performed exercises when picker opens
    useEffect(() => {
        if (showExercisePicker) {
            getPerformedExercises('ALL').then(setExercises).catch(() => setExercises([]));
        }
    }, [showExercisePicker]);

    // Get catalog entries that can still be added
    const availableEntries = WIDGET_CATALOG.filter((entry) => {
        if (!entry.available) return false;
        if (entry.allowMultiple) return true;
        return !widgets.some((w) => w.type === entry.type);
    });

    const canAdd = widgets.length < MAX_WIDGETS && availableEntries.length > 0;

    // -------- Actions --------

    const saveConfig = useCallback(
        async (newWidgets: WidgetConfig[]) => {
            onWidgetsChange(newWidgets);
            try {
                await updateSettings({ widgetConfig: newWidgets });
            } catch (error) {
                console.error('[WidgetEditor] Failed to save config:', error);
            }
        },
        [onWidgetsChange],
    );

    const handleRemove = useCallback(
        (id: string) => {
            const updated = widgets.filter((w) => w.id !== id);
            saveConfig(updated);
        },
        [widgets, saveConfig],
    );

    const handleMoveUp = useCallback(
        (index: number) => {
            if (index === 0) return;
            const updated = [...widgets];
            [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
            saveConfig(updated);
        },
        [widgets, saveConfig],
    );

    const handleMoveDown = useCallback(
        (index: number) => {
            if (index >= widgets.length - 1) return;
            const updated = [...widgets];
            [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
            saveConfig(updated);
        },
        [widgets, saveConfig],
    );

    const handleAdd = useCallback(
        (entry: WidgetCatalogEntry) => {
            if (widgets.length >= MAX_WIDGETS) {
                Alert.alert('Limit Reached', `You can have a maximum of ${MAX_WIDGETS} widgets.`);
                return;
            }

            // Pinned exercise needs the exercise picker flow
            if (entry.type === 'pinned_exercise') {
                setShowExercisePicker(true);
                return;
            }

            const newWidget: WidgetConfig = {
                id: Crypto.randomUUID(),
                type: entry.type,
                size: entry.defaultSize,
            };

            const updated = [...widgets, newWidget];
            saveConfig(updated);
            setShowCatalog(false);
        },
        [widgets, saveConfig],
    );

    const handleAddPinnedExercise = useCallback(
        (exercise: PerformedExercise) => {
            if (widgets.length >= MAX_WIDGETS) {
                Alert.alert('Limit Reached', `You can have a maximum of ${MAX_WIDGETS} widgets.`);
                return;
            }

            const newWidget: WidgetConfig = {
                id: Crypto.randomUUID(),
                type: 'pinned_exercise',
                size: 'rectangle',
                exerciseId: exercise.exerciseId,
                exerciseName: exercise.exerciseName,
                metric: selectedMetric,
            };

            const updated = [...widgets, newWidget];
            saveConfig(updated);
            setShowExercisePicker(false);
            setShowCatalog(false);
            setExerciseSearch('');
        },
        [widgets, saveConfig, selectedMetric],
    );

    const handleClose = useCallback(() => {
        setShowCatalog(false);
        setShowExercisePicker(false);
        setExerciseSearch('');
        onClose();
    }, [onClose]);

    // Get display info for a widget type
    const getWidgetLabel = (type: string): string => {
        const entry = WIDGET_CATALOG.find((e) => e.type === type);
        return entry?.label ?? type;
    };

    const getWidgetIcon = (type: string): string => {
        const entry = WIDGET_CATALOG.find((e) => e.type === type);
        return entry?.icon ?? 'widgets';
    };

    // -------- Render --------

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>
                            {showExercisePicker
                                ? 'Pick Exercise'
                                : showCatalog
                                    ? 'Add Widget'
                                    : 'Edit Widgets'}
                        </Text>
                        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                            <MaterialIcons name="close" size={24} color={colors.text.primary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {showExercisePicker ? (
                            // -------- Exercise Picker View --------
                            <>
                                {/* Metric toggle */}
                                <View style={styles.metricToggle}>
                                    <TouchableOpacity
                                        style={[styles.metricButton, selectedMetric === '1rm' && styles.metricButtonActive]}
                                        onPress={() => setSelectedMetric('1rm')}
                                    >
                                        <Text style={[styles.metricButtonText, selectedMetric === '1rm' && styles.metricButtonTextActive]}>
                                            Est. 1RM
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.metricButton, selectedMetric === 'volume' && styles.metricButtonActive]}
                                        onPress={() => setSelectedMetric('volume')}
                                    >
                                        <Text style={[styles.metricButtonText, selectedMetric === 'volume' && styles.metricButtonTextActive]}>
                                            Volume
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Search */}
                                <View style={styles.searchContainer}>
                                    <MaterialIcons name="search" size={18} color={colors.text.disabled} />
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder="Search exercises..."
                                        placeholderTextColor={colors.text.disabled}
                                        value={exerciseSearch}
                                        onChangeText={setExerciseSearch}
                                        autoCapitalize="none"
                                    />
                                    {exerciseSearch.length > 0 && (
                                        <TouchableOpacity onPress={() => setExerciseSearch('')}>
                                            <MaterialIcons name="close" size={16} color={colors.text.disabled} />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* Exercise list */}
                                {exercises
                                    .filter((e) =>
                                        exerciseSearch.length === 0 ||
                                        e.exerciseName.toLowerCase().includes(exerciseSearch.toLowerCase()),
                                    )
                                    .slice(0, 20)
                                    .map((exercise) => (
                                        <TouchableOpacity
                                            key={exercise.exerciseId}
                                            style={styles.exerciseItem}
                                            onPress={() => handleAddPinnedExercise(exercise)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.exerciseInfo}>
                                                <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
                                                {exercise.primaryMuscle && (
                                                    <Text style={styles.exerciseMuscle}>{exercise.primaryMuscle}</Text>
                                                )}
                                            </View>
                                            <Text style={styles.exerciseSessions}>{exercise.totalSessions} sessions</Text>
                                        </TouchableOpacity>
                                    ))}

                                <TouchableOpacity
                                    style={styles.backButton}
                                    onPress={() => {
                                        setShowExercisePicker(false);
                                        setExerciseSearch('');
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <MaterialIcons name="arrow-back" size={18} color={colors.text.secondary} />
                                    <Text style={styles.backButtonText}>Back to catalog</Text>
                                </TouchableOpacity>
                            </>
                        ) : showCatalog ? (
                            // -------- Catalog View --------
                            <>
                                {availableEntries.map((entry) => (
                                    <TouchableOpacity
                                        key={entry.type}
                                        style={styles.catalogItem}
                                        onPress={() => handleAdd(entry)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.catalogIcon}>
                                            <MaterialIcons
                                                name={entry.icon as keyof typeof MaterialIcons.glyphMap}
                                                size={22}
                                                color={colors.accent.primary}
                                            />
                                        </View>
                                        <View style={styles.catalogInfo}>
                                            <Text style={styles.catalogLabel}>{entry.label}</Text>
                                            <Text style={styles.catalogDesc}>{entry.description}</Text>
                                            <View style={styles.sizeBadge}>
                                                <Text style={styles.sizeBadgeText}>
                                                    {entry.defaultSize === 'square' ? '1×1' : '2×1'}
                                                </Text>
                                            </View>
                                        </View>
                                        <MaterialIcons name="add-circle-outline" size={24} color={colors.accent.primary} />
                                    </TouchableOpacity>
                                ))}
                                <TouchableOpacity
                                    style={styles.backButton}
                                    onPress={() => setShowCatalog(false)}
                                    activeOpacity={0.7}
                                >
                                    <MaterialIcons name="arrow-back" size={18} color={colors.text.secondary} />
                                    <Text style={styles.backButtonText}>Back to editor</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            // -------- Editor View --------
                            <>
                                {widgets.map((widget, index) => (
                                    <View key={widget.id} style={styles.editorItem}>
                                        <View style={styles.editorItemLeft}>
                                            <MaterialIcons
                                                name={getWidgetIcon(widget.type) as keyof typeof MaterialIcons.glyphMap}
                                                size={20}
                                                color={colors.accent.primary}
                                            />
                                            <View style={styles.editorItemInfo}>
                                                <Text style={styles.editorItemLabel}>
                                                    {getWidgetLabel(widget.type)}
                                                </Text>
                                                <Text style={styles.editorItemSize}>
                                                    {widget.size === 'square' ? '1×1' : '2×1'}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.editorItemActions}>
                                            <TouchableOpacity
                                                onPress={() => handleMoveUp(index)}
                                                disabled={index === 0}
                                                style={styles.actionButton}
                                            >
                                                <MaterialIcons
                                                    name="keyboard-arrow-up"
                                                    size={22}
                                                    color={index === 0 ? colors.text.disabled : colors.text.secondary}
                                                />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => handleMoveDown(index)}
                                                disabled={index >= widgets.length - 1}
                                                style={styles.actionButton}
                                            >
                                                <MaterialIcons
                                                    name="keyboard-arrow-down"
                                                    size={22}
                                                    color={index >= widgets.length - 1 ? colors.text.disabled : colors.text.secondary}
                                                />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => handleRemove(widget.id)}
                                                style={styles.actionButton}
                                            >
                                                <MaterialIcons name="close" size={18} color={colors.accent.error} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}

                                {/* Add Widget button */}
                                {canAdd && (
                                    <TouchableOpacity
                                        style={styles.addButton}
                                        onPress={() => setShowCatalog(true)}
                                        activeOpacity={0.7}
                                    >
                                        <MaterialIcons name="add" size={20} color={colors.accent.primary} />
                                        <Text style={styles.addButtonText}>Add Widget</Text>
                                    </TouchableOpacity>
                                )}

                                {/* Widget count */}
                                <Text style={styles.countText}>
                                    {widgets.length} / {MAX_WIDGETS} widgets
                                </Text>
                            </>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: colors.background.primary,
        borderTopLeftRadius: borderRadius['2xl'],
        borderTopRightRadius: borderRadius['2xl'],
        maxHeight: '75%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.md,
        paddingBottom: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.glass.borderLight,
    },
    headerTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    closeButton: {
        padding: spacing.xs,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.md,
        paddingBottom: spacing.xxl,
    },

    // Editor items
    editorItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    editorItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    editorItemInfo: {
        marginLeft: spacing.md,
    },
    editorItemLabel: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
    },
    editorItemSize: {
        fontSize: typography.size.xs,
        color: colors.text.secondary,
        marginTop: 2,
    },
    editorItemActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        padding: spacing.xs,
    },

    // Add button
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.accent.primary,
        borderStyle: 'dashed',
        padding: spacing.md,
        marginTop: spacing.sm,
    },
    addButtonText: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
        color: colors.accent.primary,
        marginLeft: spacing.sm,
    },

    // Count
    countText: {
        fontSize: typography.size.xs,
        color: colors.text.disabled,
        textAlign: 'center',
        marginTop: spacing.md,
    },

    // Catalog items
    catalogItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    catalogIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: colors.background.tertiary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    catalogInfo: {
        flex: 1,
        marginLeft: spacing.md,
    },
    catalogLabel: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
    },
    catalogDesc: {
        fontSize: typography.size.xs,
        color: colors.text.secondary,
        marginTop: 2,
    },
    sizeBadge: {
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.sm,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        alignSelf: 'flex-start',
        marginTop: spacing.xs,
    },
    sizeBadgeText: {
        fontSize: 10,
        color: colors.text.secondary,
        fontWeight: typography.weight.medium,
    },

    // Back button
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.md,
        marginTop: spacing.sm,
    },
    backButtonText: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        marginLeft: spacing.xs,
    },

    // Exercise picker — metric toggle
    metricToggle: {
        flexDirection: 'row',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.md,
        marginBottom: spacing.md,
        padding: 3,
    },
    metricButton: {
        flex: 1,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        borderRadius: borderRadius.sm,
    },
    metricButtonActive: {
        backgroundColor: colors.accent.primary,
    },
    metricButtonText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
    },
    metricButtonTextActive: {
        color: '#fff',
    },

    // Exercise picker — search
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        marginBottom: spacing.md,
    },
    searchInput: {
        flex: 1,
        fontSize: typography.size.sm,
        color: colors.text.primary,
        marginLeft: spacing.sm,
        paddingVertical: 0,
    },

    // Exercise picker — list items
    exerciseItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.xs,
    },
    exerciseInfo: {
        flex: 1,
        marginRight: spacing.sm,
    },
    exerciseName: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
    },
    exerciseMuscle: {
        fontSize: typography.size.xs,
        color: colors.text.secondary,
        marginTop: 2,
    },
    exerciseSessions: {
        fontSize: typography.size.xs,
        color: colors.text.disabled,
    },
});

