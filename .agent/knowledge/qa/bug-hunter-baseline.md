---
description: Tracking document for logic bugs, runtime errors, and edge case findings from Bug Hunter QA passes
---

# Bug Hunter Audit Baseline

## Summary

- **Last full pass:** 2026-03-17 (calendar feature — Phases A–E)
- **Open issues:** 4 (Critical: 0, High: 1, Medium: 2, Low: 1)
- **Fixed since baseline:** 6

---

## Open Issues

### Critical (Crashes / Data Loss)

*No open critical issues.*

### High (Incorrect Behavior)

#### BH-008 · `backfillPersonalRecords` uses manual `BEGIN/COMMIT` instead of `withTransactionAsync`

- **Severity:** High
- **Triage status:** 🟡 Plausible
- **File:** [calendarService.ts](file:///c:/Users/teddy/projects/workout-app/src/services/calendarService.ts#L545-L600)
- **Root cause:** The `backfillPersonalRecords` function uses `db.execAsync('BEGIN;')` / `db.execAsync('COMMIT;')` for transaction management. If any of the `INSERT` calls throw, the `catch` block tries `db.execAsync('ROLLBACK;')` — but because `execAsync` errors are also swallowed at that level (the catch silently eats the rollback error), a partial write can leave the DB in an inconsistent state. More critically, the Expo SQLite WAL-mode can interact poorly with manual `BEGIN/COMMIT` when other read operations are in flight (`Promise.all` in `loadMonthData`). The rest of the codebase correctly uses `withTransactionAsync` — this function is the only outlier.
- **Scenario:** If the backfill crashes mid-way (e.g. phone runs low on memory with a large history), some exercises have PR records and others don't. The `pr_backfill_complete` flag isn't set, so the next app open re-runs the backfill — but existing records will cause UNIQUE constraint failures if the PR IDs collide (UUIDs make this unlikely but the pattern is still wrong).
- **Fix:** Replace `execAsync('BEGIN;')` / `execAsync('COMMIT;')` with `db.withTransactionAsync(async () => { ... })`, matching the pattern used in `saveWorkout` and `updateWorkout`.

---

### Medium (Edge Cases)

#### BH-009 · `getWorkoutsForDate` casts `SetRow` without `workout_exercise_id` in type

- **Severity:** Medium
- **Triage status:** 🔴 Confirmed
- **File:** [calendarService.ts](file:///c:/Users/teddy/projects/workout-app/src/services/calendarService.ts#L337-L350)
- **Root cause:** On line 337, `getWorkoutsForDate` queries `workout_sets` with `SELECT *`, then on line 345 casts each row with `(setRow as SetRow & { workout_exercise_id: string }).workout_exercise_id`. The `SetRow` type from `hydration.ts` does not include `workout_exercise_id`, so this inline cast is used as a workaround. However, the exact same pattern is handled cleanly in `getWorkoutDetail` (line 57-59) with a proper `SetRowWithParent` interface that extends `SetRow`. The inconsistency means that if the `workout_sets` schema ever changes the column name, this cast would silently break (returning `undefined` as the key, grouping all sets under one exercise).
- **Fix:** Use the existing `SetRowWithParent` interface (already defined at line 57) instead of the inline cast on line 345.

---

#### BH-010 · `navigationRef` typed as `any` — violates conventions guardrail #2

- **Severity:** Medium
- **Triage status:** 🔴 Confirmed
- **File:** [navigationRef.ts](file:///c:/Users/teddy/projects/workout-app/src/navigation/navigationRef.ts#L11)
- **Root cause:** `createNavigationContainerRef<any>()` uses `any` as the generic type parameter. Conventions guardrail #2 explicitly prohibits `any` types. This means `navigateToTab` accepts any string, including typos like `'Profle'`, without compile-time checking.
- **Fix:** Define a `RootTabParamList` type and use `createNavigationContainerRef<RootTabParamList>()`. Type the `tabName` parameter of `navigateToTab` accordingly. Add `// eslint-disable-next-line` with justification if a proper type can't be defined due to circular imports.

---

### Low (Defensive Gaps)

#### BH-011 · `updateWorkout` not exported in default export object of `workoutService.ts`

- **Severity:** Low
- **Triage status:** 🔴 Confirmed
- **File:** [workoutService.ts](file:///c:/Users/teddy/projects/workout-app/src/services/workoutService.ts#L431-L438)
- **Root cause:** The `updateWorkout` function is a named export but is missing from the default export object at lines 431-438. While the app currently imports `updateWorkout` via barrel exports (`services/index.ts`), any consumer using the default import pattern (`import workoutService from './workoutService'`) would not have access to `updateWorkout`. This is inconsistent with the rest of the service's exports.
- **Fix:** Add `updateWorkout` to the default export object.

---

## False Positives Reviewed

| Concern | Reviewed Area | Why Not a Bug |
|---------|--------------|---------------|
| `SCREEN_WIDTH` stale on rotation | `ExerciseAnalyticsScreen.tsx:30-31`, `AnalyticsScreen.tsx:49-50` | Module-level `Dimensions.get()` would be stale on rotation, but this is a portrait-locked mobile fitness app — acceptable. |
| `lastMonth` mutable in `.map()` | `AnalyticsScreen.tsx:205`, `ExerciseAnalyticsScreen.tsx:115,244` | Looks like a stale closure, but `lastMonth` is a `let` variable in the *render scope* above the `.map()`, capturing correctly via closure. Data is sorted by date, so mutation during iteration produces correct month-header logic. |
| Missing error handling in `ConsistencyCards` / `FatigueRatioBanner` | Both components | Service functions already return safe defaults on failure; components correctly handle null/zero states. Not a gap. |
| `safeJsonParse` doesn't validate shape | `analyticsService.ts:444,534` | `safeJsonParse` returns `as T` without runtime validation, but the `MuscleContribution[]` data is written by the app itself (not user input) and validated at write time. Acceptable given data provenance. |
| `backfillPersonalRecords` called without `await` | `CalendarScreen.tsx:592` | The backfill is fire-and-forget by design — it's idempotent and gated by the `pr_backfill_complete` flag. Blocking the UI load on a potentially expensive backfill would degrade UX. Acceptable. |
| `searchNotes` N+1 query pattern | `calendarService.ts:671-680` | Each workout row triggers a separate `SELECT` for exercise notes. With typical journal usage (10-50 entries), this is within acceptable bounds. Could be optimized later if journals grow large. |
| `JournalView` debounce timer not cleared on unmount | `JournalView.tsx:99,117-123` | The `setTimeout` ref could fire after unmount, but the effect would only call `setEntries` / `setLoading` on an unmounted component. React suppresses this as a no-op warning. Low-priority cleanup. |
| `loadOlderMonths` captures `months` in closure | `CalendarScreen.tsx:633-656` | The `months` dependency in `useCallback` is correct — it reads `months[0]` to determine the oldest loaded month. The `isLoadingOlderRef` guard prevents re-entrancy. |
| `handleDiscardWorkout` stale closure on `activeWorkout` | `WorkoutScreen.tsx:214-224` | The `useEffect` dep array uses `[activeWorkout !== null]` (boolean coercion). This is intentional — the effect only needs to re-bind when transitioning between "has workout" and "no workout" states, not on every set update. |
| `DailyWorkoutModal` filter matching logic (AND vs OR) | `CalendarScreen.tsx:163-166` | `matchesFilter` uses AND semantics: a day must match *all* active filters to avoid dimming. This is intentional — PRs + Notes means "show days with both PRs AND notes." |

---

## Resolved

#### BH-001 · ISO-week mismatch between SQLite `%W` and JS `getISOWeekNumber()` — **RESOLVED 2026-03-14**
- **Severity:** High
- **Original status:** 🟡 Plausible
- **File:** [analyticsService.ts](file:///c:/Users/teddy/projects/workout-app/src/services/analyticsService.ts)
- **Root cause:** SQLite `strftime('%W', ...)` uses non-ISO week numbering while JS `getISOWeekNumber()` uses ISO 8601. These disagreed near year boundaries.
- **Fix applied:** Streak calculation replaced with raw `DATE(completed_at)` fetches; week keys computed in JS via `getISOWeekYear()` / `toISOWeekKey()`. Chart `buildBucketExpression` `per_week` case also updated to use ISO 8601 Thursday-pivot formula (`date(col, '-3 days', 'weekday 4')`) instead of `strftime('%W')`.

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

#### BH-007 · `finishWorkout` reads stale `isEditMode` / `original*` after `set()` clears them — **RESOLVED 2026-03-17**
- **Severity:** High
- **Original status:** 🔴 Confirmed
- **File:** [WorkoutScreen.tsx](file:///c:/Users/teddy/projects/workout-app/src/screens/WorkoutScreen.tsx#L126-L200)
- **Root cause:** `finishWorkout()` resets `isEditMode`/`original*` to `false`/`null` in the Zustand store before the screen reads them to decide between `updateWorkout` vs `saveWorkout`.
- **Fix applied:** Snapshot `isEditMode`, `originalDuration`, `originalCompletedAt`, `originalStartedAt` into local `const`s before calling `finishWorkout()`.

#### BH-002 · Missing cleanup return in `useExerciseAnalytics` web path — **RESOLVED 2026-03-14**
- **Severity:** High
- **Original status:** ➖ Accepted
- **File:** [useExerciseAnalytics.ts](file:///c:/Users/teddy/projects/workout-app/src/hooks/useExerciseAnalytics.ts)
- **Root cause:** Web mock-data path in `useEffect` returned bare `return;` instead of a cleanup function, breaking React's cleanup contract.
- **Fix applied:** Changed `return;` to `return () => {};` so both code paths consistently return cleanup functions.

---

## Accepted / Won't Fix

*No accepted issues.*

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
- Date: 2026-03-17
- Session Context: Calendar feature (Phases A–E) QA pass. 5 new issues found (BH-007 through BH-011). BH-007 fixed — snapshot edit-mode state before finishWorkout() clears it. 4 issues remaining.
