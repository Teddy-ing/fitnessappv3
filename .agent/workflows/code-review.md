---
description: Review substantive changes against behavior, regression risks, and data safety
---

# Code Review

**Updated: 2026-10-02.** [AGENTS.md](../../AGENTS.md) governs the workflow. Review substantive changes with a separate subagent. Three separate QA chats, exhaustive baseline audits, mandatory file-size refactors, and a log entry for every exchange are retired.

## Scope the review

Give the reviewer the acceptance criteria, actual diff, relevant callers, data paths, and verification already performed. Use Git and the current worktree to identify changed files; a progress entry is context rather than proof of the diff.

Review the surrounding implementation where needed to trace a failure. Broader audits are separate scoped work, not an automatic prerequisite for every change.

## Check the material risks

- Correctness of the requested behavior, empty states, failures, cancellation, repeated actions, and entity changes.
- Data safety: atomic writes, stable IDs, migration/upgrade paths, backup/restore compatibility, unit conversion, and unfinished-workout recovery.
- Logging speed and offline use; avoid adding account or payment friction.
- Native navigation, timers, permissions, lifecycle, keyboard behavior, and layout.
- Performance risks supported by the actual workload: repeated queries, broad subscriptions, expensive rendering, unbounded work, and leaked resources.
- Service/store boundaries and shared types/helpers when violations create a concrete maintenance or correctness risk.

Optional focused guides: [logic and runtime](qa/bug-hunter.md), [performance](qa/performance-profiler.md), and [maintainability](qa/tech-debt-auditor.md). Choose the relevant focus; they are not three mandatory review passes.

## Report and resolve

For each finding, provide a precise location, triggering scenario, user/data impact, and a suggested correction. Distinguish confirmed defects from unresolved questions. Style preferences, line counts, or hypothetical scale alone do not justify churn.

The implementing agent resolves confirmed in-scope findings and reruns the checks affected by the fix. If a material issue requires unavailable access or a product decision, record the exact gap instead of claiming completion.

## Finish

A review is complete when the agreed scope and acceptance criteria have been checked, concrete findings are resolved or explicitly accounted for, and relevant verification is complete. Stop expanding checks once material risks are covered.

The main agent records a short outcome in current progress and durable decisions in the relevant knowledge file. Existing audit baselines are historical references; do not recreate exhaustive inventories or duplicate findings across files.
