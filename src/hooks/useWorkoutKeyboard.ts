/**
 * useWorkoutKeyboard Hook
 *
 * Manages the custom numeric keyboard state machine for workout set editing.
 * Extracted from WorkoutScreen to isolate keyboard concern.
 *
 * State flow: tap field → keyboard opens → type value → Next → switch to reps → Next → complete set
 *
 * Dependencies: reads activeWorkout from store, calls updateSet/completeSet.
 */

import { useState, useEffect, useRef } from 'react';
import { Keyboard } from 'react-native';
import { useWorkoutStore } from '../stores';
import { FocusState, KeyboardFieldType } from '../components';

interface UseWorkoutKeyboardReturn {
    /** Current focus (which exercise/set/field is active), null when keyboard is hidden */
    focusState: FocusState | null;
    /** Current display value in the keyboard */
    keyboardValue: string;
    /** Called when a set field is tapped */
    handleFocusField: (exerciseId: string, setId: string, field: 'weight' | 'reps') => void;
    /** Called when a digit or '.' key is pressed */
    handleKeyPress: (key: string) => void;
    /** Delete last character */
    handleBackspace: () => void;
    /** Clear the entire value */
    handleClear: () => void;
    /** Increment or decrement by delta */
    handleAdjust: (delta: number) => void;
    /** Advance from weight→reps or reps→complete */
    handleNext: () => void;
    /** Dismiss keyboard */
    handleHideKeyboard: () => void;
    /** Get the current field type for keyboard styling */
    getKeyboardFieldType: () => KeyboardFieldType;
    /** Get a human-readable label for the current field */
    getFieldLabel: () => string;
}

export function useWorkoutKeyboard(): UseWorkoutKeyboardReturn {
    const {
        activeWorkout,
        updateSet,
        completeSet,
    } = useWorkoutStore();

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

    const handleFocusField = (exerciseId: string, setId: string, field: 'weight' | 'reps') => {
        if (!activeWorkout) return;

        const exercise = activeWorkout.main.exercises.find(e => e.id === exerciseId);
        const set = exercise?.sets.find(s => s.id === setId);

        let currentValue = '';
        if (field === 'weight') {
            currentValue = set?.weight?.toString() ?? '';
        } else if (field === 'reps') {
            currentValue = set?.reps?.toString() ?? '';
        }

        setFocusState({ exerciseId, setId, field });
        setKeyboardValue(currentValue);
    };

    const handleKeyPress = (key: string) => {
        if (!focusState) return;

        // Prevent multiple decimals
        if (key === '.' && keyboardValue.includes('.')) return;

        // Limit length
        if (keyboardValue.length >= 6) return;

        const newValue = keyboardValue + key;
        setKeyboardValue(newValue);

        // Update the set
        const numValue = parseFloat(newValue);
        if (!isNaN(numValue)) {
            if (focusState.field === 'weight') {
                updateSet(focusState.exerciseId, focusState.setId, { weight: numValue });
            } else {
                updateSet(focusState.exerciseId, focusState.setId, { reps: Math.floor(numValue) });
            }
        }
    };

    const handleBackspace = () => {
        if (!focusState || keyboardValue.length === 0) return;

        const newValue = keyboardValue.slice(0, -1);
        setKeyboardValue(newValue);

        const numValue = newValue.length > 0 ? parseFloat(newValue) : null;
        if (focusState.field === 'weight') {
            updateSet(focusState.exerciseId, focusState.setId, { weight: numValue && !isNaN(numValue) ? numValue : null });
        } else {
            updateSet(focusState.exerciseId, focusState.setId, { reps: numValue && !isNaN(numValue) ? Math.floor(numValue) : null });
        }
    };

    const handleClear = () => {
        if (!focusState) return;

        setKeyboardValue('');
        if (focusState.field === 'weight') {
            updateSet(focusState.exerciseId, focusState.setId, { weight: null });
        } else {
            updateSet(focusState.exerciseId, focusState.setId, { reps: null });
        }
    };

    const handleAdjust = (delta: number) => {
        if (!focusState || !activeWorkout) return;

        const exercise = activeWorkout.main.exercises.find(e => e.id === focusState.exerciseId);
        const set = exercise?.sets.find(s => s.id === focusState.setId);

        if (focusState.field === 'weight') {
            const currentWeight = set?.weight ?? 0;
            const newWeight = Math.max(0, currentWeight + delta);
            updateSet(focusState.exerciseId, focusState.setId, { weight: newWeight });
            setKeyboardValue(newWeight.toString());
        } else {
            const currentReps = set?.reps ?? 0;
            const newReps = Math.max(0, currentReps + delta);
            updateSet(focusState.exerciseId, focusState.setId, { reps: newReps });
            setKeyboardValue(newReps.toString());
        }
    };

    const handleNext = () => {
        if (!focusState || !activeWorkout) return;

        const exercise = activeWorkout.main.exercises.find(e => e.id === focusState.exerciseId);
        if (!exercise) return;

        if (focusState.field === 'weight') {
            // Move to reps
            const set = exercise.sets.find(s => s.id === focusState.setId);
            const repsValue = set?.reps?.toString() ?? '';
            setFocusState({ ...focusState, field: 'reps' });
            setKeyboardValue(repsValue);
        } else {
            // Complete the set and hide keyboard
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
        return focusState?.field === 'weight' ? 'weight' : 'reps';
    };

    const getFieldLabel = (): string => {
        if (!focusState || !activeWorkout) return '';

        const exercise = activeWorkout.main.exercises.find(e => e.id === focusState.exerciseId);
        if (!exercise) return '';

        const setIndex = exercise.sets.findIndex(s => s.id === focusState.setId);
        const setNum = setIndex + 1;

        return `${exercise.exercise.name} - Set ${setNum} ${focusState.field === 'weight' ? 'Weight' : 'Reps'}`;
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
