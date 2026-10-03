---
description: Focused review of responsiveness and resource use
---

# Performance Review

**Updated: 2026-10-02.** Use this focus within the [code review workflow](../code-review.md) for logging, large lists, charts, stores, or database queries.

## Review brief

Prioritize responsiveness during a workout on a typical Android phone. Compare the changed behavior with representative histories and the current implementation.

- Check Zustand subscriptions for unrelated updates that rerender expensive screens.
- Trace repeated database calls, N+1 queries, missing useful indexes, and unbounded result processing.
- Inspect list virtualization, stable identity, and chart recomputation when they affect actual workloads.
- Check interval/listener cleanup and large objects retained after navigation.
- Inspect image loading and memory use with the packaged exercise artwork and progress photos.
- Look for synchronous work that delays set entry, keyboard feedback, screen transitions, or startup.

Memoization, selector changes, and pagination should address observed or clearly supported costs. Inline callbacks, static asset requires, or a missing `React.memo` are not automatically performance defects.

## Verify and report

Measure on a device when available, noting device/build, data size, action, and before/after behavior. An emulator or code inspection can expose a risk but does not establish real-phone frame timing.

Report concrete impact and the smallest useful fix. Recheck after the change. Stop when the affected behavior is sufficiently covered; no separate performance chat or exhaustive baseline inventory is required.
