---
description: Focused review of maintainability and architectural risks
---

# Maintainability Review

**Updated: 2026-10-02.** Use this focus within the [code review workflow](../code-review.md) when a substantive change affects shared architecture or complicates an existing responsibility.

## Review brief

Identify concrete risks in the current implementation and the scoped work ahead:

- Services depending on stores or UI concerns that make domain behavior hard to reuse or test.
- Persisted fields omitted from models, hydration, migration, backup/restore, exports, or clearing.
- Duplicated formulas, unit conversions, row mapping, or transaction logic that can produce inconsistent results.
- Stateful hooks that mix unrelated responsibilities or fail to reset on identity changes.
- Competing ownership of database writes, caching, or async cancellation.
- Navigation/state boundaries that lose an active workout or unexpectedly reset a screen.
- Abstractions that add maintenance work without a current use, or missing abstractions where repeated behavior already diverges.

The app currently has two main tabs, implemented Profile widgets, import/export, and local suggestions. Review against this code, not an old roadmap that treats these as upcoming phases.

## Findings and completion

A finding needs the affected responsibility, an actual failure or maintenance scenario, and a proportionate improvement. File length, hook count, hypothetical user count, and stylistic preferences alone are not findings.

Resolve relevant issues within scope. Broader redesigns require a separate product/engineering task rather than being smuggled into a review. Record a durable architectural decision only when it helps future work; historical baselines are references, not required tracking destinations.
