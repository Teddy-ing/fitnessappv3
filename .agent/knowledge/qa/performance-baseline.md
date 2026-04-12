---
description: Tracking document for performance regression findings from Performance Profiler QA passes
---

# Performance Profiler Audit Baseline

## Summary

- **Last full pass:** 2026-04-11 (Exercise Details Master Guide — 14 files)
- **Open issues:** 1 (0 confirmed, 1 likely carried over from 2026-03-30)
- **Fixed this session:** 4
- **Negligible / Won't Fix:** 22

---

## Open Issues

### Confirmed Regressions

*All confirmed regressions resolved.*

### Likely Impact

| ID | Area | File | Issue | Fix |
|----|------|------|-------|-----|
| PP-045 | Store subscription | `workoutStore.ts:641` | `useWorkoutStore.subscribe()` fires on every state change (incl. `lastCompletedSet`, `collapsedExercises`, `previousSets`), not just persistence-relevant fields. | Add shallow-compare guard or `subscribeWithSelector` middleware. |

---

## Resolved (Session: 2026-04-11 — Exercise Details Master Guide)

| ID | Area | File | Fix Applied |
|----|------|------|-------------|
| PP-050 | Inline arrow prop | `ExerciseCard.tsx` | Extracted inline `onPress` arrow into `handleInfoPress` via `useCallback([exercise.id, exercise.name])`. Restores `React.memo` effectiveness on hot-path component. |
| PP-051 | Chart data not memoized | `ChartsTab.tsx` | Wrapped `chartData`, `maxValue`, `latestValue`, `needsScroll` in `useMemo([data])` inside both `TimeSeriesLineChart` and `VolumeBarChart`. Eliminates ~60 allocations per render. |
| PP-052 | React.memo missing | `HistoryTab.tsx` | Wrapped `SessionCard` in `React.memo`. Props are `session` object + `weightUnit` string — shallow compare is effective. |
| PP-053 | Render-path compute | `RecordsTab.tsx` | Pre-computed `_formattedDate` in `useEffect` data transform (alongside `computeEpley1RM`). Render loop now reads cached string. Same pattern as PP-011. |

## Resolved (Session: 2026-03-30 — Workout Logging Refactor)

| ID | Area | File | Fix Applied |
|----|------|------|-------------|
| PP-042 | Inline arrow props | `WorkoutScreen.tsx`, `SupersetGroup.tsx`, `ExerciseCard.tsx` | Changed `onAddWarmupSets` prop to `(exerciseId, count)` signature. ExerciseCard now accepts `defaultWarmupSets` prop and calls `onAddWarmupSets(exerciseId, count)` internally. Parents pass stable store action ref. |
| PP-043 | Inline arrow props | `WorkoutScreen.tsx`, `SupersetGroup.tsx` | Replaced `(exId) => setReplaceExerciseId(exId)` with direct `setReplaceExerciseId` (stable useState setter). SupersetGroup forwards directly instead of wrapping. |
| PP-044 | ScrollView + .map() | `WorkoutScreen.tsx`, `RenderableExerciseItem.tsx` | Migrated exercises list from `ScrollView` + `.map()` to `FlatList` with pre-processed `RenderableItem` data. Superset groups collapsed into single entries. renderItem extracted to `RenderableExerciseItem` component. |

## Resolved (Session: 2026-03-24 — Staff Engineer Audit)

| ID | Area | File | Fix Applied |
|----|------|------|-------------|
| PP-036 | N+1 query / sequential await | `templateService.ts` | Rewrote `getTemplates()` to batch-load all template exercises in 2 queries (vs N+1). Rewrote `findMatchingTemplate()` to use lightweight SQL query for exercise IDs, hydrating only the match. |
| PP-037 | Scalability / crash | `workoutService.ts`, `calendarService.ts`, `goalProgressService.ts` | Created shared `batchGetAll()` utility in `src/utils/batchQuery.ts` (500-item chunks). Applied to all 10 IN() query sites across 3 services + templateService. Prevents SQLite 999-param crash. |

## Resolved (Session: 2026-03-24 — Goals Feature)

