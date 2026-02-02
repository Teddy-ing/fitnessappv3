/**
 * User Models
 * 
 * User preferences and settings.
 * All stored locally - no account required.
 */

import { Equipment, MuscleGroup } from './exercise';

/**
 * Weight units
 */
export type WeightUnit = 'kg' | 'lbs';

/**
 * Distance units
 */
export type DistanceUnit = 'km' | 'mi';

/**
 * Experience level for onboarding personalization
 */
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

/**
 * What the user is primarily interested in tracking
 */
export type TrackingFocus = 'strength' | 'mobility' | 'cardio' | 'all';

/**
 * Theme preference
 */
export type ThemeMode = 'dark' | 'light' | 'system';

/**
 * User preferences for UI and behavior
 */
export interface UserPreferences {
    // Units
    weightUnit: WeightUnit;
    distanceUnit: DistanceUnit;

    // Onboarding responses
    experienceLevel: ExperienceLevel;
    trackingFocus: TrackingFocus;
    availableEquipment: Equipment[];

    // UI preferences
    theme: ThemeMode;
    showExerciseImages: boolean;      // Veterans may want to hide
    showExerciseInstructions: boolean;
    compactSetView: boolean;          // Denser set display

    // Rest timer
    defaultRestTime: number;          // Seconds
    autoStartRestTimer: boolean;
    restTimerSound: boolean;
    restTimerVibration: boolean;

    // Logging behavior
    autoAddWarmupSet: boolean;
    defaultSetsPerExercise: number;
    rememberLastWeight: boolean;

    // RPE/RIR tracking
    showRpe: boolean;
    showRir: boolean;

    // ML features
    enableSmartSuggestions: boolean;
    enableWorkoutPredictions: boolean;

    // Data
    hasCompletedOnboarding: boolean;
}

/**
 * User statistics (computed from workout history)
 */
export interface UserStats {
    totalWorkouts: number;
    totalVolume: number;           // Total weight ever lifted
    totalDuration: number;         // Total minutes trained
    currentStreak: number;         // Consecutive days/weeks
    longestStreak: number;

    // Personal records by exercise
    personalRecords: Map<string, PersonalRecord[]>;

    // Muscle group distribution
    muscleGroupVolume: Map<MuscleGroup, number>;

    // Last updated
    lastCalculatedAt: Date;
}

/**
 * A personal record entry
 */
export interface PersonalRecord {
    id: string;
    exerciseId: string;
    workoutId: string;

    // The record
    weight: number;
    reps: number;
    estimated1RM: number | null;

    // When it happened
    achievedAt: Date;

    // Is this still the current PR?
    isCurrent: boolean;
}

/**
 * User profile (minimal, stored locally)
 */
export interface User {
    id: string;

    // Optional display name
    name: string | null;

    // Preferences
    preferences: UserPreferences;

    // Stats
    stats: UserStats;

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Default user preferences
 */
export function getDefaultPreferences(): UserPreferences {
    return {
        // Units (default to lbs for US-centric)
        weightUnit: 'lbs',
        distanceUnit: 'mi',

        // Onboarding (defaults before completion)
        experienceLevel: 'intermediate',
        trackingFocus: 'all',
        availableEquipment: [],

        // UI
        theme: 'dark',
        showExerciseImages: true,
        showExerciseInstructions: true,
        compactSetView: false,

        // Rest timer
        defaultRestTime: 90,
        autoStartRestTimer: true,
        restTimerSound: true,
        restTimerVibration: true,

        // Logging
        autoAddWarmupSet: true,
        defaultSetsPerExercise: 3,
        rememberLastWeight: true,

        // RPE/RIR
        showRpe: false,
        showRir: false,

        // ML
        enableSmartSuggestions: true,
        enableWorkoutPredictions: true,

        // Onboarding
        hasCompletedOnboarding: false,
    };
}

/**
 * Default user stats
 */
export function getDefaultStats(): UserStats {
    return {
        totalWorkouts: 0,
        totalVolume: 0,
        totalDuration: 0,
        currentStreak: 0,
        longestStreak: 0,
        personalRecords: new Map(),
        muscleGroupVolume: new Map(),
        lastCalculatedAt: new Date(),
    };
}

/**
 * Create a new user
 */
export function createUser(): User {
    const now = new Date();
    // Note: Using random ID since Crypto.randomUUID() requires async
    // In practice, user is created once and stored
    const id = `user_${now.getTime()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
        id,
        name: null,
        preferences: getDefaultPreferences(),
        stats: getDefaultStats(),
        createdAt: now,
        updatedAt: now,
    };
}
