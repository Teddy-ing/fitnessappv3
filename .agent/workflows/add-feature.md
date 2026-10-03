---
description: Implement a scoped feature while preserving logging speed and user data
---

# Add a Feature

**Updated: 2026-10-02.** Follow [AGENTS.md](../../AGENTS.md) for collaboration and authorization. This checklist supports that workflow; it does not require a separate PRD or approval at every phase.

## 1. Define the behavior

- Inspect the current implementation and relevant product notes.
- State observable acceptance criteria and affected paths.
- Clarify decisions that change product behavior, data safety, or scope. Choose sensible defaults for reversible details.
- Delegate substantive implementation with explicit file ownership. Keep shared-file edits sequential.

## 2. Plan data changes

When persistence changes:

- Update the shared models and append a versioned migration where needed.
- Trace save/load, hydration, unfinished-workout recovery, JSON/Drive backup, import/export, and clearing.
- Preserve record identities and relationships. Keep related writes atomic and guard double taps/concurrent operations.
- Store weight in pounds; convert at input/display boundaries using the shared helpers.
- Use the [migration workflow](database-migration.md) for schema changes.

## 3. Implement

- Keep services independent of stores; reuse existing queries, formulas, batching, units, and database coordination.
- Keep logging fast, with optional guidance and useful offline behavior.
- Handle loading, empty, failed, cancelled, and repeated-action states.
- Use theme tokens, readable text, accessible controls, and existing navigation patterns.
- Extract components or hooks when responsibilities justify it. File length alone is not a refactor requirement.

## 4. Verify and review

- Run `npm run typecheck` and relevant Jest tests for code changes.
- Add tests for meaningful behavior and regressions, especially calculations, persistence, and logging.
- Run the full suite when shared behavior or broad integration is affected.
- Verify affected native interaction, layout, permission, and lifecycle behavior on a device/emulator when available.
- Use a separate reviewer for substantive changes. Resolve concrete findings, then recheck the affected behavior. See [code review](code-review.md).

## 5. Record the outcome

The main agent adds a concise dated outcome to [current progress](../knowledge/current-progress.md): what changed, useful verification, unresolved work, and the next step. Put durable product or architecture decisions in the relevant knowledge file.

Do not create duplicate audit inventories or a log entry for every exchange. Leave changes uncommitted unless explicitly authorized otherwise.