| ID | Area | File | Fix Applied |
|----|------|------|-------------|
| PP-031 | N+1 query / sequential await | `goalService.ts` | Batched `refreshAllGoalProgress()` — groups active goals by type, runs one aggregation query per type (1RM, volume, reps, measurement, consistency) with `IN(...)`, then batch-UPDATEs. Reduces 20+ serial DB round-trips to ~6–7 total. |
| PP-032 | React.memo | `GoalCard.tsx`, `CompletedGoalCard.tsx` | Wrapped both card components in `React.memo`. Props are primitives + stable Map lookups, so memoization is effective. |
| PP-033 | Sequential DB calls | `GoalsScreen.tsx` | Replaced per-goal `getExerciseById()` loop with single cached `getExercises()` call + `Map<id, Exercise>` lookup. Eliminates N DB round-trips for exercise goal display info. |

## Resolved (Session: 2026-03-23)

| ID | Area | File | Fix Applied |
|----|------|------|-------------|
| PP-023 | N+1 query | `measurementService.ts`, `TrendsTab.tsx` | New `getSparklineDataBatch()` single `IN(...)` query; `loadSparklines()` uses batch |
| PP-024 | Render-path compute | `TrendsTab.tsx` | `useMemo` on `chartData`, `overlayChartData`, `hasAnyOverlay`, `maxValue` |
| PP-025 | Inline arrow props | `GalleryTab.tsx` | `PhotoCell` wrapped in `React.memo`; receives stable `onGridPress`/`onDeletePress` callbacks |
| PP-026 | Redundant loading | `TrendsTab.tsx` | Hoisted `getExercises()` above `if/else` + `Promise.all` with `getSettings()` |
| PP-028 | Non-virtualized list | `TrendsTab.tsx` | Replaced `ScrollView` + `.map()` with `FlatList` in exercise picker modal |
| PP-030 | Algorithmic inefficiency | `TrendsTab.tsx` | `Map<string, number>` for O(1) overlay date lookups (was O(n²) `.find()`) |

---

## Resolved (Session: 2026-03-17)

| ID | Area | File | Fix Applied |
|----|------|------|-------------|
| PP-016 | N+1 query | `calendarService.ts` | Batch `IN (...)` query for exercise notes in `searchNotes()` |
| PP-017 | N+1 query | `calendarService.ts` | Batch `IN (...)` queries for exercises + sets in `getWorkoutsForDate()` |
| PP-018 | Full-history scan | `calendarService.ts` | Added 3-month lookback floor to `getFatigueDates()` query |
| PP-019 | Inline arrow props | `CalendarScreen.tsx` | Moved callback inside `DayCell` via `useCallback`; parent passes stable `date` + `onDayPress` |
| PP-012 | Redundant loading | `exerciseService.ts` | Module-level cache with invalidation on all 5 mutation functions |
| PP-020 | Sequential await | `CalendarScreen.tsx` | `Promise.all` for parallel month loading in `loadOlderMonths`/`loadNewerMonths` |

---

## Resolved (Session: 2026-03-14)

| ID | Area | File | Fix Applied |
|----|------|------|-------------|
| PP-001 | Zustand selectors | `WorkoutScreen.tsx` | `s => s.activeWorkout` selector + `getState()` for actions |
| PP-002 | Zustand selectors | `useWorkoutKeyboard.ts` | Same pattern as PP-001 |
| PP-003 | Zustand selectors | `ExerciseCard.tsx` | Fine-grained `restTimerStore` selectors per field |
| PP-005 | React.memo | `ExerciseCard.tsx`, `SetRow.tsx` | Wrapped in `React.memo` |
| PP-006 | Inline arrow props | `ExerciseCard.tsx`, `WorkoutScreen.tsx` | Store-shaped props with `exerciseId` |
| PP-007 | Chart rendering | `AnalyticsScreen.tsx` | `useMemo` on chart data transformation |
| PP-008 | Render-path compute | `WorkoutScreen.tsx` | `useMemo` on `getWorkoutStats` |
| PP-009 | Zustand selectors | `RestTimer.tsx` | Fine-grained selectors per field |
| PP-010 | Data loading | `useHomeScreenData.ts` | `checkAndAdvanceIfNewDay()` in parallel `Promise.all` |
| PP-004 | FlatList | `AnalyticsScreen.tsx` | Replaced `.map()` with `FlatList` virtualization + `ListHeaderComponent` |
| PP-011 | Render-path compute | `AnalyticsScreen.tsx` | Pre-computed date strings in `useMemo` |

---

## Accepted / Won't Fix

**PP-013** — `Dimensions.get('window')` at module level — portrait-locked, no impact.

**PP-014** — `analyticsService.ts` at 865 lines — service, not component; guardrail doesn't apply.

**PP-015** — `saveWorkout` sequential DB writes — inside transaction, not a hot path.

