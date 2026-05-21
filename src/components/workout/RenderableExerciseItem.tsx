/**
 * RenderableExerciseItem Component
 *
 * FlatList renderItem for the workout exercise list (PP-044).
 * Renders either a SupersetGroup or a standalone ExerciseCard
 * depending on the pre-processed item type.
 *
 * Extracted from WorkoutScreen to satisfy the 600-line guardrail.
 */

import React from 'react';
import { WorkoutExercise, WorkoutSet } from '../../models/workout';
import { PreviousSetData } from '../../models/workout';
import type { ExerciseSuggestion } from '../../models/smartSuggestions';
import { FocusState } from '../ExerciseCard';
import { ExerciseCard, ErrorBoundary } from '../../components';
import SupersetGroup from './SupersetGroup';

/** Pre-processed exercise list item for FlatList virtualization */
export type RenderableItem =
    | { type: 'standalone'; exercise: WorkoutExercise; index: number; id: string }
    | { type: 'superset'; exercises: WorkoutExercise[]; startIndex: number; groupId: string; id: string };

interface RenderableExerciseItemProps {
    item: RenderableItem;
    totalExercises: number;
    focusState: FocusState | null;
    collapsedExercises: Set<string>;
    showPrevious: boolean;
    showRpe: boolean;
    showRir: boolean;
    showSwipeHint: boolean;
    defaultWarmupSets: number;
    previousSets: Map<string, PreviousSetData[]>;
    exerciseSuggestions: Map<string, ExerciseSuggestion>;

    // Stable action refs (from getState() or useState setters)
    onUpdateSet: (exerciseId: string, setId: string, updates: Partial<WorkoutSet>) => void;
    onCompleteSet: (exerciseId: string, setId: string) => void;
    onAddSet: (exerciseId: string) => void;
    onRemoveSet: (exerciseId: string, setId: string) => void;
    onRemoveExercise: (exerciseId: string) => void;
    onToggleSuperset: (exerciseId: string) => void;
    onFocusField: (exerciseId: string, setId: string, field: 'weight' | 'reps' | 'duration') => void;
    onUpdateNote: (exerciseId: string, note: string | null) => void;
    onAddWarmupSets: (exerciseId: string, count: number) => void;
    onReplaceExercise: (exerciseId: string) => void;
    onToggleCollapse: (exerciseId: string) => void;
    onRpeRirSelected?: () => void;
    showProgressionNudges?: boolean;
    prefillPrevious?: boolean;
}

function RenderableExerciseItemInner({
    item,
    totalExercises,
    focusState,
    collapsedExercises,
    showPrevious,
    showRpe,
    showRir,
    showSwipeHint,
    defaultWarmupSets,
    previousSets,
    exerciseSuggestions,
    onUpdateSet,
    onCompleteSet,
    onAddSet,
    onRemoveSet,
    onRemoveExercise,
    onToggleSuperset,
    onFocusField,
    onUpdateNote,
    onAddWarmupSets,
    onReplaceExercise,
    onToggleCollapse,
    onRpeRirSelected,
    showProgressionNudges,
    prefillPrevious,
}: RenderableExerciseItemProps) {
    if (item.type === 'superset') {
        return (
            <SupersetGroup
                exercises={item.exercises}
                totalExercises={totalExercises}
                startIndex={item.startIndex}
                focusState={focusState}
                collapsedExercises={collapsedExercises}
                showPrevious={showPrevious}
                showRpe={showRpe}
                showRir={showRir}
                previousSets={previousSets}
                defaultWarmupSets={defaultWarmupSets}
                onUpdateSet={onUpdateSet}
                onCompleteSet={onCompleteSet}
                onAddSet={onAddSet}
                onRemoveSet={onRemoveSet}
                onRemoveExercise={onRemoveExercise}
                onToggleSuperset={onToggleSuperset}
                onFocusField={onFocusField}
                onUpdateNote={onUpdateNote}
                onAddWarmupSets={onAddWarmupSets}
                onReplaceExercise={onReplaceExercise}
                onToggleCollapse={onToggleCollapse}
                onRpeRirSelected={onRpeRirSelected}
                exerciseSuggestions={exerciseSuggestions}
                showProgressionNudges={showProgressionNudges}
                prefillPrevious={prefillPrevious}
            />
        );
    }

    // Standalone exercise
    const { exercise: workoutExercise, index } = item;
    const canSuperset = index < totalExercises - 1;
    const exId = workoutExercise.id;

    return (
        <ErrorBoundary
            fallback="card"
            label={workoutExercise.exercise.name}
        >
            <ExerciseCard
                workoutExercise={workoutExercise}
                focusState={focusState}
                isInSuperset={false}
                isFirstInSuperset={false}
                isLastInSuperset={false}
                canSuperset={canSuperset}
                exerciseId={exId}
                isCollapsed={collapsedExercises.has(exId)}
                showSwipeHint={showSwipeHint && index === 0}
                showPrevious={showPrevious}
                showRpe={showRpe}
                showRir={showRir}
                defaultWarmupSets={defaultWarmupSets}
                previousSets={previousSets.get(workoutExercise.exerciseId)}
                onUpdateSet={onUpdateSet}
                onCompleteSet={onCompleteSet}
                onAddSet={onAddSet}
                onRemoveSet={onRemoveSet}
                onRemoveExercise={onRemoveExercise}
                onToggleSuperset={onToggleSuperset}
                onFocusField={onFocusField}
                onUpdateNote={onUpdateNote}
                onAddWarmupSets={onAddWarmupSets}
                onReplaceExercise={onReplaceExercise}
                onToggleCollapse={onToggleCollapse}
                onRpeRirSelected={onRpeRirSelected}
                exerciseSuggestion={exerciseSuggestions.get(workoutExercise.exerciseId) ?? null}
                showProgressionNudges={showProgressionNudges}
                prefillPrevious={prefillPrevious}
            />
        </ErrorBoundary>
    );
}

export default React.memo(RenderableExerciseItemInner);
