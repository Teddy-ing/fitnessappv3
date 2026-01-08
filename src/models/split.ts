/**
 * Split Model
 * 
 * A Split groups multiple Templates together into a training program.
 * Example: "Push Pull Legs" split contains Push, Pull, and Legs templates.
 */

/**
 * A single item in a split schedule (template or rest day)
 */
export type SplitScheduleItem =
    | { type: 'template'; templateId: string }
    | { type: 'rest' };

/**
 * A workout split containing multiple templates
 */
export interface Split {
    id: string;
    name: string;
    description: string | null;
    templateIds: string[];         // Ordered list of template IDs (legacy, for backward compat)
    schedule: SplitScheduleItem[]; // New: schedule items including rest days
    isBuiltIn: boolean;            // Pre-generated splits shipped with app
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Helper to create a new split
 */
export function createSplit(name: string, templateIds: string[] = [], schedule?: SplitScheduleItem[]): Split {
    const now = new Date();
    // If no schedule provided, generate from templateIds
    const finalSchedule = schedule ?? templateIds.map(id => ({ type: 'template' as const, templateId: id }));

    return {
        id: `split_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        description: null,
        templateIds,
        schedule: finalSchedule,
        isBuiltIn: false,
        createdAt: now,
        updatedAt: now,
    };
}

/**
 * Built-in split definitions
 */
export const BUILT_IN_SPLITS = [
    {
        id: 'ppl',
        name: 'Push Pull Legs',
        description: 'Classic 3-day split targeting push, pull, and leg movements',
        templateNames: ['Push', 'Pull', 'Legs'],
    },
    {
        id: 'upper_lower',
        name: 'Upper/Lower',
        description: '4-day split alternating upper and lower body',
        templateNames: ['Upper A', 'Lower A', 'Upper B', 'Lower B'],
    },
    {
        id: 'full_body',
        name: 'Full Body',
        description: '3-day full body workout program',
        templateNames: ['Full Body A', 'Full Body B', 'Full Body C'],
    },
    {
        id: 'bro_split',
        name: 'Bro Split',
        description: '5-day bodybuilding split targeting one muscle group per day',
        templateNames: ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs'],
    },
];
