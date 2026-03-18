---
description: Tracking document for performance regression findings from Performance Profiler QA passes
---

# Performance Profiler Audit Baseline

## Summary

- **Last full pass:** 2026-03-17 (Calendar Feature QA pass)
- **Open issues:** 1 (Low: 1)
- **Fixed this session:** 5
- **Negligible / Won't Fix:** 5

---

## Open Issues

### Low

**PP-020** — `loadOlderMonths()` sequential await in a loop
- Loads 3 older months **sequentially** (`for` loop with `await loadMonthData`)
- Each `loadMonthData` fires 4 parallel queries, but the months themselves are serialized
- Fix: Use `Promise.all([loadMonthData(m1), loadMonthData(m2), loadMonthData(m3)])`
- Status: **Open**
- Affected tier: **Budget devices** (perceived latency on scroll)

---

## Resolved (This Session: 2026-03-17)

| ID | Area | File | Fix Applied |
|----|------|------|-------------|
| PP-016 | N+1 query | `calendarService.ts` | Batch `IN (...)` query for exercise notes in `searchNotes()` |
| PP-017 | N+1 query | `calendarService.ts` | Batch `IN (...)` queries for exercises + sets in `getWorkoutsForDate()` |
| PP-018 | Full-history scan | `calendarService.ts` | Added 3-month lookback floor to `getFatigueDates()` query |
| PP-019 | Inline arrow props | `CalendarScreen.tsx` | Moved callback inside `DayCell` via `useCallback`; parent passes stable `date` + `onDayPress` |
| PP-012 | Redundant loading | `exerciseService.ts` | Module-level cache with invalidation on all 5 mutation functions |

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

---

## Historical Performance Issues

| Issue | Where | Fix | Fixed |
|-------|-------|-----|-------|
| N+1 query pattern in workout history | `workoutService.ts` | Batch loading with `IN` queries + Maps | 2026-01-06 |
| Full store subscription in WorkoutScreen | `WorkoutScreen.tsx` | Moved UI state to local `useState` | 2026-03-05 |
| Chart data recomputed every render | `AnalyticsScreen.tsx` | Added `useMemo` on chart data arrays | 2026-03-10 |
| X-axis label overlap causing layout thrashing | `ExerciseAnalyticsScreen.tsx` | Custom `labelComponent` with pre-computed positions | 2026-03-11 |

---

## Component Size Violations (Not Performance Issues)

| File | Lines | Over By |
|------|-------|---------|
| `ExercisePicker.tsx` | 630 | 5% |
| `CalendarScreen.tsx` | 1044 | **74%** |
| `calendarService.ts` | 806 | N/A (service, guardrail doesn't apply) |
| `DailyWorkoutModal.tsx` | 624 | 4% |

*`AnalyticsScreen.tsx` resolved (902 → 148 lines) via extraction to `src/components/analytics/`.*

**CalendarScreen.tsx** at 1044 lines is the most significant violation. ~230 lines are styles. The header, month block, and day cell are already extracted as sub-components, but the main `CalendarScreen` function (lines 528-808) manages 11 `useState` hooks, 8 callbacks, and 2 side effects. Recommended extraction:
- `useCalendarData` hook (data loading, month management, scroll-to-load)
- `CalendarHeader` to its own file
- Move styles to a separate file or co-locate with extracted components

---

## Last Updated
- Date: 2026-03-17
- Session Context: Calendar Feature performance audit — 7 new issues found, 0 fixed (identification pass), 2 negligible
