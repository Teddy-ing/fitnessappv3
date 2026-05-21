/**
 * Exercise Relationships — Static Ratio Table
 *
 * Biomechanical relationship ratios between common compound exercises.
 * Used to bootstrap predictions for exercises the user hasn't performed yet.
 *
 * Each ratio encodes: a user who lifts X on exercise A can likely lift X * ratio on exercise B.
 * Ratios are bidirectional — `getEstimatedWeight` handles inversion automatically.
 *
 * These are population-average estimates, NOT individualized. They serve as starting
 * suggestions until the user accumulates ≥3 sessions of direct history.
 */

// ============================================================
// Types
// ============================================================

interface ExerciseRatio {
    /** Regex pattern matching exercise name (case-insensitive) */
    fromPattern: RegExp;
    /** Regex pattern matching exercise name (case-insensitive) */
    toPattern: RegExp;
    /** Ratio: from_weight * ratio ≈ to_weight */
    ratio: number;
    /** Primary muscle group for context matching */
    muscleGroup: string;
}

// ============================================================
// Static Ratio Table (~15 compound pairs)
// ============================================================

const EXERCISE_RATIOS: ExerciseRatio[] = [
    // ── Chest Pressing ──
    {
        fromPattern: /barbell bench press/i,
        toPattern: /dumbbell bench press/i,
        ratio: 0.70,  // pair of DBs: each ≈ 35% of BB total
        muscleGroup: 'chest',
    },
    {
        fromPattern: /barbell bench press/i,
        toPattern: /incline.*bench press/i,
        ratio: 0.85,  // incline ≈ 85% of flat
        muscleGroup: 'chest',
    },
    {
        fromPattern: /barbell bench press/i,
        toPattern: /decline.*bench press/i,
        ratio: 1.05,  // decline slightly stronger
        muscleGroup: 'chest',
    },
    {
        fromPattern: /dumbbell bench press/i,
        toPattern: /incline dumbbell/i,
        ratio: 0.85,
        muscleGroup: 'chest',
    },

    // ── Back / Rows ──
    {
        fromPattern: /barbell row/i,
        toPattern: /dumbbell row/i,
        ratio: 0.50,  // single arm DB ≈ 50% of BB
        muscleGroup: 'back',
    },
    {
        fromPattern: /barbell row/i,
        toPattern: /cable row/i,
        ratio: 0.80,
        muscleGroup: 'back',
    },
    {
        fromPattern: /lat pulldown/i,
        toPattern: /pull.?up/i,
        ratio: 0.60,  // bodyweight pull-ups ≈ 60% of pulldown weight
        muscleGroup: 'lats',
    },

    // ── Legs / Squats ──
    {
        fromPattern: /barbell squat/i,
        toPattern: /leg press/i,
        ratio: 1.50,  // leg press typically 150% of squat
        muscleGroup: 'quads',
    },
    {
        fromPattern: /barbell squat/i,
        toPattern: /front squat/i,
        ratio: 0.80,
        muscleGroup: 'quads',
    },
    {
        fromPattern: /barbell squat/i,
        toPattern: /goblet squat/i,
        ratio: 0.35,  // single DB ≈ 35% of BB squat
        muscleGroup: 'quads',
    },

    // ── Deadlift Family ──
    {
        fromPattern: /conventional deadlift/i,
        toPattern: /romanian deadlift/i,
        ratio: 0.70,
        muscleGroup: 'hamstrings',
    },
    {
        fromPattern: /conventional deadlift/i,
        toPattern: /sumo deadlift/i,
        ratio: 0.95,
        muscleGroup: 'hamstrings',
    },

    // ── Shoulders ──
    {
        fromPattern: /overhead press/i,
        toPattern: /dumbbell shoulder press/i,
        ratio: 0.65,  // pair of DBs
        muscleGroup: 'shoulders',
    },
    {
        fromPattern: /overhead press/i,
        toPattern: /lateral raise/i,
        ratio: 0.20,  // isolation ≈ 20% of OHP
        muscleGroup: 'shoulders',
    },

    // ── Arms ──
    {
        fromPattern: /barbell curl/i,
        toPattern: /dumbbell curl/i,
        ratio: 0.50,  // per arm
        muscleGroup: 'biceps',
    },
];

// ============================================================
// Public API
// ============================================================

/**
 * Estimate the weight a user might use on a target exercise,
 * given their known weight on a source exercise.
 *
 * Searches both directions (from→to and to→from with inverted ratio).
 * Returns null if no relationship is found.
 *
 * @param fromExerciseName  The exercise the user has data for
 * @param toExerciseName    The exercise we want to estimate
 * @param knownWeight       The user's working weight on the source exercise
 * @returns Estimated weight (rounded to nearest 5) or null
 */
export function getEstimatedWeight(
    fromExerciseName: string,
    toExerciseName: string,
    knownWeight: number,
): number | null {
    for (const rel of EXERCISE_RATIOS) {
        // Forward match: from → to
        if (rel.fromPattern.test(fromExerciseName) && rel.toPattern.test(toExerciseName)) {
            return roundToNearest5(knownWeight * rel.ratio);
        }
        // Reverse match: to → from (invert ratio)
        if (rel.toPattern.test(fromExerciseName) && rel.fromPattern.test(toExerciseName)) {
            return roundToNearest5(knownWeight / rel.ratio);
        }
    }
    return null;
}

/**
 * Find all exercises related to the given exercise name.
 * Returns an array of { pattern, ratio, muscleGroup } entries.
 */
export function getRelatedExercises(
    exerciseName: string,
): { pattern: RegExp; ratio: number; muscleGroup: string; direction: 'forward' | 'reverse' }[] {
    const results: { pattern: RegExp; ratio: number; muscleGroup: string; direction: 'forward' | 'reverse' }[] = [];

    for (const rel of EXERCISE_RATIOS) {
        if (rel.fromPattern.test(exerciseName)) {
            results.push({
                pattern: rel.toPattern,
                ratio: rel.ratio,
                muscleGroup: rel.muscleGroup,
                direction: 'forward',
            });
        }
        if (rel.toPattern.test(exerciseName)) {
            results.push({
                pattern: rel.fromPattern,
                ratio: 1 / rel.ratio,
                muscleGroup: rel.muscleGroup,
                direction: 'reverse',
            });
        }
    }

    return results;
}

// ============================================================
// Helpers
// ============================================================

/** Round to nearest 5 lbs (standard plate increment) */
function roundToNearest5(value: number): number {
    return Math.round(value / 5) * 5;
}
