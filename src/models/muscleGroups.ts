/**
 * Muscle Group Taxonomy
 *
 * Centralized source of truth for muscle group metadata.
 * Replaces hardcoded mappings that were duplicated across:
 * - ExerciseListView (composite filter pills)
 * - ExercisePicker (individual muscle filter pills)
 * - AddExerciseScreen (muscle group chips)
 * - MuscleDistributionChart (display labels)
 *
 * TD-005 resolution: any change to the MuscleGroup type only
 * needs to be reflected here — all consumers derive from this.
 */

import type { MuscleGroup } from './exercise';

// ============================================================
// Display Labels
// ============================================================

/**
 * Pretty-print mapping from DB muscle group key → display label.
 * Covers every value in the MuscleGroup union type.
 */
export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
    chest: 'Chest',
    back: 'Back',
    shoulders: 'Shoulders',
    biceps: 'Biceps',
    triceps: 'Triceps',
    forearms: 'Forearms',
    core: 'Core',
    quads: 'Quads',
    hamstrings: 'Hamstrings',
    glutes: 'Glutes',
    calves: 'Calves',
    traps: 'Traps',
    lats: 'Lats',
    neck: 'Neck',
    hip_flexors: 'Hip Flexors',
    adductors: 'Adductors',
    abductors: 'Abductors',
    full_body: 'Full Body',
};

// ============================================================
// Individual Muscle Filters (for ExercisePicker)
// ============================================================

/**
 * Individual muscle group filter pills.
 * Used by the ExercisePicker where each pill filters by a single
 * DB muscle group value.
 */
export const INDIVIDUAL_MUSCLE_FILTERS: { key: MuscleGroup; label: string }[] = [
    { key: 'chest', label: 'Chest' },
    { key: 'back', label: 'Back' },
    { key: 'shoulders', label: 'Shoulders' },
    { key: 'biceps', label: 'Biceps' },
    { key: 'triceps', label: 'Triceps' },
    { key: 'quads', label: 'Quads' },
    { key: 'hamstrings', label: 'Hamstrings' },
    { key: 'glutes', label: 'Glutes' },
    { key: 'core', label: 'Core' },
    { key: 'calves', label: 'Calves' },
];

// ============================================================
// Composite Filter Pills (for Analytics ExerciseListView)
// ============================================================

/**
 * Composite filter pills that map user-friendly labels to one or
 * more DB MuscleGroup values. "Legs" → quads + hamstrings + glutes + calves.
 *
 * The 'recent' filter is special — it returns all exercises
 * sorted by most recently performed (no muscle filter applied).
 */
export interface CompositeFilterPill {
    key: string;
    label: string;
    /** DB muscle groups to query. undefined = no muscle filter (show all). */
    muscleGroups?: MuscleGroup[];
}

export const COMPOSITE_FILTER_PILLS: CompositeFilterPill[] = [
    { key: 'recent', label: 'Recent', muscleGroups: undefined },
    { key: 'chest', label: 'Chest', muscleGroups: ['chest'] },
    { key: 'back', label: 'Back', muscleGroups: ['back', 'lats', 'traps'] },
    { key: 'legs', label: 'Legs', muscleGroups: ['quads', 'hamstrings', 'glutes', 'calves'] },
    { key: 'shoulders', label: 'Shoulders', muscleGroups: ['shoulders'] },
    { key: 'arms', label: 'Arms', muscleGroups: ['biceps', 'triceps', 'forearms'] },
    { key: 'core', label: 'Core', muscleGroups: ['core'] },
];

// ============================================================
// Full Muscle Group List (for AddExerciseScreen)
// ============================================================

/**
 * Complete selectable muscle group list for exercise creation/editing.
 * Omits obscure groups (neck, hip_flexors, adductors, abductors)
 * to keep the UI clean — users rarely need these for custom exercises.
 */
export const ALL_MUSCLE_GROUPS: { value: MuscleGroup; label: string }[] = [
    { value: 'chest', label: 'Chest' },
    { value: 'back', label: 'Back' },
    { value: 'shoulders', label: 'Shoulders' },
    { value: 'biceps', label: 'Biceps' },
    { value: 'triceps', label: 'Triceps' },
    { value: 'forearms', label: 'Forearms' },
    { value: 'core', label: 'Core' },
    { value: 'quads', label: 'Quads' },
    { value: 'hamstrings', label: 'Hamstrings' },
    { value: 'glutes', label: 'Glutes' },
    { value: 'calves', label: 'Calves' },
    { value: 'traps', label: 'Traps' },
    { value: 'lats', label: 'Lats' },
    { value: 'full_body', label: 'Full Body' },
];
