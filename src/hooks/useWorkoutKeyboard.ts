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
    handleFocusField: (exerciseId: string, setId: string, field: 'weight' | 'reps' | 'duration') => void;
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

    const handleFocusField = (exerciseId: string, setId: string, field: 'weight' | 'reps' | 'duration') => {
        if (!activeWorkout) return;

        const exercise = activeWorkout.main.exercises.find(e => e.id === exerciseId);
        const set = exercise?.sets.find(s => s.id === setId);

        let currentValue = '';
        if (field === 'weight') {
            currentValue = set?.weight?.toString() ?? '';
        } else if (field === 'reps') {
            currentValue = set?.reps?.toString() ?? '';
        } else if (field === 'duration') {
            currentValue = set?.duration?.toString() ?? '';
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
            } else if (focusState.field === 'reps') {
                updateSet(focusState.exerciseId, focusState.setId, { reps: Math.floor(numValue) });
            } else if (focusState.field === 'duration') {
                updateSet(focusState.exerciseId, focusState.setId, { duration: Math.floor(numValue) });
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
        } else if (focusState.field === 'reps') {
            updateSet(focusState.exerciseId, focusState.setId, { reps: numValue && !isNaN(numValue) ? Math.floor(numValue) : null });
        } else if (focusState.field === 'duration') {
            updateSet(focusState.exerciseId, focusState.setId, { duration: numValue && !isNaN(numValue) ? Math.floor(numValue) : null });
        }
    };

    const handleClear = () => {
        if (!focusState) return;

        setKeyboardValue('');
        if (focusState.field === 'weight') {
            updateSet(focusState.exerciseId, focusState.setId, { weight: null });
        } else if (focusState.field === 'reps') {
            updateSet(focusState.exerciseId, focusState.setId, { reps: null });
        } else if (focusState.field === 'duration') {
            updateSet(focusState.exerciseId, focusState.setId, { duration: null });
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
        } else if (focusState.field === 'reps') {
            const currentReps = set?.reps ?? 0;
            const newReps = Math.max(0, currentReps + delta);
            updateSet(focusState.exerciseId, focusState.setId, { reps: newReps });
            setKeyboardValue(newReps.toString());
        } else if (focusState.field === 'duration') {
            const currentDuration = set?.duration ?? 0;
            const newDuration = Math.max(0, currentDuration + delta);
            updateSet(focusState.exerciseId, focusState.setId, { duration: newDuration });
            setKeyboardValue(newDuration.toString());
        }
    };

    const handleNext = () => {
        if (!focusState || !activeWorkout) return;

        const exercise = activeWorkout.main.exercises.find(e => e.id === focusState.exerciseId);
        if (!exercise) return;

        if (focusState.field === 'weight') {
            // Move to reps or duration depending, but normally weight goes to reps.
            const set = exercise.sets.find(s => s.id === focusState.setId);
            const nextField = exercise.exercise.trackReps ? 'reps' : 'duration';
            const nextValue = nextField === 'reps' ? (set?.reps?.toString() ?? '') : (set?.duration?.toString() ?? '');
            setFocusState({ ...focusState, field: nextField });
            setKeyboardValue(nextValue);
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
        return focusState?.field === 'weight' ? 'weight' : (focusState?.field === 'duration' ? 'duration' : 'reps');
    };

    const getFieldLabel = (): string => {
        if (!focusState || !activeWorkout) return '';

        const exercise = activeWorkout.main.exercises.find(e => e.id === focusState.exerciseId);
        if (!exercise) return '';

        const setIndex = exercise.sets.findIndex(s => s.id === focusState.setId);
        const setNum = setIndex + 1;

        let fieldLabel = 'Reps';
        if (focusState.field === 'weight') fieldLabel = 'Weight';
        if (focusState.field === 'duration') fieldLabel = 'Duration';

        return `${exercise.exercise.name} - Set ${setNum} ${fieldLabel}`;
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
