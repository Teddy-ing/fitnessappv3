/**
 * useWorkoutSettings Hook
 *
 * Manages workout screen settings state (RPE, RIR, Plate Calculator,
 * Previous column, warmup sets, default sets, weight increment,
 * auto timer, rest duration, smart suggestions).
 *
 * Loads from and persists to the user_settings table via preferencesService.
 * Also provides live-apply callbacks that propagate default/warmup set
 * changes to unstarted exercises in the active workout.
 *
 * Extracted from WorkoutScreen to satisfy guardrail #4
 * (3+ useState for one concern → extract to hook).
 */

import { useState, useEffect, useCallback } from 'react';
import { getSettings, updateSettings } from '../../services';
import { useWeightUnit } from '../useWeightUnit';
import { useWorkoutStore } from '../../stores';
import { createSet } from '../../models/workout';

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
    const [showProgressionNudges, setShowProgressionNudges] = useState(false);
    const [prefillPrevious, setPrefillPrevious] = useState(true);
    const weightUnit = useWeightUnit();
    const [keepAwakeDuringWorkout, setKeepAwakeDuringWorkout] = useState(true);
    const [settingsMenuVisible, setSettingsMenuVisible] = useState(false);

    // Load/refresh settings from DB
    const refreshSettings = useCallback(async () => {
        const settings = await getSettings();
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
        setShowProgressionNudges(settings.showProgressionNudges ?? false);
        setPrefillPrevious(settings.prefillPrevious ?? true);
        // weightUnit is managed by useWeightUnit() subscriber — no local state needed
        setKeepAwakeDuringWorkout(settings.keepAwakeDuringWorkout ?? true);
    }, []);

    // Load settings on mount
    useEffect(() => {
        refreshSettings();
    }, [refreshSettings]);

    const handleToggleSetting = async (
        key: 'showPrevious' | 'showRpe' | 'showRir' | 'showPlateCalc' | 'autoStartRestTimer' | 'smartSuggestions' | 'showProgressionNudges' | 'prefillPrevious',
        value: boolean,
    ) => {
        if (key === 'showPrevious') setShowPrevious(value);
        if (key === 'showRpe') setShowRpe(value);
        if (key === 'showRir') setShowRir(value);
        if (key === 'showPlateCalc') setShowPlateCalc(value);
        if (key === 'autoStartRestTimer') setAutoStartRestTimer(value);
        if (key === 'smartSuggestions') setSmartSuggestions(value);
        if (key === 'showProgressionNudges') setShowProgressionNudges(value);
        if (key === 'prefillPrevious') setPrefillPrevious(value);
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

    // ------------------------------------------------
    // Live-apply: propagate set count changes to unstarted exercises
    // in the active workout (TD-038 — extracted from WorkoutScreen)
    // ------------------------------------------------

    /** True if an exercise has zero completed/in-progress sets */
    const isExerciseUnstarted = useCallback((ex: { sets: Array<{ status: string }> }) =>
        ex.sets.every(s => s.status === 'pending'),
    []);

    const handleChangeDefaultSetsLive = useCallback((count: number) => {
        handleChangeDefaultSets(count);

        // Apply to unstarted exercises in the current workout
        const workout = useWorkoutStore.getState().activeWorkout;
        if (!workout) return;

        const updated = workout.main.exercises.map(ex => {
            if (!isExerciseUnstarted(ex)) return ex;
            const workingSets = ex.sets.filter(s => s.type === 'working');
            const otherSets = ex.sets.filter(s => s.type !== 'working');
            const currentCount = workingSets.length;

            if (count === currentCount) return ex;

            let newWorkingSets;
            if (count > currentCount) {
                // Add sets
                const toAdd = Array.from({ length: count - currentCount }, (_, i) =>
                    createSet(otherSets.length + currentCount + i, 'working')
                );
                newWorkingSets = [...workingSets, ...toAdd];
            } else {
                // Remove from the end
                newWorkingSets = workingSets.slice(0, count);
            }

            const allSets = [...otherSets, ...newWorkingSets].map((s, idx) => ({
                ...s, orderIndex: idx,
            }));
            return { ...ex, sets: allSets };
        });

        useWorkoutStore.setState({
            activeWorkout: {
                ...workout,
                main: { ...workout.main, exercises: updated },
                updatedAt: new Date(),
            },
        });
    }, [handleChangeDefaultSets, isExerciseUnstarted]);

    const handleChangeWarmupSetsLive = useCallback((count: number) => {
        handleChangeWarmupSets(count);

        // Apply to unstarted exercises in the current workout
        const workout = useWorkoutStore.getState().activeWorkout;
        if (!workout) return;

        const updated = workout.main.exercises.map(ex => {
            if (!isExerciseUnstarted(ex)) return ex;
            const warmups = ex.sets.filter(s => s.type === 'warmup');
            const nonWarmups = ex.sets.filter(s => s.type !== 'warmup');
            const currentCount = warmups.length;

            if (count === currentCount) return ex;

            let newWarmups;
            if (count > currentCount) {
                const toAdd = Array.from({ length: count - currentCount }, (_, i) =>
                    createSet(currentCount + i, 'warmup')
                );
                newWarmups = [...warmups, ...toAdd];
            } else {
                newWarmups = warmups.slice(0, count);
            }

            // Warmups first, then non-warmups, reindex
            const allSets = [...newWarmups, ...nonWarmups].map((s, idx) => ({
                ...s, orderIndex: idx,
            }));
            return { ...ex, sets: allSets };
        });

        useWorkoutStore.setState({
            activeWorkout: {
                ...workout,
                main: { ...workout.main, exercises: updated },
                updatedAt: new Date(),
            },
        });
    }, [handleChangeWarmupSets, isExerciseUnstarted]);

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
        showProgressionNudges,
        prefillPrevious,
        weightUnit,
        keepAwakeDuringWorkout,
        settingsMenuVisible,
        setSettingsMenuVisible,
        handleToggleSetting,
        handleChangeWarmupSets: handleChangeWarmupSetsLive,
        handleChangeDefaultSets: handleChangeDefaultSetsLive,
        handleChangeWeightIncrement,
        handleChangeRestTime,
        refreshSettings,
    };
}
