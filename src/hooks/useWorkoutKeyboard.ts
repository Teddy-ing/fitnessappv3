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
 */

import { useState, useEffect, useRef } from 'react';
import { Keyboard } from 'react-native';
import { useWorkoutStore } from '../stores';
import { FocusState, KeyboardFieldType } from '../components';
import { getWeightUnitSync } from '../hooks/useWeightUnit';
import { convertWeight, toCanonicalWeight } from '../utils/unitConversion';

type FieldType = 'weight' | 'reps' | 'duration';

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

    /** Read the current value for a field from the set model */
    const getFieldValue = (set: any, field: FieldType): string => {
        switch (field) {
            case 'weight': return set?.weight?.toString() ?? '';
            case 'reps': return set?.reps?.toString() ?? '';
            case 'duration': return set?.duration?.toString() ?? '';
        }
    };

    /** Build the partial update object for a given field.
     *  For weight fields, converts from display unit → canonical (lbs) before storing. */
    const buildUpdate = (field: FieldType, value: number | null): Record<string, number | null> => {
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
    };

    const handleFocusField = (exerciseId: string, setId: string, field: FieldType) => {
        if (!activeWorkout) return;

        const exercise = activeWorkout.main.exercises.find(e => e.id === exerciseId);
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
    };

    const handleKeyPress = (key: string) => {
        if (!focusState) return;

        // Prevent multiple decimals
        if (key === '.' && keyboardValue.includes('.')) return;

        // Prevent decimals for integer fields (reps, duration)
        if (key === '.' && (focusState.field === 'reps' || focusState.field === 'duration')) return;

        // Limit length
        if (keyboardValue.length >= 6) return;

        const newValue = keyboardValue + key;
        setKeyboardValue(newValue);

        // Update the set
        const numValue = parseFloat(newValue);
        if (!isNaN(numValue)) {
            updateSet(focusState.exerciseId, focusState.setId, buildUpdate(focusState.field, numValue));
        }
    };

    const handleBackspace = () => {
        if (!focusState || keyboardValue.length === 0) return;

        const newValue = keyboardValue.slice(0, -1);
        setKeyboardValue(newValue);

        const numValue = newValue.length > 0 ? parseFloat(newValue) : null;
        const safeValue = numValue && !isNaN(numValue) ? numValue : null;
        updateSet(focusState.exerciseId, focusState.setId, buildUpdate(focusState.field, safeValue));
    };

    const handleClear = () => {
        if (!focusState) return;

        setKeyboardValue('');
        updateSet(focusState.exerciseId, focusState.setId, buildUpdate(focusState.field, null));
    };

    const handleAdjust = (delta: number) => {
        if (!focusState || !activeWorkout) return;

        const exercise = activeWorkout.main.exercises.find(e => e.id === focusState.exerciseId);
        const set = exercise?.sets.find(s => s.id === focusState.setId);

        let currentVal: number;
        if (focusState.field === 'weight') {
            // Read canonical value and convert to display unit for adjustment
            const canonical = set?.weight ?? 0;
            currentVal = convertWeight(canonical, getWeightUnitSync());
        } else {
            switch (focusState.field) {
                case 'reps': currentVal = set?.reps ?? 0; break;
                case 'duration': currentVal = set?.duration ?? 0; break;
            }
        }

        const newVal = Math.max(0, Math.round((currentVal + delta) * 10) / 10);
        updateSet(focusState.exerciseId, focusState.setId, buildUpdate(focusState.field, newVal));
        setKeyboardValue(newVal.toString());
    };

    const handleNext = () => {
        if (!focusState || !activeWorkout) return;

        const exercise = activeWorkout.main.exercises.find(e => e.id === focusState.exerciseId);
        if (!exercise) return;

        const set = exercise.sets.find(s => s.id === focusState.setId);
        const ex = exercise.exercise;

        if (focusState.field === 'weight') {
            // Weight → next trackable field (reps or duration)
            if (ex.trackReps) {
                setFocusState({ ...focusState, field: 'reps' });
                setKeyboardValue(set?.reps?.toString() ?? '');
            } else if (ex.trackTime) {
                setFocusState({ ...focusState, field: 'duration' });
                setKeyboardValue(set?.duration?.toString() ?? '');
            } else {
                // Weight-only exercise — complete
                completeSet(focusState.exerciseId, focusState.setId);
                setFocusState(null);
                setKeyboardValue('');
            }
        } else {
            // reps or duration → complete the set
            completeSet(focusState.exerciseId, focusState.setId);
            setFocusState(null);
            setKeyboardValue('');
        }
    };

    const handleHideKeyboard = () => {
        setFocusState(null);
        setKeyboardValue('');
    };

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
