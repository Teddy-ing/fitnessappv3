/**
 * useWorkoutSettings Hook
 *
 * Manages workout screen settings state (RPE, RIR, Plate Calculator,
 * Previous column, warmup sets, default sets, weight increment,
 * auto timer, rest duration, smart suggestions).
 *
 * Loads from and persists to the user_settings table via preferencesService.
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
    defaultSetsPerExercise: number;
    defaultWeightIncrement: number;
    autoStartRestTimer: boolean;
    defaultRestTime: number;
    smartSuggestions: boolean;
    weightUnit: string;
    settingsMenuVisible: boolean;
}

export function useWorkoutSettings() {
    const [showPrevious, setShowPrevious] = useState(true);
    const [showRpe, setShowRpe] = useState(false);
    const [showRir, setShowRir] = useState(false);
    const [showPlateCalc, setShowPlateCalc] = useState(true);
    const [defaultWarmupSets, setDefaultWarmupSets] = useState(2);
    const [defaultSetsPerExercise, setDefaultSetsPerExercise] = useState(3);
    const [defaultWeightIncrement, setDefaultWeightIncrement] = useState(5);
    const [autoStartRestTimer, setAutoStartRestTimer] = useState(true);
    const [defaultRestTime, setDefaultRestTime] = useState(90);
    const [smartSuggestions, setSmartSuggestions] = useState(false);
    const [weightUnit, setWeightUnit] = useState('lbs');
    const [keepAwakeDuringWorkout, setKeepAwakeDuringWorkout] = useState(true);
    const [settingsMenuVisible, setSettingsMenuVisible] = useState(false);

    // Load settings on mount
    useEffect(() => {
        getSettings().then(settings => {
            setShowPrevious(settings.showPrevious ?? true);
            setShowRpe(settings.showRpe ?? false);
            setShowRir(settings.showRir ?? false);
            setShowPlateCalc(settings.showPlateCalc ?? true);
            setDefaultWarmupSets(settings.defaultWarmupSets ?? 2);
            setDefaultSetsPerExercise(settings.defaultSetsPerExercise ?? 3);
            setDefaultWeightIncrement(settings.defaultWeightIncrement ?? 5);
            setAutoStartRestTimer(settings.autoStartRestTimer ?? true);
            setDefaultRestTime(settings.defaultRestTime ?? 90);
            setSmartSuggestions(settings.smartSuggestions ?? false);
            setWeightUnit(settings.weightUnit ?? 'lbs');
            setKeepAwakeDuringWorkout(settings.keepAwakeDuringWorkout ?? true);
        });
    }, []);

    const handleToggleSetting = async (
        key: 'showPrevious' | 'showRpe' | 'showRir' | 'showPlateCalc' | 'autoStartRestTimer' | 'smartSuggestions',
        value: boolean,
    ) => {
        if (key === 'showPrevious') setShowPrevious(value);
        if (key === 'showRpe') setShowRpe(value);
        if (key === 'showRir') setShowRir(value);
        if (key === 'showPlateCalc') setShowPlateCalc(value);
        if (key === 'autoStartRestTimer') setAutoStartRestTimer(value);
        if (key === 'smartSuggestions') setSmartSuggestions(value);
        await updateSettings({ [key]: value });
    };

    const handleChangeWarmupSets = async (count: number) => {
        setDefaultWarmupSets(count);
        await updateSettings({ defaultWarmupSets: count });
    };

    const handleChangeDefaultSets = async (count: number) => {
        setDefaultSetsPerExercise(count);
        await updateSettings({ defaultSetsPerExercise: count });
    };

    const handleChangeWeightIncrement = async (value: number) => {
        setDefaultWeightIncrement(value);
        await updateSettings({ defaultWeightIncrement: value });
    };

    const handleChangeRestTime = async (seconds: number) => {
        setDefaultRestTime(seconds);
        await updateSettings({ defaultRestTime: seconds });
    };

    return {
        showPrevious,
        showRpe,
        showRir,
        showPlateCalc,
        defaultWarmupSets,
        defaultSetsPerExercise,
        defaultWeightIncrement,
        autoStartRestTimer,
        defaultRestTime,
        smartSuggestions,
        weightUnit,
        keepAwakeDuringWorkout,
        settingsMenuVisible,
        setSettingsMenuVisible,
        handleToggleSetting,
        handleChangeWarmupSets,
        handleChangeDefaultSets,
        handleChangeWeightIncrement,
        handleChangeRestTime,
    };
}
