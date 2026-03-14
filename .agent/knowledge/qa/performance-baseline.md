---
description: Tracking document for performance regression findings from Performance Profiler QA passes
---

# Performance Profiler Audit Baseline

## Summary

- **Last full pass:** 2026-03-14 (initial — no findings yet)
- **Open issues:** 0 (Critical: 0, High: 0, Medium: 0, Low: 0)
- **Fixed since baseline:** 0

---

## Open Issues

### Critical (Visible Jank / Blocking)

*No open critical issues.*

### High (Measurable Slowdown)

*No open high issues.*

### Medium (Budget Device Impact)

*No open medium issues.*

### Low (Theoretical / Minor)

*No open low issues.*

---

## Resolved

*No resolved issues yet.*

---

## Accepted / Won't Fix

*No accepted issues yet.*

---

## Historical Performance Issues

These were found and fixed before this baseline was created. Documented here for regression awareness:

| Issue | Where | Impact | Fix | Fixed |
|-------|-------|--------|-----|-------|
| N+1 query pattern in workout history | `workoutService.ts` | O(n) queries per workout on home screen load | Batch loading with `IN` queries + Maps | 2026-01-06 |
| Full store subscription in WorkoutScreen | `WorkoutScreen.tsx` | Re-render on every store mutation | Moved UI state to local `useState` | 2026-03-05 |
| Chart data recomputed every render | `AnalyticsScreen.tsx` | Jank when switching time ranges | Added `useMemo` on chart data arrays | 2026-03-10 |
| X-axis label overlap causing layout thrashing | `ExerciseAnalyticsScreen.tsx` | Expensive relayout on scroll | Custom `labelComponent` with pre-computed positions | 2026-03-11 |

---

## Device Testing Notes

| Device | OS | Result | Date |
|--------|-----|--------|------|
| *No device tests recorded yet* | | | |

---

## Last Updated
- Date: 2026-03-14
- Session Context: Initial creation — historical issues seeded from session logs
