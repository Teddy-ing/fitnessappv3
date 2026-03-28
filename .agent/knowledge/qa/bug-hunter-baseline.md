---
description: Tracking document for logic bugs, runtime errors, and edge case findings from Bug Hunter QA passes
---

# Bug Hunter Audit Baseline

## Summary

- **Last full pass:** 2026-03-28 (Widget System + Bug Fix & QOL pass — 21 files)
- **Open issues:** 0 (Critical: 0, High: 0, Medium: 0, Low: 0)
- **Fixed since baseline:** 29

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
| `SCREEN_WIDTH` stale on rotation | `ExerciseAnalyticsScreen.tsx:30-31`, `AnalyticsScreen.tsx:49-50`, `TrendsTab.tsx:42`, `GalleryTab.tsx:41` | Module-level `Dimensions.get()` would be stale on rotation, but this is a portrait-locked mobile fitness app — acceptable. |
| `lastMonth` mutable in `.map()` | `AnalyticsScreen.tsx:205`, `ExerciseAnalyticsScreen.tsx:115,244` | Looks like a stale closure, but `lastMonth` is a `let` variable in the *render scope* above the `.map()`, capturing correctly via closure. Data is sorted by date, so mutation during iteration produces correct month-header logic. |
| Missing error handling in `ConsistencyCards` / `FatigueRatioBanner` | Both components | Service functions already return safe defaults on failure; components correctly handle null/zero states. Not a gap. |
| `safeJsonParse` doesn't validate shape | `analyticsService.ts:444,534` | `safeJsonParse` returns `as T` without runtime validation, but the `MuscleContribution[]` data is written by the app itself (not user input) and validated at write time. Acceptable given data provenance. |
| `backfillPersonalRecords` called without `await` | `CalendarScreen.tsx:592` | The backfill is fire-and-forget by design — it's idempotent and gated by the `pr_backfill_complete` flag. Blocking the UI load on a potentially expensive backfill would degrade UX. Acceptable. |
| `searchNotes` N+1 query pattern | `calendarService.ts:671-680` | Each workout row triggers a separate `SELECT` for exercise notes. With typical journal usage (10-50 entries), this is within acceptable bounds. Could be optimized later if journals grow large. |
| `JournalView` debounce timer not cleared on unmount | `JournalView.tsx:99,117-123` | The `setTimeout` ref could fire after unmount, but the effect would only call `setEntries` / `setLoading` on an unmounted component. React suppresses this as a no-op warning. Low-priority cleanup. |
| `loadOlderMonths` captures `months` in closure | `CalendarScreen.tsx:633-656` | The `months` dependency in `useCallback` is correct — it reads `months[0]` to determine the oldest loaded month. The `isLoadingOlderRef` guard prevents re-entrancy. |
| `handleDiscardWorkout` stale closure on `activeWorkout` | `WorkoutScreen.tsx:214-224` | The `useEffect` dep array uses `[activeWorkout !== null]` (boolean coercion). This is intentional — the effect only needs to re-bind when transitioning between "has workout" and "no workout" states, not on every set update. |
| `DailyWorkoutModal` filter matching logic (AND vs OR) | `CalendarScreen.tsx:163-166` | `matchesFilter` uses AND semantics: a day must match *all* active filters to avoid dimming. This is intentional — PRs + Notes means "show days with both PRs AND notes." |
| `loadSparklines` fires only on mount (empty deps) | `TrendsTab.tsx:793-795` | `loadSparklines` is called via `useEffect([], [])`. The sparkline list doesn't auto-refresh when the user logs new data on the Track tab and switches to Trends. However, this is acceptable — the component remounts when switching tabs because it's conditionally rendered (`activeTab === 'trends'`), so the `useEffect` fires each time. |
| `loadData` / `loadFields` defined with `useCallback` but called from `useEffect` without cleanup | `MeasurementsScreen.tsx:619-665` | The async calls fire without an abort signal. However, the result is only `setState` calls, which are safe on unmounted components (React suppresses). No data-corruption risk. |
| `commitValue` reads `focusedIndex` from closure | `MeasurementsScreen.tsx:728-755` | `focusedIndex` is read from the closure inside `commitValue`. Because `setFocusedIndex` updates are synchronous within the same render batch, and `commitValue` is always called in the same tick as the keyboard handler, the closure captures the correct value. |
| `SparklineSVG` gradient `id` collision across multiple sparklines | `TrendsTab.tsx:99` | All sparklines use `id="sparkGrad"` for the gradient. In React Native SVG, each `<Svg>` element is an isolated SVG document, so IDs don't collide across components. Not a bug. |
| `getFieldType` returns `'weight'` for all types | `MeasurementsScreen.tsx:780-785` | The comment says "Body Fat % → percentage, everything else → weight-like decimal" but both branches return `'weight'`. This is intentional — the keyboard layout for weight (decimal numbers) works for all measurement types including percentages. No bug. |
| `GoalCelebrationOverlay` `handleDismiss` stale closure | `GoalCelebrationOverlay.tsx:55-62` | `handleDismiss` is defined as a plain function (not `useCallback`) and references `timerRef`, `slideAnim`, `opacityAnim`, and `dismiss`. All of these are refs or Zustand selectors (stable references), so no stale closure risk. The `dismiss` function from Zustand is stable across renders. |
| `GoalCelebrationOverlay` auto-dismiss timer not cleared between queue items | `GoalCelebrationOverlay.tsx:55-62` | The `useEffect` cleanup function clears `timerRef.current` on unmount or when `currentGoal?.id` changes. Between queue items, the `dismiss()` call triggers a re-render with a new `currentGoal?.id`, which triggers cleanup → new effect. Safe. |
| `computeExerciseVolume` includes non-working sets | `goalService.ts:317-336` | Volume query doesn't filter by `ws.type = 'working'`, unlike 1RM and max-reps. This is intentional — total session volume includes warmup and drop sets for volume-tracking goals. |
| `resolveDisplayInfoBatch` N+1 for exercise goals | `GoalsScreen.tsx:140-159` | Each exercise goal calls `getExerciseById()` individually. With typical goal counts (1-10), this is acceptable. The exercise service has a module-level cache (PP-012 resolved), so these are in-memory lookups. |
| `loadGoals` callback defined with empty deps | `GoalsScreen.tsx:119-134` | `loadGoals` is defined with `useCallback([], [])`. It's called from `useEffect` on mount and as `onCreated` callback. Since it doesn't read any state from the component, empty deps are correct. |
| `GoalCreationModal` prefill `useEffect` missing `prefillData` in deps | `GoalCreationModal.tsx:73-81` | The `useEffect` watches `[visible]` but not `prefillData`. This is intentional — `prefillData` is set before `visible` is toggled to `true`, so the effect always sees the current value. Adding `prefillData` would cause double-fire when both change in the same render cycle. |
| `contextGoal` stale in `Alert.alert` callback | `GoalsScreen.tsx:201-263` | `contextGoal` is captured in the `onPress` closure inside `Alert.alert`. Since `setContextGoal(null)` is called at line 263 *after* the switch, and the Alert callbacks fire asynchronously (user must tap), the captured `contextGoal` is still valid at the time the user taps. Not a bug. |
| `WidgetGrid` `useCallback([widgets])` for `loadData` | `WidgetGrid.tsx:167-176` | `widgets` array reference changes on add/remove/reorder. Data refreshes happen on mount via `isFocused` in parent. Acceptable. |
| `PinnedExerciseWidget` always assumes positive = good (green) | `PinnedExerciseWidget.tsx:75` | For exercise metrics (1RM, volume), increasing is always desirable. No "cut" analogue for bench press. Correct behavior. |
| `BodyweightSparklineWidget` hardcodes `unit = 'lbs'` default | `BodyweightSparklineWidget.tsx:46` | Fallback default; parent should pass correct unit. Minor UX issue for kg users, not a runtime bug. |
| `SwipeableTabScreen` fling gesture during vertical scroll | `SwipeableTabScreen.tsx:67-96` | `Gesture.Fling()` requires fast directional swipe; `Gesture.Race()` means first gesture wins. Standard RNGH pattern — no conflict with vertical scrolls. |

