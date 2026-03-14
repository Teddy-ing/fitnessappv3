---
description: Tracking document for performance regression findings from Performance Profiler QA passes
---

# Performance Profiler Audit Baseline

## Summary

- **Last full pass:** 2026-03-14 (first comprehensive audit — entire project)
- **Open issues:** 1 (Medium: 1)
- **Fixed this session:** 12
- **Negligible / Won't Fix:** 3

---

## Open Issues

### Medium (Budget Device Impact)

**PP-012** — `ExercisePicker` loads all exercises on every modal open
- Calls `getExercises()` twice (visible + hidden) each time
- Fix: Cache at service level or only reload on mutation
- Status: **Deferred** — architecture change

---

## Resolved (This Session: 2026-03-14)

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
| `AnalyticsScreen.tsx` | 865 | 44% |
| `ExercisePicker.tsx` | 630 | 5% |

---

## Last Updated
- Date: 2026-03-14
- Session Context: First comprehensive audit — 15 issues found, 10 fixed, 3 deferred, 2 negligible
