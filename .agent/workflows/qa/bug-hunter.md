---
description: Focused review of logic, runtime behavior, and data safety
---

# Logic and Runtime Review

**Updated: 2026-10-02.** Use this focus within the [code review workflow](../code-review.md) when changes affect behavior or persistence. It does not require a separate chat or baseline update.

## Review brief

Review the diff and relevant callers against the acceptance criteria. Trace concrete user actions that could crash the app, corrupt records, or leave the UI inconsistent.

Check the affected areas:

- SQLite empty/null results, failed initialization, and hydration of dates, optional fields, and legacy rows.
- Atomic multi-table writes, stable parent IDs, foreign keys, write coordination, and repeated taps.
- Entity-scoped hooks and async results after workout, exercise, split, or navigation identity changes.
- Template/split cycling, rest days, set types, supersets, and reordered or deleted items.
- Timer deadlines across background/resume, stale scheduling requests, skipped timers, and duplicate alerts.
- Import/restore validation, schema compatibility, canonical weight units, and backup round trips.
- Unfinished-workout persistence, settings reload, cancellation, and error recovery.

## Findings and completion

Each finding needs a location, reproducible or clearly traced trigger, user/data impact, and suggested fix. Verify old issue references against the current code before treating them as open bugs.

Resolve confirmed in-scope defects and rerun relevant tests. Record unavailable native verification or required decisions explicitly. Do not treat line counts or missing defensive checks without a reachable failure as defects.
