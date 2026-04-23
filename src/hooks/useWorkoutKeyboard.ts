/**
 * useWorkoutKeyboard Hook
 *
 * Manages the custom numeric keyboard state machine for workout set editing.
 * Extracted from WorkoutScreen to isolate keyboard concern.
 *
 * State flow:
 *   weight+reps:     tap field → keyboard opens → type value → Next → switch to reps → Next → complete set
 *   weight+duration: tap field → keyboard opens → type value → Next → switch to duration → Next → complete set
 *   duration-only:   tap field → keyboard opens → type value → Next → complete set
 *
 * Dependencies: reads activeWorkout from store, calls updateSet/completeSet.
 *
 * Performance: All callbacks use the ref-sync pattern (useCallback + useRef)
 * to produce stable function references. This prevents downstream memo
 * invalidation in the FlatList render chain on every keystroke.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Keyboard } from 'react-native';
import { useWorkoutStore } from '../stores';
import { FocusState, KeyboardFieldType } from '../components';
import { getWeightUnitSync } from '../hooks/useWeightUnit';
import { convertWeight, toCanonicalWeight } from '../utils/unitConversion';

type FieldType = 'weight' | 'reps' | 'duration';

// ============================================================
// Pure helpers — no closure dependencies, safe for useCallback
// ============================================================

/** Read the current display value for a field from the set model */
function getFieldValue(set: any, field: FieldType): string {
    switch (field) {
        case 'weight': return set?.weight?.toString() ?? '';
        case 'reps': return set?.reps?.toString() ?? '';
        case 'duration': return set?.duration?.toString() ?? '';
    }
}

/** Build the partial update object for a given field.
 *  For weight fields, converts from display unit → canonical (lbs) before storing. */
function buildUpdate(field: FieldType, value: number | null): Record<string, number | null> {
    switch (field) {
        case 'weight': {
            const canonical = value != null
                ? toCanonicalWeight(value, getWeightUnitSync())
                : null;
            return { weight: canonical };
        }
        case 'reps': return { reps: value != null ? Math.floor(value) : null };
        case 'duration': return { duration: value != null ? Math.floor(value) : null };
    }
}

// ============================================================
// Hook
// ============================================================

interface UseWorkoutKeyboardReturn {
    /** Current focus (which exercise/set/field is active), null when keyboard is hidden */
    focusState: FocusState | null;
    /** Current display value in the keyboard */
    keyboardValue: string;
    /** Called when a set field is tapped */
    handleFocusField: (exerciseId: string, setId: string, field: FieldType) => void;
    /** Called when a digit or '.' key is pressed */
    handleKeyPress: (key: string) => void;
    /** Delete last character */
    handleBackspace: () => void;
    /** Clear the entire value */
    handleClear: () => void;
    /** Increment or decrement by delta */
    handleAdjust: (delta: number) => void;
    /** Advance from weight→reps/duration or reps/duration→complete */
    handleNext: () => void;
    /** Dismiss keyboard */
    handleHideKeyboard: () => void;
    /** Get the current field type for keyboard styling */
    getKeyboardFieldType: () => KeyboardFieldType;
    /** Get a human-readable label for the current field */
    getFieldLabel: () => string;
}

