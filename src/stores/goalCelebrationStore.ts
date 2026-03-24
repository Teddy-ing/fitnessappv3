/**
 * Goal Celebration Store
 *
 * Tiny Zustand store that bridges service-layer goal completion events
 * to the UI. The service pushes completed goals here, and
 * GoalCelebrationOverlay reads from it to show toasts.
 */

import { create } from 'zustand';
import type { Goal } from '../models/goal';

interface GoalCelebrationState {
    /** Queue of goals to celebrate (FIFO) */
    queue: Goal[];
    /** Push one or more completed goals into the queue */
    celebrate: (goals: Goal[]) => void;
    /** Remove the front item after it's been shown */
    dismiss: () => void;
}

export const useGoalCelebrationStore = create<GoalCelebrationState>((set) => ({
    queue: [],
    celebrate: (goals) =>
        set((state) => ({
            queue: [...state.queue, ...goals],
        })),
    dismiss: () =>
        set((state) => ({
            queue: state.queue.slice(1),
        })),
}));
