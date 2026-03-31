/**
 * useWorkoutSettings Hook
 *
 * Manages workout screen settings state (RPE, RIR, Plate Calculator,
 * Previous column, warmup sets). Loads from and persists to the
 * user_settings table via preferencesService.
 *
 * Extracted from WorkoutScreen to satisfy guardrail #4
 * (3+ useState for one concern → extract to hook).
 */

import { useState, useEffect } from 'react';
import { getSettings, updateSettings } from '../../services';

export interface WorkoutSettings {
    showPrevious: boolean;
    showRpe: boolean;
    showRir: boolean;
    showPlateCalc: boolean;
    defaultWarmupSets: number;
    settingsMenuVisible: boolean;
}

export function useWorkoutSettings() {
    const [showPrevious, setShowPrevious] = useState(true);
    const [showRpe, setShowRpe] = useState(false);
    const [showRir, setShowRir] = useState(false);
    const [showPlateCalc, setShowPlateCalc] = useState(true);
    const [defaultWarmupSets, setDefaultWarmupSets] = useState(2);
    const [settingsMenuVisible, setSettingsMenuVisible] = useState(false);

    // Load settings on mount
    useEffect(() => {
        getSettings().then(settings => {
            setShowPrevious(settings.showPrevious ?? true);
            setShowRpe(settings.showRpe ?? false);
            setShowRir(settings.showRir ?? false);
            setShowPlateCalc(settings.showPlateCalc ?? true);
            setDefaultWarmupSets(settings.defaultWarmupSets ?? 2);
        });
    }, []);

    const handleToggleSetting = async (
        key: 'showPrevious' | 'showRpe' | 'showRir' | 'showPlateCalc',
        value: boolean,
    ) => {
        if (key === 'showPrevious') setShowPrevious(value);
        if (key === 'showRpe') setShowRpe(value);
        if (key === 'showRir') setShowRir(value);
        if (key === 'showPlateCalc') setShowPlateCalc(value);
        await updateSettings({ [key]: value });
    };

    const handleChangeWarmupSets = async (count: number) => {
        setDefaultWarmupSets(count);
        await updateSettings({ defaultWarmupSets: count });
    };

    return {
        showPrevious,
        showRpe,
        showRir,
        showPlateCalc,
        defaultWarmupSets,
        settingsMenuVisible,
        setSettingsMenuVisible,
        handleToggleSetting,
        handleChangeWarmupSets,
    };
}
