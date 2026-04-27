/**
 * Exercise Mapper
 *
 * Fuzzy-matches competitor exercise names to the app's exercise database.
 * Uses a three-tier matching strategy:
 * 1. Exact match (case-insensitive)
 * 2. Fuzzy match (normalized substring + Levenshtein distance)
 * 3. No match (user decides)
 */

import { getExercises } from '../exerciseService';
import { Exercise } from '../../models/exercise';
import type { ExerciseMapping, ParsedExercise } from './types';

// ============================================================
// Levenshtein Distance (no external dependency)
// ============================================================

/**
 * Compute the Levenshtein edit distance between two strings.
 * O(n*m) time and O(min(n,m)) space.
 */
function levenshtein(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    // Ensure a is the shorter string for space optimization
    if (a.length > b.length) [a, b] = [b, a];

    let prev = Array.from({ length: a.length + 1 }, (_, i) => i);
    let curr = new Array<number>(a.length + 1);

    for (let j = 1; j <= b.length; j++) {
        curr[0] = j;
        for (let i = 1; i <= a.length; i++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            curr[i] = Math.min(
                prev[i] + 1,      // deletion
                curr[i - 1] + 1,  // insertion
                prev[i - 1] + cost // substitution
            );
        }
        [prev, curr] = [curr, prev];
    }

    return prev[a.length];
}

// ============================================================
// Name Normalization
// ============================================================

/**
 * Strip common equipment suffixes that competitor apps add.
 * "Bench Press (Barbell)" → "Bench Press"
 * "Arnold Press (Dumbbell)" → "Arnold Press"
 */
function stripEquipmentSuffix(name: string): string {
    return name.replace(/\s*\((?:Barbell|Dumbbell|Cable|Machine|Smith Machine|Kettlebell|Bodyweight|EZ Bar|Band|Other)\)\s*$/i, '').trim();
}

/** Normalize a name for comparison: lowercase, strip equipment, trim whitespace */
function normalizeName(name: string): string {
    return stripEquipmentSuffix(name).toLowerCase().trim();
}

// ============================================================
// Matching Logic
// ============================================================

/**
 * Compute a similarity score (0–100) between two exercise names.
 * Combines substring matching and Levenshtein distance.
 */
function computeSimilarity(parsedName: string, dbName: string): number {
    const a = normalizeName(parsedName);
    const b = dbName.toLowerCase().trim();

    // Exact match after normalization
    if (a === b) return 100;

    // One is a substring of the other
    if (a.includes(b) || b.includes(a)) {
        const shorter = Math.min(a.length, b.length);
        const longer = Math.max(a.length, b.length);
        // Scale by how much of the longer string is covered
        return Math.round((shorter / longer) * 95);
    }

    // Levenshtein distance, scaled to 0–100
    const distance = levenshtein(a, b);
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 100;

    const similarity = Math.round((1 - distance / maxLen) * 100);
    return Math.max(0, similarity);
}

/**
 * Find the best match for a parsed exercise name against the exercise DB.
 */
function findBestMatch(
    parsedName: string,
    exercises: Exercise[],
): { exercise: Exercise; confidence: number } | null {
    let bestMatch: Exercise | null = null;
    let bestScore = 0;

    for (const ex of exercises) {
        const score = computeSimilarity(parsedName, ex.name);
        if (score > bestScore) {
            bestScore = score;
            bestMatch = ex;
        }
    }

    if (bestMatch && bestScore >= 50) {
        return { exercise: bestMatch, confidence: bestScore };
    }

    return null;
}

// ============================================================
// Public API
// ============================================================

/**
 * Generate exercise mappings for all unique exercise names found in parsed data.
 * Returns one mapping per unique exercise name.
 *
 * Exercises with confidence >= 80 are auto-accepted.
 * Exercises with lower confidence or no match require user resolution.
 */
export async function generateExerciseMappings(
    parsedExercises: ParsedExercise[],
): Promise<ExerciseMapping[]> {
    // Deduplicate exercise names
    const uniqueNames = new Set<string>();
    for (const ex of parsedExercises) {
        uniqueNames.add(ex.originalName);
    }

    // Load all exercises for matching
    const dbExercises = await getExercises(false);

    const mappings: ExerciseMapping[] = [];

    for (const originalName of uniqueNames) {
        const match = findBestMatch(originalName, dbExercises);

        if (match && match.confidence >= 80) {
            // Auto-accept high-confidence matches
            mappings.push({
                originalName,
                suggestedMatch: { id: match.exercise.id, name: match.exercise.name },
                confidence: match.confidence,
                action: 'map',
                resolvedExerciseId: match.exercise.id,
            });
        } else if (match) {
            // Low confidence — suggest but don't auto-accept
            mappings.push({
                originalName,
                suggestedMatch: { id: match.exercise.id, name: match.exercise.name },
                confidence: match.confidence,
                action: 'map', // Default to map, user can override
                resolvedExerciseId: null, // Needs user confirmation
            });
        } else {
            // No match at all
            mappings.push({
                originalName,
                suggestedMatch: null,
                confidence: 0,
                action: 'create', // Default to create custom
                resolvedExerciseId: null,
            });
        }
    }

    return mappings;
}

/**
 * Check if all mappings are resolved (no user action needed).
 * Used to decide whether to show the exercise mapping screen.
 */
export function allMappingsResolved(mappings: ExerciseMapping[]): boolean {
    return mappings.every(
        (m) => m.resolvedExerciseId != null || m.action === 'skip' || m.action === 'create',
    );
}

/**
 * Get only the unresolved mappings that need user attention.
 * Per Option A: auto-matched exercises (confidence >= 80) are excluded.
 */
export function getUnresolvedMappings(mappings: ExerciseMapping[]): ExerciseMapping[] {
    return mappings.filter(
        (m) => m.resolvedExerciseId == null && m.action !== 'skip',
    );
}
