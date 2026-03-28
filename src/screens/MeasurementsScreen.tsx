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
 *
 * Sub-components:
 * - SegmentedControl — pill tab selector
 * - TrackTab — date selector, metric input rows, manage modal
 * - TrendsTab — sparkline list + detail chart view
 * - GalleryTab — photo grid + viewer + compare
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    StyleSheet,
    Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';

import { colors } from '../theme';
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
import { useGoalCelebrationStore } from '../stores/goalCelebrationStore';
import type { MeasurementType } from '../models';

import SegmentedControl from '../components/measurements/SegmentedControl';
import TrackTab, { MeasurementField, getTodayStr } from '../components/measurements/TrackTab';
import TrendsTab from '../components/measurements/TrendsTab';
import GalleryTab from '../components/measurements/GalleryTab';
import type { ProfileStackParamList } from '../navigation/AppNavigator';

// ============================================================
// Constants
// ============================================================

type TabId = 'track' | 'trends' | 'gallery';

const TABS: { id: TabId; label: string }[] = [
    { id: 'track', label: 'Track' },
    { id: 'trends', label: 'Trends' },
    { id: 'gallery', label: 'Gallery' },
];

// ============================================================
// Main Screen
// ============================================================

export default function MeasurementsScreen() {
    const route = useRoute<RouteProp<ProfileStackParamList, 'Measurements'>>();
    const [activeTab, setActiveTab] = useState<TabId>(
        route.params?.initialTab ?? 'track',
    );

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
                // Trigger goal celebration if any goals were completed
                if (result.completedGoals.length > 0) {
                    useGoalCelebrationStore.getState().celebrate(result.completedGoals);
                }
                // Update the field's measurementId for subsequent edits
                setFields((prev) =>
                    prev.map((f, i) =>
                        i === focusedIndex ? { ...f, measurementId: result.measurement.id } : f,
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
        // All measurement fields are decimal-capable (weight, body fat %, etc.)
        return 'weight' as const;
    };

    const getFieldUnit = () => {
        if (focusedIndex === null || !fields[focusedIndex]) return 'lbs';
        const field = fields[focusedIndex];
        return field.type.unitImperial || 'lbs';
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
                {activeTab === 'trends' && <TrendsTab autoSelectTypeId={route.params?.autoSelectTypeId} />}
                {activeTab === 'gallery' && <GalleryTab />}
            </View>

            {/* Reuse WorkoutKeyboard for metric input */}
            <WorkoutKeyboard
                visible={focusedIndex !== null && activeTab === 'track'}
                currentValue={keyboardValue}
                fieldType={getFieldType()}
                fieldLabel={getFieldLabel()}
                unitLabel={getFieldUnit()}
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
