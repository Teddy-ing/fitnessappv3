---
description: Code quality tracking - current audit findings, resolved items, and patterns
---

# Code Audit Baseline

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