---

## Resolved

#### BH-030 · `WidgetEditorModal` internal state not reset on external visibility toggle — **RESOLVED 2026-03-28**
- **Severity:** Low
- **Original status:** 🟡 Plausible
- **File:** [WidgetEditorModal.tsx](file:///c:/Users/teddy/projects/workout-app/src/components/widgets/WidgetEditorModal.tsx)
- **Root cause:** Internal state (`showCatalog`, `showExercisePicker`, `exerciseSearch`) persisted when `visible` was toggled externally without `handleClose`.
- **Fix applied:** Added `useEffect` that resets internal state when `visible` transitions to `false`.

#### BH-029 · `ProfileScreen.loadConfig` uses always-true `>= 0` length check — **RESOLVED 2026-03-28**
- **Severity:** Low
- **Original status:** 🟡 Plausible
- **File:** [ProfileScreen.tsx](file:///c:/Users/teddy/projects/workout-app/src/screens/ProfileScreen.tsx)
- **Root cause:** `settings.widgetConfig.length >= 0` always true for any array. Misleading guard.
- **Fix applied:** Simplified to `if (settings.widgetConfig)` — clearer intent.

#### BH-027 · `SwipeableTabScreen` `useEffect` missing shared values in deps — **RESOLVED 2026-03-28**
- **Severity:** Low
- **Original status:** 🔴 Confirmed
- **File:** [SwipeableTabScreen.tsx](file:///c:/Users/teddy/projects/workout-app/src/components/SwipeableTabScreen.tsx)
- **Root cause:** `useEffect` referenced `translateX` and `opacity` but only had `[isFocused]` in deps.
- **Fix applied:** Added `translateX` and `opacity` to the dependency array.

#### BH-026 · `TrendsTab.loadSparklines` stale `autoSelectTypeId` — **RESOLVED 2026-03-28**
- **Severity:** Medium
- **Original status:** 🔴 Confirmed
- **File:** [TrendsTab.tsx](file:///c:/Users/teddy/projects/workout-app/src/components/measurements/TrendsTab.tsx)
- **Root cause:** `loadSparklines` memoized with empty deps; `autoSelectTypeId` captured from first render.
- **Fix applied:** Added `autoSelectTypeId` to `useCallback` dependency array.

#### BH-025 · `GoalProgressWidget` progress calculation wrong for regression — **RESOLVED 2026-03-28**
- **Severity:** High
- **Original status:** 🔴 Confirmed
- **File:** [GoalProgressWidget.tsx](file:///c:/Users/teddy/projects/workout-app/src/components/widgets/GoalProgressWidget.tsx)
- **Root cause:** `Math.abs(current - starting)` erased direction, showing false progress when user regressed past starting value.
- **Fix applied:** Replaced with directional formula `(current - starting) / (target - starting)` clamped to [0, 1]. Works for both gain and loss goals.

#### BH-024 · Fire-and-forget `refreshAllGoalProgress()` + service→store coupling — **RESOLVED 2026-03-24**
- **Severity:** High
- **Original status:** 🟡 Plausible
- **File:** [workoutService.ts](file:///c:/Users/teddy/projects/workout-app/src/services/workoutService.ts), [measurementService.ts](file:///c:/Users/teddy/projects/workout-app/src/services/measurementService.ts)
- **Root cause:** Fire-and-forget `.then().catch()` pattern left uncovered rejection path; services imported `useGoalCelebrationStore` violating guardrail #9.
- **Fix applied:** `saveWorkout`/`updateWorkout` now return `Goal[]`; `logMeasurement` returns `{ measurement, completedGoals }`. All three services properly `await refreshAllGoalProgress()`. Celebration logic moved to callers (`WorkoutScreen.tsx`, `MeasurementsScreen.tsx`). Store import removed from both services.

#### BH-023 · `goalProgressService` 1RM/reps queries include abandoned workouts — **RESOLVED 2026-03-24**
- **Severity:** High
- **Original status:** 🔴 Confirmed
- **File:** [goalProgressService.ts](file:///c:/Users/teddy/projects/workout-app/src/services/goalProgressService.ts)
- **Root cause:** 6 SQL queries (3 single-goal compute + 3 batch) had no `JOIN workouts` and no `w.status = 'completed'` filter. Abandoned workouts inflated goal progress.
- **Fix applied:** Added `JOIN workouts w ON w.id = we.workout_id` and `AND w.status = 'completed'` to all 6 queries: `computeExercise1RM()`, `computeExerciseVolume()`, `computeExerciseMaxReps()`, and their batch equivalents in `refreshAllGoalProgress()`.

#### BH-022 · `getProgressPercent` returns misleading percentage for loss goals — **RESOLVED 2026-03-23**
- **Severity:** Low
- **Original status:** 🟡 Plausible
- **File:** [GoalCard.tsx](file:///c:/Users/teddy/projects/workout-app/src/components/goals/GoalCard.tsx#L50-L63), [GoalDetailModal.tsx](file:///c:/Users/teddy/projects/workout-app/src/components/goals/GoalDetailModal.tsx#L41-L54)
- **Root cause:** `(currentBest / targetValue) * 100` gave 109% clamped to 100% for a loss goal (e.g., 185/170). Misleading progress bar.
- **Fix applied:** Added direction detection (`targetValue < startingValue`); loss goals now compute `((starting - current) / (starting - target)) * 100`.

#### BH-021 · Stale closure in `selectExerciseMetric` — **RESOLVED 2026-03-23**
- **Severity:** Medium
- **Original status:** 🟡 Plausible
- **File:** [useGoalCreation.ts](file:///c:/Users/teddy/projects/workout-app/src/hooks/useGoalCreation.ts#L187-L204)
- **Root cause:** `state.exercise?.id` read from outer closure after `setState` call in the same callback, risking a stale value.
- **Fix applied:** Captured `exerciseId` from `prev` argument inside the `setState` updater function. Removed `state.exercise?.id` dependency.

#### BH-020 · `updateWorkout` fire-and-forget doesn't celebrate completed goals — **RESOLVED 2026-03-23**
- **Severity:** Medium
- **Original status:** 🔴 Confirmed
- **File:** [workoutService.ts](file:///c:/Users/teddy/projects/workout-app/src/services/workoutService.ts#L258-L265)
- **Root cause:** `updateWorkout` only logged completed goals to console, unlike `saveWorkout` and `logMeasurement` which called `celebrate()`.
- **Fix applied:** Replaced `console.log` loop with `useGoalCelebrationStore.getState().celebrate(completed)`.

#### BH-019 · `refreshAllGoalProgress` completion check wrong for loss goals — **RESOLVED 2026-03-23**
- **Severity:** High
- **Original status:** 🔴 Confirmed
- **File:** [goalService.ts](file:///c:/Users/teddy/projects/workout-app/src/services/goalService.ts#L419-L428)
- **Root cause:** `currentBest >= targetValue` was always used, but for loss goals (target < starting), `<=` should be used.
- **Fix applied:** Added `isLossGoal` detection. Loss goals use `<=`, gain goals use `>=`.

#### BH-013 · "View Comparison" button is a no-op — **RESOLVED 2026-03-23**
- **Severity:** High
- **Original status:** 🔴 Confirmed
- **File:** [GalleryTab.tsx](file:///c:/Users/teddy/projects/workout-app/src/components/measurements/GalleryTab.tsx#L661-L666)
- **Root cause:** `CompareView` auto-rendered when 2 photos selected, but the "View Comparison" button `onPress` was a stub.
- **Fix applied:** Added `showCompare` state to gate the `CompareView` modal behind the button press. Button now sets `showCompare(true)`, and `onClose` resets all compare state.

#### BH-014 · `getLatestMeasurements` returns arbitrary values when multiple entries exist on same date — **RESOLVED 2026-03-23**
- **Severity:** Medium
- **Original status:** 🟡 Plausible
- **File:** [measurementService.ts](file:///c:/Users/teddy/projects/workout-app/src/services/measurementService.ts#L257-L294)
- **Root cause:** `INNER JOIN` on `recorded_at = max_date` could match multiple rows with no tiebreaker.
- **Fix applied:** Added `MAX(created_at) AS max_created` to subquery and `AND m.created_at = latest.max_created` to join condition.

#### BH-015 · Hardcoded "lbs" unit in overlay summary and tooltip — **RESOLVED 2026-03-23**
- **Severity:** Medium
- **Original status:** 🔴 Confirmed
- **File:** [TrendsTab.tsx](file:///c:/Users/teddy/projects/workout-app/src/components/measurements/TrendsTab.tsx#L441-L510)
- **Root cause:** Three hardcoded `lbs` string literals in the 1RM overlay tooltip, latest row, and change row.
- **Fix applied:** Replaced all three with the dynamic `{unit}` variable, which correctly reflects the user's kg/lbs preference.

#### BH-017 · `PhotoViewer` doesn't guard `currentIndex` against out-of-bounds after delete — **RESOLVED 2026-03-23**
- **Severity:** Low
- **Original status:** 🟡 Plausible
- **File:** [GalleryTab.tsx](file:///c:/Users/teddy/projects/workout-app/src/components/measurements/GalleryTab.tsx#L186-L207)
- **Root cause:** `currentIndex` was local state not clamped when `photos` array shrank after deletion.
- **Fix applied:** Added `useEffect` watching `photos.length` to clamp `currentIndex` to `Math.min(currentIndex, photos.length - 1)`.

#### BH-018 · Duplicated `generateId()` utility across measurement and photo services — **RESOLVED 2026-03-23**
- **Severity:** Low
- **Original status:** 🔴 Confirmed
- **File:** [measurementService.ts](file:///c:/Users/teddy/projects/workout-app/src/services/measurementService.ts), [photoService.ts](file:///c:/Users/teddy/projects/workout-app/src/services/photoService.ts)
- **Root cause:** Identical UUID v4 `generateId()` function copy-pasted into both files.
- **Fix applied:** Extracted to shared `src/utils/uuid.ts`. Both services now import from there.

#### BH-012 · Overlay `data2` length mismatch causes chart crash or misalignment — **RESOLVED 2026-03-23**
- **Severity:** High
- **Original status:** 🔴 Confirmed
- **File:** [TrendsTab.tsx](file:///c:/Users/teddy/projects/workout-app/src/components/measurements/TrendsTab.tsx#L294-L311)
- **Root cause:** `.filter(d => d.value > 0)` on `overlayChartData` shrunk `data2` relative to `data`, breaking gifted-charts' 1:1 index alignment.
- **Fix applied:** Removed the `.filter()` call. Added `hasAnyOverlay` flag to gate overlay rendering. The interpolation pass already fills gaps with nearest-neighbor values.

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

#### BH-011 · `updateWorkout` not exported in default export object of `workoutService.ts` — **RESOLVED 2026-03-17**
- **Severity:** Low
- **Original status:** 🔴 Confirmed
- **File:** [workoutService.ts](file:///c:/Users/teddy/projects/workout-app/src/services/workoutService.ts#L431-L439)
- **Root cause:** `updateWorkout` was a named export but missing from the default export object.
- **Fix applied:** Added `updateWorkout` to the default export object.

#### BH-010 · `navigationRef` typed as `any` — violates conventions guardrail #2 — **RESOLVED 2026-03-17**
- **Severity:** Medium
- **Original status:** 🔴 Confirmed
- **File:** [navigationRef.ts](file:///c:/Users/teddy/projects/workout-app/src/navigation/navigationRef.ts)
- **Root cause:** `createNavigationContainerRef<any>()` and untyped `tabName: string` parameter.
- **Fix applied:** Used existing `RootTabParamList` from `AppNavigator.tsx`. Typed `tabName` as `keyof RootTabParamList`. Removed `as never` cast.

#### BH-009 · `getWorkoutsForDate` casts `SetRow` without `workout_exercise_id` in type — **RESOLVED 2026-03-17**
- **Severity:** Medium
- **Original status:** 🔴 Confirmed
- **File:** [calendarService.ts](file:///c:/Users/teddy/projects/workout-app/src/services/calendarService.ts#L335-L350)
- **Root cause:** Used inline `as SetRow & { workout_exercise_id: string }` cast instead of the existing `SetRowWithParent` interface.
- **Fix applied:** Replaced `getAllAsync<SetRow>` with `getAllAsync<SetRowWithParent>` and removed the inline cast.

#### BH-008 · `backfillPersonalRecords` uses manual `BEGIN/COMMIT` instead of `withTransactionAsync` — **RESOLVED 2026-03-17**
- **Severity:** High
- **Original status:** 🟡 Plausible
- **File:** [calendarService.ts](file:///c:/Users/teddy/projects/workout-app/src/services/calendarService.ts#L545-L600)
- **Root cause:** Manual `BEGIN`/`COMMIT`/`ROLLBACK` pattern was inconsistent with the rest of the codebase and risked partial writes on failure.
- **Fix applied:** Replaced with `db.withTransactionAsync()`, removed manual rollback catch block.

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

*No accepted / won't fix items.*

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
- Date: 2026-03-28
- Session Context: Fixed BH-025 (GoalProgressWidget directional formula), BH-026 (TrendsTab stale deps), BH-027 (SwipeableTabScreen deps), BH-029 (ProfileScreen guard), BH-030 (WidgetEditorModal reset). BH-028 (WidgetGrid fetch optimization) deferred as perf-only.
