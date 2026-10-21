/**
 * Data and refresh lifecycle for the WorkoutScreen home view.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { Workout } from '../models/workout';
import { Split } from '../models/split';
import {
    getWorkouts,
    getTemplates,
    getActiveSplit,
    getCurrentTemplateIndex,
    setCurrentTemplateIndex,
    getWorkoutDatesThisWeek,
    checkAndAdvanceIfNewDay,
    Template,
} from '../services';

interface HomeData {
    recentWorkouts: Workout[];
    templates: Template[];
    activeSplit: Split | null;
    currentTemplate: Template | null;
    currentTemplateIndex: number;
    workoutDatesThisWeek: Date[];
}

interface UseHomeScreenDataReturn extends HomeData {
    isLoading: boolean;
    refreshing: boolean;
    /** Reload all data */
    loadData: () => Promise<void>;
    /** Pull-to-refresh handler */
    onRefresh: () => Promise<void>;
    /** Change the current schedule position and refresh its template together. */
    handleChangeTemplateIndex: (newIndex: number) => Promise<void>;
}

export function useHomeScreenData(): UseHomeScreenDataReturn {
    const [data, setData] = useState<HomeData>({
        recentWorkouts: [],
        templates: [],
        activeSplit: null,
        currentTemplate: null,
        currentTemplateIndex: 0,
        workoutDatesThisWeek: [],
    });
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const operationQueue = useRef(Promise.resolve());
    const latestRequest = useRef(0);
    const latestRefresh = useRef(0);
    const mounted = useRef(false);

    const refreshData = useCallback((selectedIndex?: number): Promise<void> => {
        const request = ++latestRequest.current;
        // A refresh may advance the saved position. Serialize it with manual
        // selections so an older refresh cannot advance a newly selected day.
        const operation = operationQueue.current.then(async () => {
            try {
                await checkAndAdvanceIfNewDay();
                if (selectedIndex !== undefined) {
                    await setCurrentTemplateIndex(selectedIndex);
                }

                // These reads must follow rollover, never run alongside it.
                const [recentWorkouts, activeSplit, currentTemplateIndex, workoutDatesThisWeek, allTemplates] = await Promise.all([
                    getWorkouts(5),
                    getActiveSplit(),
                    getCurrentTemplateIndex(),
                    getWorkoutDatesThisWeek(),
                    getTemplates(),
                ]);
                const templateMap = new Map(allTemplates.map(template => [template.id, template]));
                const templates = activeSplit
                    ? activeSplit.templateIds.map(id => templateMap.get(id)).filter((template): template is Template => !!template)
                    : allTemplates;
                const scheduleItem = activeSplit?.schedule[currentTemplateIndex];
                const currentTemplate = scheduleItem?.type === 'template'
                    ? templateMap.get(scheduleItem.templateId) ?? null
                    : null;

                // Publish one coherent snapshot. A newer request invalidates
                // this result even while it is waiting for its turn in the queue.
                if (mounted.current && request === latestRequest.current) {
                    setData({ recentWorkouts, activeSplit, currentTemplate, currentTemplateIndex, workoutDatesThisWeek, templates });
                }
            } catch (error) {
                console.error('Error loading home data:', error);
            } finally {
                if (mounted.current && request === latestRequest.current) {
                    setIsLoading(false);
                }
            }
        });
        operationQueue.current = operation;
        return operation;
    }, []);

    const loadData = useCallback(() => refreshData(), [refreshData]);

    const onRefresh = useCallback(async () => {
        const request = ++latestRefresh.current;
        setRefreshing(true);
        await loadData();
        if (mounted.current && request === latestRefresh.current) {
            setRefreshing(false);
        }
    }, [loadData]);

    const handleChangeTemplateIndex = useCallback(
        (newIndex: number) => refreshData(newIndex),
        [refreshData],
    );

    useEffect(() => {
        mounted.current = true;
        void loadData();

        let appState = AppState.currentState;
        let midnightTimer: ReturnType<typeof setTimeout> | undefined;
        const clearMidnightTimer = () => {
            if (midnightTimer !== undefined) clearTimeout(midnightTimer);
            midnightTimer = undefined;
        };
        const scheduleMidnightRefresh = () => {
            clearMidnightTimer();
            const now = new Date();
            const midnight = new Date(now);
            midnight.setHours(24, 0, 0, 0);
            midnightTimer = setTimeout(() => {
                void loadData();
                scheduleMidnightRefresh();
            }, midnight.getTime() - now.getTime());
        };
        if (appState === 'active') scheduleMidnightRefresh();
        const subscription = AppState.addEventListener('change', nextState => {
            if (nextState === 'active' && appState !== 'active') {
                void loadData();
                scheduleMidnightRefresh();
            } else if (nextState !== 'active') {
                clearMidnightTimer();
            }
            appState = nextState;
        });

        return () => {
            mounted.current = false;
            latestRequest.current++;
            clearMidnightTimer();
            subscription.remove();
        };
    }, [loadData]);

    return {
        ...data,
        isLoading,
        refreshing,
        loadData,
        onRefresh,
        handleChangeTemplateIndex,
    };
}
