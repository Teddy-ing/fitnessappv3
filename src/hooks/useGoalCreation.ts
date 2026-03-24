/**
 * useGoalCreation Hook
 *
 * Multi-step wizard state management for the goal creation flow.
 * Steps: Type → Target → Value → Deadline → Label → Confirm
 *
 * Manages navigation between steps, form data, validation,
 * and submission via the goalService.
 */

import { useState, useCallback } from 'react';
import type { GoalType } from '../models/goal';
import type { Exercise } from '../models/exercise';
import type { MeasurementType } from '../models/measurement';
import { createGoal, getCurrentBestForTarget } from '../services';

// ============================================================
// Types
// ============================================================

export type CreationStep =
    | 'type'           // Step 1: Exercise vs Measurement
    | 'exercise'       // Step 2a: Pick exercise
    | 'exercise_metric'// Step 2b: Pick metric (1RM / Volume / Reps)
    | 'measurement'    // Step 2a: Pick measurement type
    | 'target'         // Step 3: Set target value
    | 'deadline'       // Step 4: Set deadline (optional)
    | 'label'          // Step 5: Custom label (optional)
    | 'confirm';       // Step 6: Review + create

export type GoalCategory = 'exercise' | 'measurement' | 'consistency';

export type ExerciseMetric = 'exercise_1rm' | 'exercise_volume' | 'exercise_reps';

export interface GoalCreationState {
    step: CreationStep;
    category: GoalCategory | null;
    exercise: Exercise | null;
    exerciseMetric: ExerciseMetric | null;
    measurementType: MeasurementType | null;
    targetValue: string;
    currentBest: number | null;
    deadline: string | null;
    label: string;
    isSubmitting: boolean;
}

export interface UseGoalCreation {
    state: GoalCreationState;
    // Step navigation
    goBack: () => void;
    goToStep: (step: CreationStep) => void;
    canGoBack: boolean;
    // Step 1: Type selection
    selectCategory: (category: GoalCategory) => void;
    // Step 2: Target selection
    selectExercise: (exercise: Exercise) => void;
    selectExerciseMetric: (metric: ExerciseMetric) => void;
    selectMeasurementType: (type: MeasurementType) => void;
    // Step 3: Target value
    setTargetValue: (value: string) => void;
    confirmTarget: () => void;
    // Step 4: Deadline
    setDeadline: (deadline: string | null) => void;
    confirmDeadline: () => void;
    // Step 5: Label
    setLabel: (label: string) => void;
    confirmLabel: () => void;
    // Step 6: Submit
    submit: () => Promise<boolean>;
    // Reset
    reset: () => void;
    // Pre-fill for quick-add chips
    prefill: (params: PrefillParams) => void;
}

export interface PrefillParams {
    category: GoalCategory;
    exerciseMetric?: ExerciseMetric;
    targetValue?: string;
    /** Seed exercise name to search for (e.g., 'Barbell Bench Press') */
    exerciseName?: string;
}

// ============================================================
// Initial state
// ============================================================

const INITIAL_STATE: GoalCreationState = {
    step: 'type',
    category: null,
    exercise: null,
    exerciseMetric: null,
    measurementType: null,
    targetValue: '',
    currentBest: null,
    deadline: null,
    label: '',
    isSubmitting: false,
};

// ============================================================
// Hook
// ============================================================

