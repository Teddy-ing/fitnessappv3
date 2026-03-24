/**
 * Measurements Screen
 *
 * Three-tab measurements interface:
 * - Track: Input measurements for the current date
 * - Trends: Sparklines and detailed charts for visible metrics
 * - Gallery: Progress photos grid with comparison mode
 *
 * Uses a custom pill-shaped segmented control (not a tab navigator).
 * All three views share the same screen and switch with useState.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Animated,
    Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, borderRadius, typography } from '../theme';
import { WorkoutKeyboard } from '../components';
import {
    getMeasurementTypes,
    getVisibleMeasurementTypes,
    logMeasurement,
    updateMeasurement,
    getLatestMeasurements,
    getMeasurementsForDate,
} from '../services';
import { getSettings, updateSettings } from '../services/preferencesService';
import type { MeasurementType, Measurement } from '../models';
import TrendsTab from '../components/measurements/TrendsTab';
import GalleryTab from '../components/measurements/GalleryTab';

// ============================================================
// Types
// ============================================================

type TabId = 'track' | 'trends' | 'gallery';

interface MeasurementField {
    type: MeasurementType;
    currentValue: string;       // Display value (logged today or empty)
    lastValue: string | null;   // Last recorded value (placeholder)
    lastDate: string | null;    // Date of last recorded value (YYYY-MM-DD)
    measurementId: string | null; // ID if already logged today (for update)
}

// ============================================================
// SegmentedControl
// ============================================================

interface SegmentedControlProps {
    tabs: { id: TabId; label: string }[];
    activeTab: TabId;
    onTabChange: (tab: TabId) => void;
}

function SegmentedControl({ tabs, activeTab, onTabChange }: SegmentedControlProps) {
    return (
        <View style={segStyles.container}>
            {tabs.map((tab) => {
                const isActive = tab.id === activeTab;
                return (
                    <TouchableOpacity
                        key={tab.id}
                        style={[segStyles.tab, isActive && segStyles.activeTab]}
                        onPress={() => onTabChange(tab.id)}
                        activeOpacity={0.7}
                    >
                        <Text style={[segStyles.tabText, isActive && segStyles.activeTabText]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const segStyles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.xl,
        padding: 3,
        marginHorizontal: spacing.lg,
        marginTop: spacing.md,
        marginBottom: spacing.lg,
    },
    tab: {
        flex: 1,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.xl - 3,
        alignItems: 'center',
    },
    activeTab: {
        backgroundColor: colors.accent.primary,
    },
    tabText: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium as '500',
    },
    activeTabText: {
        color: colors.text.primary,
        fontWeight: typography.weight.semibold as '600',
    },
});

// ============================================================
// DateSelector
// ============================================================

interface DateSelectorProps {
    date: string;
    onPrev: () => void;
    onNext: () => void;
    isToday: boolean;
}

function DateSelector({ date, onPrev, onNext, isToday }: DateSelectorProps) {
    const formatted = formatDateDisplay(date);
    return (
        <View style={dateStyles.container}>
            <TouchableOpacity onPress={onPrev} style={dateStyles.arrow}>
                <Text style={dateStyles.arrowText}>‹</Text>
            </TouchableOpacity>
            <View style={dateStyles.center}>
                <Text style={dateStyles.dateText}>{formatted}</Text>
                {isToday && <Text style={dateStyles.todayBadge}>Today</Text>}
            </View>
            <TouchableOpacity
                onPress={onNext}
                style={[dateStyles.arrow, isToday && dateStyles.arrowDisabled]}
                disabled={isToday}
            >
                <Text style={[dateStyles.arrowText, isToday && dateStyles.arrowDisabledText]}>›</Text>
            </TouchableOpacity>
        </View>
    );
}

function formatDateDisplay(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

const dateStyles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    arrow: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.background.tertiary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    arrowDisabled: {
        opacity: 0.3,
    },
    arrowText: {
        color: colors.text.primary,
        fontSize: 24,
        fontWeight: typography.weight.semibold as '600',
    },
    arrowDisabledText: {
        color: colors.text.disabled,
    },
    center: {
        alignItems: 'center',
    },
    dateText: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold as '600',
    },
    todayBadge: {
        color: colors.accent.primary,
        fontSize: typography.size.xs,
        fontWeight: typography.weight.medium as '500',
        marginTop: 2,
    },
});

// ============================================================
// MetricInputRow
// ============================================================

interface MetricInputRowProps {
    field: MeasurementField;
    isFocused: boolean;
    unitSystem: string;
    onPress: () => void;
}

function MetricInputRow({ field, isFocused, unitSystem, onPress }: MetricInputRowProps) {
    const unit = unitSystem === 'kg' ? field.type.unitMetric : field.type.unitImperial;
    const displayValue = field.currentValue || field.lastValue || '—';
    const isPlaceholder = !field.currentValue;

    return (
        <TouchableOpacity
            style={[rowStyles.container, isFocused && rowStyles.focused]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={rowStyles.left}>
                <Text style={rowStyles.name}>{field.type.name}</Text>
                {field.lastValue && !field.currentValue && field.lastDate && (
                    <Text style={rowStyles.lastDate}>
                        last recorded {new Date(field.lastDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                )}
            </View>
            <View style={rowStyles.right}>
                <Text style={[
                    rowStyles.value,
                    isPlaceholder && rowStyles.valuePlaceholder,
                    isFocused && rowStyles.valueFocused,
                ]}>
                    {displayValue}
                </Text>
                <Text style={rowStyles.unit}>{unit}</Text>
            </View>
        </TouchableOpacity>
    );
}

const rowStyles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.separator,
    },
    focused: {
        backgroundColor: colors.accent.primary + '15',
        borderLeftWidth: 3,
        borderLeftColor: colors.accent.primary,
    },
    left: {
        flex: 1,
    },
    name: {
        color: colors.text.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.medium as '500',
    },
    lastDate: {
        color: colors.text.disabled,
        fontSize: typography.size.xs,
        marginTop: 2,
    },
    right: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: spacing.xs,
    },
    value: {
        color: colors.text.primary,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold as '600',
    },
    valuePlaceholder: {
        color: colors.text.disabled,
    },
    valueFocused: {
        color: colors.accent.primary,
    },
    unit: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
    },
});

// ============================================================
// ManageMeasurementsModal
// ============================================================

interface ManageModalProps {
    visible: boolean;
    allTypes: MeasurementType[];
    visibleIds: string[];
    onToggle: (typeId: string) => void;
    onClose: () => void;
}

function ManageMeasurementsModal({ visible, allTypes, visibleIds, onToggle, onClose }: ManageModalProps) {
    if (!visible) return null;

    return (
        <View style={manageStyles.overlay}>
            <View style={manageStyles.modal}>
                <View style={manageStyles.header}>
                    <Text style={manageStyles.title}>Manage Measurements</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={manageStyles.done}>Done</Text>
                    </TouchableOpacity>
                </View>
                <ScrollView style={manageStyles.list}>
                    {allTypes.map((type) => {
                        const isVisible = visibleIds.includes(type.id);
                        return (
                            <TouchableOpacity
                                key={type.id}
                                style={manageStyles.row}
                                onPress={() => onToggle(type.id)}
                                activeOpacity={0.7}
                            >
                                <View style={manageStyles.rowLeft}>
                                    <Text style={manageStyles.categoryBadge}>
                                        {type.category.toUpperCase()}
                                    </Text>
                                    <Text style={manageStyles.typeName}>{type.name}</Text>
                                </View>
                                <View style={[
                                    manageStyles.toggle,
                                    isVisible && manageStyles.toggleActive,
                                ]}>
                                    <Text style={manageStyles.toggleIcon}>
                                        {isVisible ? '👁' : ''}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>
        </View>
    );
}

const manageStyles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
        zIndex: 100,
    },
    modal: {
        backgroundColor: colors.background.secondary,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        maxHeight: '70%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.separator,
    },
    title: {
        color: colors.text.primary,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold as '600',
    },
    done: {
        color: colors.accent.primary,
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold as '600',
    },
    list: {
        paddingBottom: spacing.xl,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.separator,
    },
    rowLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    categoryBadge: {
        fontSize: typography.size.xs,
        color: colors.text.disabled,
        backgroundColor: colors.background.tertiary,
        paddingHorizontal: spacing.xs,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
        overflow: 'hidden',
    },
    typeName: {
        color: colors.text.primary,
        fontSize: typography.size.md,
    },
    toggle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.background.tertiary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    toggleActive: {
        backgroundColor: colors.accent.primary + '30',
        borderColor: colors.accent.primary,
    },
    toggleIcon: {
        fontSize: 16,
    },
});

// ============================================================
// TrackTab
// ============================================================

interface TrackTabProps {
    date: string;
    onDateChange: (date: string) => void;
    fields: MeasurementField[];
    focusedIndex: number | null;
    onFieldPress: (index: number) => void;
    unitSystem: string;
    allTypes: MeasurementType[];
    visibleIds: string[];
    onToggleVisibility: (typeId: string) => void;
}

function TrackTab({
    date,
    onDateChange,
    fields,
    focusedIndex,
    onFieldPress,
    unitSystem,
    allTypes,
    visibleIds,
    onToggleVisibility,
}: TrackTabProps) {
    const [showManage, setShowManage] = useState(false);

    const isToday = date === getTodayStr();

    const handlePrevDay = () => {
        const d = new Date(date + 'T12:00:00');
        d.setDate(d.getDate() - 1);
        onDateChange(formatISODate(d));
    };

    const handleNextDay = () => {
        if (isToday) return;
        const d = new Date(date + 'T12:00:00');
        d.setDate(d.getDate() + 1);
        onDateChange(formatISODate(d));
    };

    return (
        <View style={{ flex: 1 }}>
            <DateSelector
                date={date}
                onPrev={handlePrevDay}
                onNext={handleNextDay}
                isToday={isToday}
            />

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 120 }}
                keyboardShouldPersistTaps="handled"
            >
                {fields.length === 0 ? (
                    <View style={trackStyles.emptyState}>
                        <Text style={trackStyles.emptyIcon}>📏</Text>
                        <Text style={trackStyles.emptyTitle}>No Metrics Selected</Text>
                        <Text style={trackStyles.emptySubtitle}>
                            Tap "Manage Measurements" below to choose which metrics to track.
                        </Text>
                    </View>
                ) : (
                    fields.map((field, index) => (
                        <MetricInputRow
                            key={field.type.id}
                            field={field}
                            isFocused={focusedIndex === index}
                            unitSystem={unitSystem}
                            onPress={() => onFieldPress(index)}
                        />
                    ))
                )}

                {/* Manage Measurements button */}
                <TouchableOpacity
                    style={trackStyles.manageButton}
                    onPress={() => setShowManage(true)}
                    activeOpacity={0.7}
                >
                    <Text style={trackStyles.manageIcon}>⚙️</Text>
                    <Text style={trackStyles.manageText}>Manage Measurements</Text>
                </TouchableOpacity>
            </ScrollView>

            <ManageMeasurementsModal
                visible={showManage}
                allTypes={allTypes}
                visibleIds={visibleIds}
                onToggle={onToggleVisibility}
                onClose={() => setShowManage(false)}
            />
        </View>
    );
}

