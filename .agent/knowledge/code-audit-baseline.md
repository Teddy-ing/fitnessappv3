---
description: Code quality tracking - current audit findings, resolved items, and patterns
---

# Code Audit Baseline

## Current app as of 2026-10-02

This January baseline is preserved as historical evidence, not a current release sign-off. Root [AGENTS.md](../../AGENTS.md) supersedes older compulsory audit workflows and size/hook-count gates.

- The two historical open `SetRow` findings no longer describe current source: `src/components/SetRow.tsx` uses `useState` for its menus/selectors and uses `onRemoveSet` through a `Swipeable` delete action. Their original descriptions and checkboxes remain below to preserve the audit record.
- Current workout persistence includes coordinated SQLite writes and a separate active-workout JSON snapshot. Schema migrations run through 21; canonical pound input/display helpers replace the older raw-unit assumptions. These facts do not establish every failure/recovery path has been verified.
- More detailed historical IDs are in [Bug Hunter](qa/bug-hunter-baseline.md), [Performance](qa/performance-baseline.md) and [Tech Debt](qa/tech-debt-baseline.md). Current implementation outcomes and the scope of recorded tests/device checks are in [current progress](current-progress.md).
- This refresh inspected source and updated documentation only. The “GOOD,” timing and query-count claims below belong to the 2026-01-06 session and must not be presented as newly measured release results.

## Historical audit record

## Summary

- **Last full audit:** 2026-01-06
- **Open issues:** 2 (H: 0, M: 0, L: 2)
- **Fixed since baseline:** 4

---

## Open Issues

### Low Severity

- [ ] **Unused `onRemove` prop in SetRow** — `SetRow.tsx:23` — Dead Code — **Low**
  - Why: `onRemove` is declared as a prop but never used. No swipe-to-delete UI exists.
  - Fix: Either implement swipe-to-delete or remove the unused prop.

- [ ] **Unused `useState` import** — `SetRow.tsx:10` — Dead Code — **Low**
  - Why: `useState` is imported but not used in the component.
  - Fix: Remove unused import.

---

## Resolved

- [x] **Wrong crypto API in user.ts** — Fixed 2026-01-06
  - Changed from `crypto.randomUUID()` to timestamp-based unique ID generation.

- [x] **N+1 query pattern in workoutService** — Fixed 2026-01-06
  - Implemented batch loading with IN queries and Maps for grouping data.

- [x] **Hardcoded "lbs" in SetRow** — Fixed 2026-01-06
  - Added `weightUnit` prop that defaults to 'lbs' but can be overridden.

- [x] **No error handling in database transaction** — Fixed 2026-01-06
  - Wrapped transaction in try/catch with logging.

---

## Accepted / Won't Fix

*No accepted issues yet.*

---

## Fitness App Critical Path Checks

### 1. Set logging flow (<3 seconds) ✅
- **Status:** GOOD

### 2. Data persistence (atomic saves) ✅
- **Status:** GOOD

### 3. Offline capability ✅
- **Status:** GOOD

### 4. History loading efficiency ✅
- **Status:** FIXED — Now uses batch queries (3 queries total)

---

## Last Updated
- Date: 2026-01-06
- Session Context: Fixed high and medium severity issues from baseline audit
