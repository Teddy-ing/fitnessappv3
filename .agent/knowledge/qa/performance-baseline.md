---
description: Tracking document for performance regression findings from Performance Profiler QA passes
---

# Performance Profiler Audit Baseline

## Summary

- **Last full pass:** 2026-03-24 (comprehensive full-project scan — 65+ files)
- **Open issues:** 2
- **Fixed this session:** 0
- **Negligible / Won't Fix:** 9

---

## Open Issues

### PP-036 · N+1 query pattern in `getTemplates()` + `findMatchingTemplate()` hot path
- **Category:** N+1 query / sequential await
- **File:** [templateService.ts:144-149](file:///c:/Users/teddy/projects/workout-app/src/services/templateService.ts#L144-L149)
- **What:** `getTemplates()` loads all templates, then loops with `await hydrateTemplate(row)` — each call fires a separate `SELECT` for template exercises. With 20 templates, that's 21 DB round trips. `hydrateTemplate()` also re-enters `getDatabase()` on every call.
- **Hot path:** `findMatchingTemplate()` (line 183) calls `getTemplates()` with full hydration on **every workout save** just to compare exercise ID lists. This could be a single SQL query.
- **Impact:** Save-time latency grows linearly with template count.
- **Fix:** Batch-load template exercises with `IN (...)` query (same pattern as `workoutService.getWorkouts()`). For `findMatchingTemplate()`, write a dedicated SQL query that compares exercise IDs without hydrating full template objects.

### PP-037 · Unbounded `IN (...)` clauses will crash at SQLite 999-parameter limit
- **Category:** Scalability / crash
- **Files:**
  - [workoutService.ts:292-300](file:///c:/Users/teddy/projects/workout-app/src/services/workoutService.ts#L292-L300) — `getWorkouts()` exercise/set batch
  - [calendarService.ts:326](file:///c:/Users/teddy/projects/workout-app/src/services/calendarService.ts#L326) — `getWorkoutsForDate()` set batch
  - [goalProgressService.ts:186-197](file:///c:/Users/teddy/projects/workout-app/src/services/goalProgressService.ts#L186-L197) — batch 1RM/volume/reps
- **What:** All batch `IN (?,?,?...)` queries build one placeholder per ID with no upper bound. SQLite's `SQLITE_MAX_VARIABLE_NUMBER` defaults to 999. A user with 1000+ workouts (< 3 years of daily training) will crash the query.
- **Impact:** Hard crash for long-term users.
- **Fix:** Chunk IDs into batches of 500, merge results. See conventions guardrail #8.

---

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
- Date: 2026-03-24
- Session Context: Staff engineer code audit added PP-036 (template N+1 + findMatchingTemplate hot path) and PP-037 (unbounded IN() clause hitting SQLite 999-param limit).
