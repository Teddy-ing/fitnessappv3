/**
 * Shared Computation Formulas (TD-035)
 *
 * Canonical JavaScript implementations of formulas that also exist
 * as SQL fragments in `sqlFragments.ts`. Import these instead of
 * re-implementing formulas inline.
 *
 * WHY: The Epley 1RM formula was defined in SQL (sqlFragments.ts, TD-024)
 * but had no JS counterpart, leading to a duplicate in RecordsTab.tsx.
 * Any formula change (e.g., Epley → Brzycki) must update both files.
 */

// ============================================================
// Epley estimated 1RM
// ============================================================

/**
 * Epley formula for estimated 1-rep max (JavaScript version).
 *
 * Formula: weight × (1 + reps / 30)
 * SQL equivalent: `sqlFragments.EPLEY_1RM`
 *
 * Returns 0 for invalid inputs. Returns raw weight for 1-rep sets.
 * Result is rounded to 1 decimal place for display.
 */
export function computeEpley1RM(weight: number, reps: number): number {
    if (reps <= 0 || weight <= 0) return 0;
    if (reps === 1) return weight; // 1RM is the actual weight
    return Math.round(weight * (1 + reps / 30) * 10) / 10;
}