export function useWorkoutKeyboard(): UseWorkoutKeyboardReturn {
    // PP-002 fix: Fine-grained selector — only subscribe to activeWorkout.
    // Actions are stable references; access via getState() to avoid full-store subscription.
    const activeWorkout = useWorkoutStore(s => s.activeWorkout);
    const { updateSet, completeSet } = useWorkoutStore.getState();

    const [focusState, setFocusState] = useState<FocusState | null>(null);
    const [keyboardValue, setKeyboardValue] = useState('');

    // ============================================================
    // Ref-sync pattern: keep refs in sync with state so that
    // useCallback handlers can read current values without
    // listing them as dependencies. This produces STABLE function
    // references that never change, preventing downstream
    // React.memo invalidation in the FlatList exercise list.
    // ============================================================
    const activeWorkoutRef = useRef(activeWorkout);
    activeWorkoutRef.current = activeWorkout;

    const focusStateRef = useRef(focusState);
    focusStateRef.current = focusState;

    const keyboardValueRef = useRef(keyboardValue);
    keyboardValueRef.current = keyboardValue;

    // Hide system keyboard when our custom keyboard is active
    useEffect(() => {
        if (focusState) {
            Keyboard.dismiss();
        }
    }, [focusState]);

    // Reset keyboard state when the workout changes (finish/discard/start new)
    const prevWorkoutId = useRef(activeWorkout?.id);
    useEffect(() => {
        if (activeWorkout?.id !== prevWorkoutId.current) {
            setFocusState(null);
            setKeyboardValue('');
            prevWorkoutId.current = activeWorkout?.id;
        }
    }, [activeWorkout?.id]);

    // ============================================================
    // Stable callbacks (empty deps — read current values from refs)
    // ============================================================

    const handleFocusField = useCallback((exerciseId: string, setId: string, field: FieldType) => {
        const workout = activeWorkoutRef.current;
        if (!workout) return;

        const exercise = workout.main.exercises.find(e => e.id === exerciseId);
        const set = exercise?.sets.find(s => s.id === setId);

        // For weight fields, convert from canonical (lbs) → display unit
        let currentValue: string;
        if (field === 'weight' && set?.weight != null) {
            const displayVal = convertWeight(set.weight, getWeightUnitSync());
            // Round to 1 decimal to avoid floating point noise
            const rounded = Math.round(displayVal * 10) / 10;
            currentValue = rounded.toString();
        } else {
            currentValue = getFieldValue(set, field);
        }

        setFocusState({ exerciseId, setId, field });
        setKeyboardValue(currentValue);
    }, []);

    const handleKeyPress = useCallback((key: string) => {
        const focus = focusStateRef.current;
        const value = keyboardValueRef.current;
        if (!focus) return;

        // Prevent multiple decimals
        if (key === '.' && value.includes('.')) return;

        // Prevent decimals for integer fields (reps, duration)
        if (key === '.' && (focus.field === 'reps' || focus.field === 'duration')) return;

        // Limit length
        if (value.length >= 6) return;

        const newValue = value + key;
        setKeyboardValue(newValue);

        // Update the set
        const numValue = parseFloat(newValue);
        if (!isNaN(numValue)) {
            updateSet(focus.exerciseId, focus.setId, buildUpdate(focus.field, numValue));
        }
    }, [updateSet]);

    const handleBackspace = useCallback(() => {
        const focus = focusStateRef.current;
        const value = keyboardValueRef.current;
        if (!focus || value.length === 0) return;

        const newValue = value.slice(0, -1);
        setKeyboardValue(newValue);

        const numValue = newValue.length > 0 ? parseFloat(newValue) : null;
        const safeValue = numValue != null && !isNaN(numValue) ? numValue : null;
        updateSet(focus.exerciseId, focus.setId, buildUpdate(focus.field, safeValue));
    }, [updateSet]);

    const handleClear = useCallback(() => {
        const focus = focusStateRef.current;
        if (!focus) return;

        setKeyboardValue('');
        updateSet(focus.exerciseId, focus.setId, buildUpdate(focus.field, null));
    }, [updateSet]);

    const handleAdjust = useCallback((delta: number) => {
        const focus = focusStateRef.current;
        const workout = activeWorkoutRef.current;
        if (!focus || !workout) return;

        const exercise = workout.main.exercises.find(e => e.id === focus.exerciseId);
        const set = exercise?.sets.find(s => s.id === focus.setId);

        let currentVal: number;
        if (focus.field === 'weight') {
            // Read canonical value and convert to display unit for adjustment
            const canonical = set?.weight ?? 0;
            currentVal = convertWeight(canonical, getWeightUnitSync());
        } else {
            switch (focus.field) {
                case 'reps': currentVal = set?.reps ?? 0; break;
                case 'duration': currentVal = set?.duration ?? 0; break;
            }
        }

        const newVal = Math.max(0, Math.round((currentVal + delta) * 10) / 10);
        updateSet(focus.exerciseId, focus.setId, buildUpdate(focus.field, newVal));
        setKeyboardValue(newVal.toString());
    }, [updateSet]);

    const handleNext = useCallback(() => {
        const focus = focusStateRef.current;
        const workout = activeWorkoutRef.current;
        if (!focus || !workout) return;

        const exercise = workout.main.exercises.find(e => e.id === focus.exerciseId);
        if (!exercise) return;

        const set = exercise.sets.find(s => s.id === focus.setId);
        const ex = exercise.exercise;

        if (focus.field === 'weight') {
            // Weight → next trackable field (reps or duration)
            if (ex.trackReps) {
                setFocusState({ ...focus, field: 'reps' });
                setKeyboardValue(set?.reps?.toString() ?? '');
            } else if (ex.trackTime) {
                setFocusState({ ...focus, field: 'duration' });
                setKeyboardValue(set?.duration?.toString() ?? '');
            } else {
                // Weight-only exercise — complete
                completeSet(focus.exerciseId, focus.setId);
                setFocusState(null);
                setKeyboardValue('');
            }
        } else {
            // reps or duration → complete the set
            completeSet(focus.exerciseId, focus.setId);
            setFocusState(null);
            setKeyboardValue('');
        }
    }, [completeSet]);

    const handleHideKeyboard = useCallback(() => {
        setFocusState(null);
        setKeyboardValue('');
    }, []);

    // ============================================================
    // Display helpers — called during render, NOT passed as props
    // to FlatList items. These intentionally read from state (not
    // refs) so they return current values for the keyboard display.
    // ============================================================

    const getKeyboardFieldType = (): KeyboardFieldType => {
        if (!focusState) return 'reps';
        switch (focusState.field) {
            case 'weight': return 'weight';
            case 'duration': return 'duration';
            default: return 'reps';
        }
    };

    const getFieldLabel = (): string => {
        if (!focusState || !activeWorkout) return '';

        const exercise = activeWorkout.main.exercises.find(e => e.id === focusState.exerciseId);
        if (!exercise) return '';

        const setIndex = exercise.sets.findIndex(s => s.id === focusState.setId);
        const setNum = setIndex + 1;

        const fieldNames: Record<FieldType, string> = {
            weight: 'Weight',
            reps: 'Reps',
            duration: 'Duration',
        };

        return `${exercise.exercise.name} - Set ${setNum} ${fieldNames[focusState.field]}`;
    };

    return {
        focusState,
        keyboardValue,
        handleFocusField,
        handleKeyPress,
        handleBackspace,
        handleClear,
        handleAdjust,
        handleNext,
        handleHideKeyboard,
        getKeyboardFieldType,
        getFieldLabel,
    };
}
