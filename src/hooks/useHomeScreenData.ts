/**
 * useHomeScreenData Hook
 *
 * Manages all data fetching and data state for the WorkoutScreen home view.
 * Extracted from WorkoutScreen to isolate data concerns from UI logic.
 *
 * Owns: recentWorkouts, templates, activeSplit, currentTemplate,
 *       currentTemplateIndex, workoutDatesThisWeek, isLoading, refreshing
 */

import { useState, useEffect, useCallback } from 'react';
import { Workout } from '../models/workout';
import { Split } from '../models/split';
import {
    getWorkouts,
    getTemplates,
    getActiveSplit,
    getCurrentTemplate,
    getCurrentTemplateIndex,
    setCurrentTemplateIndex,
    getWorkoutDatesThisWeek,
    getTemplatesForSplit,
    checkAndAdvanceIfNewDay,
    Template,
} from '../services';

interface UseHomeScreenDataReturn {
    recentWorkouts: Workout[];
    templates: Template[];
    activeSplit: Split | null;
    currentTemplate: Template | null;
    currentTemplateIndex: number;
    workoutDatesThisWeek: Date[];
    isLoading: boolean;
    refreshing: boolean;
    /** Reload all data */
    loadData: () => Promise<void>;
    /** Pull-to-refresh handler */
    onRefresh: () => Promise<void>;
    /** Change the current template index in split */
    handleChangeTemplateIndex: (newIndex: number) => Promise<void>;
    /** Direct state setters needed by parent for edge cases */
    setActiveSplit: (split: Split | null) => void;
    setCurrentTemplateIndexState: (index: number) => void;
}

export function useHomeScreenData(): UseHomeScreenDataReturn {
    const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeSplit, setActiveSplit] = useState<Split | null>(null);
    const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null);
    const [currentTemplateIndex, setCurrentTemplateIndexState] = useState(0);
    const [workoutDatesThisWeek, setWorkoutDatesThisWeek] = useState<Date[]>([]);

    const loadData = async () => {
        try {
            // Check if we should advance template (new day after workout)
            await checkAndAdvanceIfNewDay();

            const [workouts, active, currentIdx, weekDates] = await Promise.all([
                getWorkouts(5),
                getActiveSplit(),
                getCurrentTemplateIndex(),
                getWorkoutDatesThisWeek(),
            ]);
            setRecentWorkouts(workouts);
            setActiveSplit(active);
            setCurrentTemplateIndexState(currentIdx);
            setWorkoutDatesThisWeek(weekDates);

            // Load templates based on active split
            if (active) {
                const splitTemplates = await getTemplatesForSplit(active.id);
                setTemplates(splitTemplates);

                // Get current template from split schedule
                const nextTemplate = await getCurrentTemplate();
                setCurrentTemplate(nextTemplate);
            } else {
                const allTemplates = await getTemplates();
                setTemplates(allTemplates);
                setCurrentTemplate(null);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, []);

    const handleChangeTemplateIndex = async (newIndex: number) => {
        try {
            await setCurrentTemplateIndex(newIndex);
            setCurrentTemplateIndexState(newIndex);

            // Reload current template
            const nextTemplate = await getCurrentTemplate();
            setCurrentTemplate(nextTemplate);
        } catch (error) {
            console.error('Error changing template index:', error);
        }
    };

    // Load data on mount
    useEffect(() => {
        loadData();
    }, []);

    return {
        recentWorkouts,
        templates,
        activeSplit,
        currentTemplate,
        currentTemplateIndex,
        workoutDatesThisWeek,
        isLoading,
        refreshing,
        loadData,
        onRefresh,
        handleChangeTemplateIndex,
        setActiveSplit,
        setCurrentTemplateIndexState,
    };
}
