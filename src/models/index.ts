/**
 * Core Data Models for Workout App
 * 
 * Design principles:
 * - Support warmup/main/cooldown workout sections
 * - Allow multiple muscle groups per exercise (weighted)
 * - Support different set types (warmup, working, drop, failure)
 * - Enable import/export (CSV, JSON)
 * - Prepare for on-device ML features
 */

// Re-export all models
export * from './exercise';
export * from './workout';
export * from './template';
export * from './user';
export * from './split';
export * from './analytics';
export * from './measurement';
export * from './goal';
export * from './preferences';
export * from './calendar';
export * from './widget';
export * from './muscleGroups';
export * from './exerciseDetails';
export * from './smartSuggestions';