const trackStyles = StyleSheet.create({
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
        paddingHorizontal: spacing.xl,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: spacing.md,
    },
    emptyTitle: {
        color: colors.text.primary,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold as '600',
        marginBottom: spacing.sm,
    },
    emptySubtitle: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        textAlign: 'center',
        lineHeight: 20,
    },
    manageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        marginTop: spacing.lg,
        marginHorizontal: spacing.lg,
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.lg,
        gap: spacing.sm,
    },
    manageIcon: {
        fontSize: 16,
    },
    manageText: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium as '500',
    },
});

// GalleryTab is imported from '../components/measurements/GalleryTab'


// ============================================================
// Helper functions
// ============================================================

function getTodayStr(): string {
    return formatISODate(new Date());
}

function formatISODate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ============================================================
// Main Screen
// ============================================================

const TABS: { id: TabId; label: string }[] = [
    { id: 'track', label: 'Track' },
    { id: 'trends', label: 'Trends' },
    { id: 'gallery', label: 'Gallery' },
];

export default function MeasurementsScreen() {
    const [activeTab, setActiveTab] = useState<TabId>('track');

    // Track tab state
    const [date, setDate] = useState(getTodayStr);
    const [allTypes, setAllTypes] = useState<MeasurementType[]>([]);
    const [visibleIds, setVisibleIds] = useState<string[]>([]);
    const [fields, setFields] = useState<MeasurementField[]>([]);
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
    const [keyboardValue, setKeyboardValue] = useState('');
    const [unitSystem, setUnitSystem] = useState('lbs');

    // Load settings + types on mount
    useEffect(() => {
        loadData();
    }, []);

    // Reload fields when date or visible IDs change
    useEffect(() => {
        if (visibleIds.length > 0) {
            loadFields();
        }
    }, [date, visibleIds]);

    const loadData = useCallback(async () => {
        const [settings, types] = await Promise.all([
            getSettings(),
            getMeasurementTypes(),
        ]);
        setUnitSystem(settings.weightUnit);
        setVisibleIds(settings.visibleMeasurements);
        setAllTypes(types);
    }, []);

    const loadFields = useCallback(async () => {
        const [visibleTypes, latestMap, todayEntries] = await Promise.all([
            getVisibleMeasurementTypes(visibleIds),
            getLatestMeasurements(visibleIds),
            getMeasurementsForDate(date),
        ]);

        const newFields: MeasurementField[] = visibleTypes.map((type) => {
            const todayEntry = todayEntries.find((m) => m.measurementTypeId === type.id);
            const lastData = latestMap.get(type.id);

            return {
                type,
                currentValue: todayEntry ? todayEntry.value.toString() : '',
                lastValue: lastData && lastData.recordedAt !== date
                    ? lastData.value.toString()
                    : null,
                lastDate: lastData && lastData.recordedAt !== date
                    ? lastData.recordedAt
                    : null,
                measurementId: todayEntry?.id ?? null,
            };
        });

        setFields(newFields);
    }, [visibleIds, date]);

    // --------------------------------------------------------
    // Keyboard handlers
    // --------------------------------------------------------

    const handleFieldPress = (index: number) => {
        Keyboard.dismiss();
        setFocusedIndex(index);
        setKeyboardValue(fields[index].currentValue);
    };

    const handleKeyPress = (key: string) => {
        if (focusedIndex === null) return;
        if (key === '.' && keyboardValue.includes('.')) return;
        if (keyboardValue.length >= 6) return;

        const newValue = keyboardValue + key;
        setKeyboardValue(newValue);
        commitValue(newValue);
    };

    const handleBackspace = () => {
        if (focusedIndex === null || keyboardValue.length === 0) return;
        const newValue = keyboardValue.slice(0, -1);
        setKeyboardValue(newValue);
        commitValue(newValue);
    };

    const handleClear = () => {
        if (focusedIndex === null) return;
        setKeyboardValue('');
        // Don't delete the record, just clear the display
        updateFieldValue(focusedIndex, '');
    };

    const handleAdjust = (delta: number) => {
        if (focusedIndex === null) return;
        const current = parseFloat(keyboardValue) || 0;
        const newValue = Math.max(0, current + delta).toString();
        setKeyboardValue(newValue);
        commitValue(newValue);
    };

    const handleNext = () => {
        if (focusedIndex === null) return;

        // Save current value and move to next field
        const nextIndex = focusedIndex + 1;
        if (nextIndex < fields.length) {
            setFocusedIndex(nextIndex);
            setKeyboardValue(fields[nextIndex].currentValue);
        } else {
            // Last field — hide keyboard
            handleHideKeyboard();
        }
    };

    const handleHideKeyboard = () => {
        setFocusedIndex(null);
        setKeyboardValue('');
    };

    const commitValue = async (value: string) => {
        if (focusedIndex === null) return;

        const field = fields[focusedIndex];
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue <= 0) {
            updateFieldValue(focusedIndex, value);
            return;
        }

        updateFieldValue(focusedIndex, value);

        if (field.measurementId) {
            // Update existing
            await updateMeasurement(field.measurementId, numValue);
        } else {
            // Create new
            const result = await logMeasurement(field.type.id, numValue, date);
            if (result) {
                // Update the field's measurementId for subsequent edits
                setFields((prev) =>
                    prev.map((f, i) =>
                        i === focusedIndex ? { ...f, measurementId: result.id } : f,
                    ),
                );
            }
        }
    };

    const updateFieldValue = (index: number, value: string) => {
        setFields((prev) =>
            prev.map((f, i) => (i === index ? { ...f, currentValue: value } : f)),
        );
    };

    // --------------------------------------------------------
    // Manage visibility
    // --------------------------------------------------------

    const handleToggleVisibility = async (typeId: string) => {
        const newIds = visibleIds.includes(typeId)
            ? visibleIds.filter((id) => id !== typeId)
            : [...visibleIds, typeId];

        setVisibleIds(newIds);
        await updateSettings({ visibleMeasurements: newIds });
    };

    // --------------------------------------------------------
    // Keyboard field type (for WorkoutKeyboard)
    // --------------------------------------------------------

    const getFieldType = () => {
        if (focusedIndex === null || !fields[focusedIndex]) return 'weight' as const;
        const field = fields[focusedIndex];
        // Body Fat % → percentage, everything else → weight-like decimal
        return field.type.unitImperial === '%' ? 'weight' as const : 'weight' as const;
    };

    const getFieldLabel = () => {
        if (focusedIndex === null || !fields[focusedIndex]) return '';
        return fields[focusedIndex].type.name;
    };

    // --------------------------------------------------------
    // Render
    // --------------------------------------------------------

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <SegmentedControl
                tabs={TABS}
                activeTab={activeTab}
                onTabChange={(tab) => {
                    handleHideKeyboard();
                    setActiveTab(tab);
                }}
            />

            <View style={styles.tabContent}>
                {activeTab === 'track' && (
                    <TrackTab
                        date={date}
                        onDateChange={(d) => {
                            handleHideKeyboard();
                            setDate(d);
                        }}
                        fields={fields}
                        focusedIndex={focusedIndex}
                        onFieldPress={handleFieldPress}
                        unitSystem={unitSystem}
                        allTypes={allTypes}
                        visibleIds={visibleIds}
                        onToggleVisibility={handleToggleVisibility}
                    />
                )}
                {activeTab === 'trends' && <TrendsTab />}
                {activeTab === 'gallery' && <GalleryTab />}
            </View>

            {/* Reuse WorkoutKeyboard for metric input */}
            <WorkoutKeyboard
                visible={focusedIndex !== null && activeTab === 'track'}
                currentValue={keyboardValue}
                fieldType={getFieldType()}
                fieldLabel={getFieldLabel()}
                onKeyPress={handleKeyPress}
                onBackspace={handleBackspace}
                onClear={handleClear}
                onAdjust={handleAdjust}
                onNext={handleNext}
                onHide={handleHideKeyboard}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.primary,
    },
    tabContent: {
        flex: 1,
    },
});
