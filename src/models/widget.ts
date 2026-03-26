/**
 * Widget Model
 *
 * Canonical types for the modular widget system on the Profile screen.
 * Widgets are configurable data cards that surface key metrics at a glance.
 */

// ============================================================
// Core types
// ============================================================

/** Widget type identifiers — extensible for Phase 3B */
export type WidgetType =
    | 'streak_badge'
    | 'weekly_wrapup'
    | 'bodyweight_sparkline'
    | 'goal_progress'
    | 'muscle_pie'
    | 'pinned_exercise'
    | 'workload_readiness';

/** Widget sizes following the modular grid system */
export type WidgetSize = 'square' | 'rectangle';

/** Persisted widget instance configuration */
export interface WidgetConfig {
    /** Unique instance ID (user can have multiples of same type for pinned_exercise) */
    id: string;
    /** Widget type identifier */
    type: WidgetType;
    /** Display size */
    size: WidgetSize;
    /** Exercise ID — for pinned_exercise widgets */
    exerciseId?: string;
    /** Exercise name — for pinned_exercise display */
    exerciseName?: string;
    /** Metric selection — '1rm' | 'volume' for pinned_exercise */
    metric?: string;
}

// ============================================================
// Widget catalog (metadata for editor picker)
// ============================================================

export interface WidgetCatalogEntry {
    type: WidgetType;
    label: string;
    description: string;
    defaultSize: WidgetSize;
    icon: string; // MaterialIcons name
    /** Whether multiples of this widget are allowed */
    allowMultiple: boolean;
    /** Phase availability — false means not yet implemented */
    available: boolean;
}

export const WIDGET_CATALOG: WidgetCatalogEntry[] = [
    {
        type: 'streak_badge',
        label: 'Streak Badge',
        description: 'Current workout week streak with fire icon',
        defaultSize: 'square',
        icon: 'local-fire-department',
        allowMultiple: false,
        available: true,
    },
    {
        type: 'weekly_wrapup',
        label: 'Weekly Wrap-Up',
        description: 'This week\'s volume, sets, reps, and time',
        defaultSize: 'square',
        icon: 'dashboard',
        allowMultiple: false,
        available: true,
    },
    {
        type: 'bodyweight_sparkline',
        label: 'Bodyweight Trend',
        description: '30-day bodyweight trend sparkline',
        defaultSize: 'rectangle',
        icon: 'monitor-weight',
        allowMultiple: false,
        available: true,
    },
    {
        type: 'goal_progress',
        label: 'Goal Progress',
        description: 'Circular progress ring for your top active goal',
        defaultSize: 'square',
        icon: 'flag',
        allowMultiple: false,
        available: true,
    },
    {
        type: 'muscle_pie',
        label: 'Muscle Balance',
        description: 'Donut chart of volume by muscle group',
        defaultSize: 'square',
        icon: 'pie-chart',
        allowMultiple: false,
        available: true,
    },
    {
        type: 'pinned_exercise',
        label: 'Pinned Exercise',
        description: 'Line chart for a specific exercise\'s 1RM or volume',
        defaultSize: 'rectangle',
        icon: 'show-chart',
        allowMultiple: true,
        available: true,
    },
    {
        type: 'workload_readiness',
        label: 'Workload / Readiness',
        description: 'Acute vs chronic workload ratio with trend arrow',
        defaultSize: 'square',
        icon: 'speed',
        allowMultiple: false,
        available: true,
    },
];

// ============================================================
// Defaults
// ============================================================

/** Maximum number of widgets allowed on the profile */
export const MAX_WIDGETS = 6;

/** Default widget configuration for new users */
export const DEFAULT_WIDGETS: WidgetConfig[] = [
    { id: 'default-streak', type: 'streak_badge', size: 'square' },
    { id: 'default-weekly', type: 'weekly_wrapup', size: 'square' },
    { id: 'default-bodyweight', type: 'bodyweight_sparkline', size: 'rectangle' },
];
