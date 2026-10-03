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
    isFavorite: boolean;           // User-favorited for priority sorting
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
        isFavorite: false,
        createdAt: now,
        updatedAt: now,
    };
}
