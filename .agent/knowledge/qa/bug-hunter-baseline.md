---
description: Tracking document for logic bugs, runtime errors, and edge case findings from Bug Hunter QA passes
---

# Bug Hunter Audit Baseline

## Summary

- **Last full pass:** 2026-03-14 (analytics feature)
- **Open issues:** 0 (Critical: 0, High: 0, Medium: 0, Low: 0)
- **Fixed since baseline:** 5

---

## Open Issues

### Critical (Crashes / Data Loss)

*No open critical issues.*

### High (Incorrect Behavior)

*No open high issues.*

### Medium (Edge Cases)

*No open medium issues.*

### Low (Defensive Gaps)

*No open low issues.*

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
- **Root cause:** `GROUP BY ws.reps` with `MAX(ws.weight)` left `achieved_date` as a non-aggregated bare column.
- **Fix applied:** Replaced with CTE using `ROW_NUMBER()` window function.

#### BH-005 · Duration excluded from Breakdown tab — **RESOLVED 2026-03-14**
- **Severity:** Medium
- **Original status:** 🟡 Plausible
- **File:** [AnalyticsScreen.tsx](file:///c:/Users/teddy/projects/workout-app/src/screens/AnalyticsScreen.tsx)
- **Root cause:** Duration can't meaningfully be distributed per muscle group.
- **Fix applied:** Added `BREAKDOWN_METRICS` constant excluding `duration`, passed via optional `items` prop on `MetricSelector`.

#### BH-006 · Analytics screens wrapped in `ErrorBoundary` — **RESOLVED 2026-03-14**
- **Severity:** Low
- **Original status:** 🔴 Confirmed
- **File:** [AppNavigator.tsx](file:///c:/Users/teddy/projects/workout-app/src/navigation/AppNavigator.tsx)
- **Root cause:** Analytics screens were only covered by the outer ProfileStack boundary. A chart crash would take down the entire stack.
- **Fix applied:** Added `AnalyticsScreenWithBoundary` and `ExerciseAnalyticsScreenWithBoundary` wrapper components in AppNavigator.

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
- Session Context: All analytics QA issues resolved (BH-001 through BH-006)
