---
description: Tracking document for logic bugs, runtime errors, and edge case findings from Bug Hunter QA passes
---

# Bug Hunter Audit Baseline

## Summary

- **Last full pass:** 2026-03-14 (analytics feature)
- **Open issues:** 2 (Critical: 0, High: 0, Medium: 1, Low: 1)
- **Fixed since baseline:** 3

---

## Open Issues

### Critical (Crashes / Data Loss)

*No open critical issues.*

### High (Incorrect Behavior)

*No open high issues.*

### Medium (Edge Cases)

#### BH-005 · Duration metric in `getMuscleDistribution()` uses placeholder value `1`
- **Severity:** Medium
- **Status:** 🟡 Plausible
- **File:** [analyticsService.ts](file:///c:/Users/teddy/projects/workout-app/src/services/analyticsService.ts#L416-L420)
- **What:** When metric is `'duration'`, the `metricExpr` is hardcoded to `'1'` with the comment "Duration is workout-level, distribute evenly across exercises." This means the muscle distribution for "Duration" shows each muscle group's value as a sum of contribution percentages across exercises — completely independent of actual workout duration. The result is meaningless data: a user who does 3 chest exercises sees "chest: ~180" whether their workout was 20 minutes or 2 hours.
- **Scenario:** User selects "Duration" on the Breakdown tab and sees muscle group values that don't correspond to any real time metric, which is confusing.
- **Fix:** Either (a) exclude `duration` from the Breakdown tab's metric selector since it can't meaningfully be distributed per muscle group, or (b) join to `workouts.total_duration`, divide by exercise count, and distribute that fraction by muscle contribution.

### Low (Defensive Gaps)

#### BH-006 · `AnalyticsScreen` and `ExerciseAnalyticsScreen` not wrapped in `ErrorBoundary`
- **Severity:** Low
- **Status:** 🔴 Confirmed
- **File:** [AppNavigator.tsx](file:///c:/Users/teddy/projects/workout-app/src/navigation/AppNavigator.tsx) (wrap points), [AnalyticsScreen.tsx](file:///c:/Users/teddy/projects/workout-app/src/screens/AnalyticsScreen.tsx), [ExerciseAnalyticsScreen.tsx](file:///c:/Users/teddy/projects/workout-app/src/screens/ExerciseAnalyticsScreen.tsx)
- **What:** Per convention (Bug Hunter checklist: "ErrorBoundary gaps — New screens/components not wrapped"), both analytics screens are stack-pushed within the Profile stack but are not individually wrapped in `<ErrorBoundary>`. The outer `ProfileStack` ErrorBoundary does catch errors, so this is defence-in-depth rather than a crash gap — but a chart library error on one screen would take down the entire profile stack instead of just showing a card-level fallback.
- **Fix:** Add `<ErrorBoundary fallback="screen" label="AnalyticsScreen">` and `<ErrorBoundary fallback="screen" label="ExerciseAnalyticsScreen">` around the screen components in AppNavigator.

---

## False Positives Reviewed

| Concern | Reviewed Area | Why Not a Bug |
|---------|--------------|---------------|
| `SCREEN_WIDTH` stale on rotation | `ExerciseAnalyticsScreen.tsx:30-31`, `AnalyticsScreen.tsx:49-50` | Module-level `Dimensions.get()` would be stale on rotation, but this is a portrait-locked mobile fitness app — acceptable. |
| `lastMonth` mutable in `.map()` | `AnalyticsScreen.tsx:205`, `ExerciseAnalyticsScreen.tsx:115,244` | Looks like a stale closure, but `lastMonth` is a `let` variable in the *render scope* above the `.map()`, capturing correctly via closure. Data is sorted by date, so mutation during iteration produces correct month-header logic. |
| Missing error handling in `ConsistencyCards` / `FatigueRatioBanner` | Both components | Service functions already return safe defaults on failure; components correctly handle null/zero states. Not a gap. |
| `safeJsonParse` doesn't validate shape | `analyticsService.ts:444,534` | `safeJsonParse` returns `as T` without runtime validation, but the `MuscleContribution[]` data is written by the app itself (not user input) and validated at write time. Acceptable given data provenance. |

---

## Resolved

#### BH-001 · ISO-week mismatch between SQLite `%W` and JS `getISOWeekNumber()` — **RESOLVED 2026-03-14**
- **Severity:** High
- **Original status:** 🟡 Plausible
- **File:** [analyticsService.ts](file:///c:/Users/teddy/projects/workout-app/src/services/analyticsService.ts)
- **Root cause:** SQLite `strftime('%W', ...)` uses non-ISO week numbering while JS `getISOWeekNumber()` uses ISO 8601. These disagreed near year boundaries.
- **Fix applied:** Replaced SQL `strftime('%Y-W%W', ...)` query with raw `DATE(completed_at)` fetches. All week key computation now happens in JS using new `getISOWeekYear()` and `toISOWeekKey()` helpers.

#### BH-003 · `Text.onPress` replaced with `TouchableOpacity` in RangePills — **RESOLVED 2026-03-14**
- **Severity:** Medium
- **Original status:** 🔴 Confirmed
- **File:** [ExerciseAnalyticsScreen.tsx](file:///c:/Users/teddy/projects/workout-app/src/screens/ExerciseAnalyticsScreen.tsx)
- **Root cause:** `RangePills` used `<Text onPress>` with mixed View/Text styles — no touch feedback, broken `borderRadius` on Android.
- **Fix applied:** Replaced with `<TouchableOpacity>` wrapping `<Text>`, split the `pill` style into container and text styles.

#### BH-004 · `getBestWeightForReps` returns correct `achieved_date` — **RESOLVED 2026-03-14**
- **Severity:** Medium
- **Original status:** 🟡 Plausible
- **File:** [analyticsService.ts](file:///c:/Users/teddy/projects/workout-app/src/services/analyticsService.ts)
- **Root cause:** `GROUP BY ws.reps` with `MAX(ws.weight)` left `achieved_date` as a non-aggregated bare column — the date could come from any row in the group.
- **Fix applied:** Replaced with CTE using `ROW_NUMBER() OVER (PARTITION BY ws.reps ORDER BY ws.weight DESC, w.completed_at DESC)` to explicitly pick the row with the highest weight (most recent date as tiebreaker).

---

## Accepted / Won't Fix

#### BH-002 · Missing cleanup return in `useExerciseAnalytics` web path — **ACCEPTED 2026-03-14**
- **Severity:** High
- **Reason:** Web version uses temporary mock data for visual debugging only. Not a production concern.
- **File:** [useExerciseAnalytics.ts](file:///c:/Users/teddy/projects/workout-app/src/hooks/useExerciseAnalytics.ts#L94-L98)

---

## Historical Bugs Caught By This Category

These were found and fixed before this baseline was created. Documented here for pattern awareness:

| Bug | Where | Root Cause | Fixed |
|-----|-------|-----------|-------|
| Epoch vs ISO date confusion in hydration | `hydration.ts` | Raw SQL rows used epoch timestamps but code expected ISO strings | 2026-03-05 |
| Partial writes on workout save | `database.ts` | Transaction not wrapping all inserts | 2026-01-06 |
| Template cycling skips wrong index | `splitService.ts` | Off-by-one when rest days present at end of schedule | 2026-01-08 |
| Stale workout data after switching splits | `useHomeScreenData.ts` | Hook didn't reset when active split ID changed | 2026-03-05 |

---

## Last Updated
- Date: 2026-03-14
- Session Context: BH-004 resolved — getBestWeightForReps query rewritten with ROW_NUMBER() window function
