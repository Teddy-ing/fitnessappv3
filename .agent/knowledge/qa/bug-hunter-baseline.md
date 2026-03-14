---
description: Tracking document for logic bugs, runtime errors, and edge case findings from Bug Hunter QA passes
---

# Bug Hunter Audit Baseline

## Summary

- **Last full pass:** 2026-03-14 (analytics feature)
- **Open issues:** 5 (Critical: 0, High: 1, Medium: 3, Low: 1)
- **Fixed since baseline:** 1

---

## Open Issues

### Critical (Crashes / Data Loss)

*No open critical issues.*

### High (Incorrect Behavior)

#### BH-002 · Missing cleanup return in `useExerciseAnalytics` web path
- **Severity:** High
- **Status:** 🔴 Confirmed
- **File:** [useExerciseAnalytics.ts](file:///c:/Users/teddy/projects/workout-app/src/hooks/useExerciseAnalytics.ts#L94-L98)
- **What:** When `Platform.OS === 'web'`, the early return on line 97 skips the `return () => { cancelled = true; }` cleanup function. React expects useEffect to return either `undefined` or a cleanup function consistently. More critically, since the `cancelled` flag is never tied to cleanup, a rapid `exerciseId` or `chartRange` change on web causes the *previous* effect's mock data to overwrite the next one's state (race condition with setState).
- **Scenario:** User taps between range pills quickly on the web preview — the final chart may show data from the wrong range since effects are not properly cancelled.
- **Fix:** Move the early return *inside* the promise-based flow, or add `return () => { cancelled = true; }` in the web branch too, and guard the `setState` call with `if (!cancelled)`.

### Medium (Edge Cases)

#### BH-003 · `Text.onPress` used instead of `TouchableOpacity` for range pills
- **Severity:** Medium
- **Status:** 🔴 Confirmed
- **File:** [ExerciseAnalyticsScreen.tsx](file:///c:/Users/teddy/projects/workout-app/src/screens/ExerciseAnalyticsScreen.tsx#L78-L86)
- **What:** The `RangePills` component uses `<Text onPress={...}>` (line 81) inside a `<View>`. While `Text.onPress` works on both iOS and Android, it has no touchable feedback (no opacity change, no ripple), making the pills feel unresponsive. This also diverges from every other pill/tab control in the app (which all use `TouchableOpacity`). More importantly, the `styles.pill` object contains `borderRadius` and `overflow: 'hidden'` set as `Text` style properties — on Android, `Text` does not support `overflow` and `borderRadius` behaves inconsistently, leading to square corners on some devices.
- **Scenario:** User on an older Android device sees unstyled square text instead of pill shapes.
- **Fix:** Replace `<Text onPress>` with `<TouchableOpacity onPress>` wrapping a `<Text>`, matching the pattern used in `AnalyticsScreen.tsx`'s `PillRow` component.

#### BH-004 · `getBestWeightForReps` returns wrong `achieved_date` due to GROUP BY ambiguity
- **Severity:** Medium
- **Status:** 🟡 Plausible
- **File:** [analyticsService.ts](file:///c:/Users/teddy/projects/workout-app/src/services/analyticsService.ts#L742-L756)
- **What:** The query groups by `ws.reps` and selects `MAX(ws.weight) AS weight` alongside `DATE(w.completed_at) AS achieved_date`. In SQLite, the non-aggregated column `achieved_date` is not guaranteed to come from the same row as `MAX(ws.weight)` — SQLite *may* return the date from any row in the group (this is a well-known SQLite behaviour difference from MySQL). This means the "Best Weight for Reps" table could show the wrong date for a given rep/weight PR.
- **Scenario:** User hits 225 lbs for 5 reps on March 1st, then only 205 lbs for 5 reps on March 10th. The table shows "225 lbs — Mar 10" because SQLite returned the date from the later row even though MAX(weight) came from the earlier one.
- **Fix:** Use a subquery or window function: `SELECT ws.reps, ws.weight, DATE(w.completed_at) AS achieved_date FROM ... WHERE (ws.reps, ws.weight) IN (SELECT reps, MAX(weight) FROM workout_sets ... GROUP BY reps) ...` or use the SQLite-specific behaviour guarantee (since SQLite does guarantee the non-aggregated column comes from the MAX row as a documented extension) and document the reliance.

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
- **Root cause:** SQLite `strftime('%W', ...)` uses non-ISO week numbering (W00-W53, starting from Jan 1) while JS `getISOWeekNumber()` uses ISO 8601 (W01-W53, starting from the week containing the year's first Thursday). These disagreed near year boundaries.
- **Fix applied:** Replaced the SQL `strftime('%Y-W%W', ...)` query with raw `DATE(completed_at)` fetches. All week key computation now happens in JS using new `getISOWeekYear()` and `toISOWeekKey()` helpers, ensuring consistency. The `per_week` chart bucket still uses `%W` for display grouping (cosmetic only — no cross-system comparisons).

---

## Accepted / Won't Fix

*No accepted issues yet.*

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
- Session Context: BH-001 resolved — ISO-week mismatch fix applied to streak calculation in analyticsService.ts