**PP-021** — `DailyWorkoutModal` uses `useWorkoutStore.getState()` inside callback — correct pattern (not a subscription), no re-render impact.

**PP-022** — `DailyWorkoutModal` sub-components (`WorkoutCard`, `ExerciseCard`, `SetRow`, `SummaryBadge`) not wrapped in `React.memo` — inside a modal with a few items, not a hot path. Would matter if a user logged 10+ exercises per workout.

**PP-027** — `Dimensions.get('window')` at module level in `TrendsTab.tsx` / `GalleryTab.tsx` — same as PP-013, portrait-locked.

**PP-029** — `MetricInputRow` list uses `.map()` — acceptable for ~10–12 items.

**PP-034** — `MeasurementStep` in `GoalCreationSteps.tsx` uses `ScrollView` + `.map()` instead of `FlatList` for measurement type list — only ~15 items (seeded measurement types), not a hot path, inside a modal wizard step.

**PP-035** — `Dimensions.get('window')` at module level in `GoalCelebrationOverlay.tsx` — same as PP-013/PP-027, portrait-locked.

**PP-038** — `WidgetGrid` `getWidgetPressHandler(widget)` returns fresh arrow function inside `.map()` loop. Max 6 widgets / ~4 rows — cost of re-rendering `TouchableOpacity` wrappers is trivially small.

**PP-039** — `WidgetEditorModal.getWidgetLabel()` / `getWidgetIcon()` use `WIDGET_CATALOG.find()` (linear search). 6 widgets × 7 catalog entries = 42 iterations max. Not measurable.

**PP-040** — `BodyweightSparklineWidget` / `PinnedExerciseWidget` compute `Math.min/max(...values)` outside `useMemo`. Max 30 data points. Sub-microsecond.

**PP-041** — `Dimensions.get('window')` at module level in `WidgetEditorModal.tsx` — same as PP-013/PP-027/PP-035, portrait-locked.

**PP-046** — `Dimensions.get('window')` at module level in `WorkoutKeyboard.tsx` — same as PP-013/PP-027/PP-035/PP-041, portrait-locked.

**PP-047** — `PlateCalculator` renders plate rows via `.map()` without `React.memo`. Max 6-7 standard plate sizes — trivially small.

**PP-048** — `RpeSelector` / `RirSelector` render 6-9 pills via `.map()` without `React.memo`. Static data modals with max 9 items. No measurable cost.

**PP-049** — `ExerciseMenu` builds `items` array inline on every render. Menu is only visible when user opens it — never in the hot render path.

**PP-054** — `Dimensions.get('window')` at module level in `ChartsTab.tsx` — same as PP-013/PP-027/PP-041/PP-046, portrait-locked.

**PP-055** — Notes list in `AboutTab.tsx` rendered via `.map()` inside ScrollView without `React.memo` on `NoteCard`. Max ~5–10 notes per exercise. Not a hot path.

**PP-056** — Records table rows in `RecordsTab.tsx` rendered via `.map()` without `React.memo`. Max 12–15 rows. Static data, no interaction during render. Same as PP-029 (accepted).

**PP-057** — Inline arrow `onPress={() => onTabChange(t.key)}` in `ExerciseDetailsScreen.tsx` tab pills. 4 tab buttons. Trivially small.

**PP-058** — `formatEquipment`/`formatNoteDate` string transforms called in `AboutTab.tsx` render path. ~2–3 equipment items, ~5 notes. Sub-microsecond ops.

---

## Historical Performance Issues

| Issue | Where | Fix | Fixed |
|-------|-------|-----|-------|
| N+1 query pattern in workout history | `workoutService.ts` | Batch loading with `IN` queries + Maps | 2026-01-06 |
| Full store subscription in WorkoutScreen | `WorkoutScreen.tsx` | Moved UI state to local `useState` | 2026-03-05 |
| Chart data recomputed every render | `AnalyticsScreen.tsx` | Added `useMemo` on chart data arrays | 2026-03-10 |
| X-axis label overlap causing layout thrashing | `ExerciseAnalyticsScreen.tsx` | Custom `labelComponent` with pre-computed positions | 2026-03-11 |

---

## Last Updated
- Date: 2026-04-11
- Session Context: Performance Profiler pass on Exercise Details Master Guide feature. 14 files reviewed. 2 confirmed regressions (PP-050–PP-051) + 2 likely (PP-052–PP-053) found and fixed. 5 negligible (PP-054–PP-058). TypeScript 0 errors.