export function useGoalCreation(): UseGoalCreation {
    const [state, setState] = useState<GoalCreationState>({ ...INITIAL_STATE });

    // ----------------------------------------------------------
    // Step navigation
    // ----------------------------------------------------------

    const goBack = useCallback(() => {
        setState((prev) => {
            switch (prev.step) {
                case 'type':
                    return prev; // Can't go back from first step
                case 'exercise':
                    return { ...prev, step: 'type', category: null };
                case 'exercise_metric':
                    return { ...prev, step: 'exercise', exercise: null };
                case 'measurement':
                    return { ...prev, step: 'type', category: null };
                case 'target':
                    if (prev.category === 'exercise') {
                        return { ...prev, step: 'exercise_metric', exerciseMetric: null, currentBest: null };
                    }
                    if (prev.category === 'measurement') {
                        return { ...prev, step: 'measurement', measurementType: null, currentBest: null };
                    }
                    // consistency
                    return { ...prev, step: 'type', category: null, currentBest: null };
                case 'deadline':
                    return { ...prev, step: 'target', targetValue: '' };
                case 'label':
                    return { ...prev, step: 'deadline', deadline: null };
                case 'confirm':
                    return { ...prev, step: 'label' };
                default:
                    return prev;
            }
        });
    }, []);

    const canGoBack = state.step !== 'type';

    /** Navigate to any previously visited step (only backward navigation allowed). */
    const goToStep = useCallback((targetStep: CreationStep) => {
        const STEP_ORDER: CreationStep[] = ['type', 'exercise', 'exercise_metric', 'measurement', 'target', 'deadline', 'label', 'confirm'];
        const currentIdx = STEP_ORDER.indexOf(state.step);
        const targetIdx = STEP_ORDER.indexOf(targetStep);
        // Only allow navigating backward
        if (targetIdx < currentIdx) {
            setState((prev) => ({ ...prev, step: targetStep }));
        }
    }, [state.step]);

    // ----------------------------------------------------------
    // Step 1: Type selection
    // ----------------------------------------------------------

    const selectCategory = useCallback((category: GoalCategory) => {
        setState((prev) => {
            if (category === 'exercise') {
                return { ...prev, category, step: 'exercise' };
            }
            if (category === 'measurement') {
                return { ...prev, category, step: 'measurement' };
            }
            // consistency — skip straight to target
            return { ...prev, category, step: 'target' };
        });
    }, []);

    // ----------------------------------------------------------
    // Step 2: Target selection
    // ----------------------------------------------------------

    const selectExercise = useCallback((exercise: Exercise) => {
        setState((prev) => ({
            ...prev,
            exercise,
            step: 'exercise_metric',
        }));
    }, []);

    const selectExerciseMetric = useCallback(async (metric: ExerciseMetric) => {
        // Capture exerciseId before setState to avoid stale closure
        let exerciseId: string | undefined;
        setState((prev) => {
            exerciseId = prev.exercise?.id ?? undefined;
            return {
                ...prev,
                exerciseMetric: metric,
                step: 'target',
            };
        });

        // Fetch current best in background using the captured ID
        if (exerciseId) {
            const best = await getCurrentBestForTarget(metric, exerciseId);
            setState((prev) => ({ ...prev, currentBest: best }));
        }
    }, []);

    const selectMeasurementType = useCallback(async (type: MeasurementType) => {
        setState((prev) => ({
            ...prev,
            measurementType: type,
            step: 'target',
        }));

        // Fetch current best
        const best = await getCurrentBestForTarget('measurement', undefined, type.id);
        setState((prev) => ({ ...prev, currentBest: best }));
    }, []);

    // ----------------------------------------------------------
    // Step 3: Target value
    // ----------------------------------------------------------

    const setTargetValue = useCallback((value: string) => {
        setState((prev) => ({ ...prev, targetValue: value }));
    }, []);

    const confirmTarget = useCallback(() => {
        const numValue = parseFloat(state.targetValue);
        if (isNaN(numValue) || numValue <= 0) return;
        setState((prev) => ({ ...prev, step: 'deadline' }));
    }, [state.targetValue]);

    // ----------------------------------------------------------
    // Step 4: Deadline
    // ----------------------------------------------------------

    const setDeadline = useCallback((deadline: string | null) => {
        setState((prev) => ({ ...prev, deadline }));
    }, []);

    const confirmDeadline = useCallback(() => {
        setState((prev) => ({ ...prev, step: 'label' }));
    }, []);

    // ----------------------------------------------------------
    // Step 5: Label
    // ----------------------------------------------------------

    const setLabel = useCallback((label: string) => {
        setState((prev) => ({ ...prev, label }));
    }, []);

    const confirmLabel = useCallback(() => {
        setState((prev) => ({ ...prev, step: 'confirm' }));
    }, []);

    // ----------------------------------------------------------
    // Submit
    // ----------------------------------------------------------

    const submit = useCallback(async (): Promise<boolean> => {
        setState((prev) => ({ ...prev, isSubmitting: true }));

        try {
            // Determine goal type
            let goalType: GoalType;
            if (state.category === 'consistency') {
                goalType = 'consistency';
            } else if (state.category === 'measurement') {
                goalType = 'measurement';
            } else {
                goalType = state.exerciseMetric!;
            }

            const result = await createGoal({
                goalType,
                exerciseId: state.exercise?.id,
                measurementTypeId: state.measurementType?.id,
                targetValue: parseFloat(state.targetValue),
                startingValue: state.currentBest ?? undefined,
                deadline: state.deadline ?? undefined,
                label: state.label.trim() || undefined,
            });

            if (result) {
                setState({ ...INITIAL_STATE });
                return true;
            }
            return false;
        } catch (error) {
            console.error('[useGoalCreation] Submit failed:', error);
            return false;
        } finally {
            setState((prev) => ({ ...prev, isSubmitting: false }));
        }
    }, [state]);

    // ----------------------------------------------------------
    // Reset
    // ----------------------------------------------------------

    const reset = useCallback(() => {
        setState({ ...INITIAL_STATE });
    }, []);

    /**
     * Pre-fill the wizard for quick-add chips.
     * Sets category/metric/target and jumps to the appropriate next step.
     */
    const prefill = useCallback((params: PrefillParams) => {
        const { category, exerciseMetric, targetValue } = params;

        if (category === 'consistency') {
            // Consistency: jump to target with value pre-filled
            setState({
                ...INITIAL_STATE,
                category: 'consistency',
                step: targetValue ? 'target' : 'target',
                targetValue: targetValue ?? '',
            });
        } else if (category === 'exercise') {
            // Exercise: open exercise picker, user still needs to pick exercise
            setState({
                ...INITIAL_STATE,
                category: 'exercise',
                step: 'exercise',
                exerciseMetric: exerciseMetric ?? null,
            });
        } else {
            // Measurement: open measurement picker
            setState({
                ...INITIAL_STATE,
                category: 'measurement',
                step: 'measurement',
            });
        }
    }, []);

    return {
        state,
        goBack,
        goToStep,
        canGoBack,
        selectCategory,
        selectExercise,
        selectExerciseMetric,
        selectMeasurementType,
        setTargetValue,
        confirmTarget,
        setDeadline,
        confirmDeadline,
        setLabel,
        confirmLabel,
        submit,
        reset,
        prefill,
    };
}
