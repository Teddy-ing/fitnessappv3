# Agent Instructions

## Working agreement

The user normally starts work with `/goal <desired change>`. The main chat owns the task from clarification through implementation, review, and verification. Keep the user involved in meaningful product decisions and let agents handle execution.

Subagent delegation is authorized for project work. Use available goal tracking for explicit goal requests; ordinary requests follow the same workflow without automatically creating a goal.

This file supersedes older procedural requirements in `.agent/knowledge/` and `.agent/workflows/`. Those documents remain useful references for product decisions, architecture, and known issues. Required PRDs, three separate QA chats, mandatory size or hook-count refactors, exhaustive audit baselines, and a log entry for every exchange are retired.

## From request to finished change

1. **Understand the task.** Inspect the current branch, working tree, relevant code, and current progress. Read only the supporting documents that help with this task. Confirm existing behavior from code when notes are stale.
2. **Clarify consequential gaps.** Ask one concise batch of questions if the answers materially affect scope, user behavior, data safety, or an irreversible decision. Wait for required answers before dependent edits; continue independent inspection or work meanwhile. Choose sensible defaults for reversible implementation details and state significant assumptions. Do not require approval at each routine phase.
3. **Define success and delegate.** Establish a short plan and observable acceptance criteria. Assign scoped implementation work to subagents; parallelize independent work. Small, trivial changes may stay with the main agent when delegation would add overhead.
4. **Implement and integrate.** Complete the requested behavior, handle affected paths, and integrate the agents' work. Fix discovered issues within scope autonomously. Avoid unrelated redesigns or speculative cleanup.
5. **Verify and review.** After the core change works, use a separate subagent to review substantive changes against the acceptance criteria, regression risks, and data safety. Run the relevant checks, resolve confirmed findings, and recheck affected behavior. Findings should identify a concrete defect or risk; style preferences and line counts alone do not justify churn.
6. **Hand off the result.** Summarize what changed, what was verified, and any remaining limitations or user action. Update the project records as described below. The task is complete when the requested outcome is achieved and required checks are resolved; report blockers honestly when completion depends on unavailable access or a user decision.

## Delegation and shared files

- The main agent owns decomposition, integration, final verification, and the user-facing response. Delegate actual implementation for substantive work, as well as independent review.
- Give each subagent a clear outcome, relevant context, acceptance criteria, and explicit file ownership. Check for dependencies before parallelizing.
- All agents share the working tree. Give each file one writer at a time; sequence edits to shared files through their owner or the main agent. Never revert or overwrite another agent's or the user's work.
- When another chat is editing the same checkout, coordinate overlapping work or use an isolated worktree through the available tools. Do not switch or reset a shared checkout to make room for a task.
- Subagents report changes, checks, findings, and blockers to the parent. They do not each create another team or update progress documents unless the main agent explicitly assigns that work.
- If delegation, device access, or another tool is unavailable, do feasible work directly and report the exact remaining gap. Never claim an unperformed review or test, and do not stop solely because a subagent cannot be started.

## Product priorities

- Serve experienced lifters first: fast workout logging, minimal taps, optional beginner support, and no forced onboarding.
- Deliver polished UI with an affordable or free core. Avoid adding payment or account friction to basic logging.
- Preserve local and offline use, privacy, data ownership, and practical export. A user's workout history must survive upgrades and feature changes.

## Architecture and data safety

The app uses React Native, Expo, TypeScript, Zustand, and `expo-sqlite`.

- Keep services independent of stores. Reuse the existing hydration, formulas, unit conversion, batching, and database coordination helpers where applicable.
- Add schema changes through new versioned migrations in `src/services/migrations.ts`; never rewrite shipped migrations. Preserve existing records and verify both a fresh database and an upgrade when changing schema.
- Weight is stored canonically in pounds. Use `src/utils/unitConversion.ts` at input and display boundaries; preserve the storage conventions for other measurements and import sources.
- Keep related writes atomic and guard non-idempotent operations against concurrent invocation and double taps. Preserve parent identities and related history when updating records.
- Carry new persisted fields through save/load, backup/restore, import/export, and data clearing as applicable. Maintain compatibility with existing backups and histories; verify round trips when these paths change.
- Prefer clear, typed code and cohesive components. Extract code when responsibilities or reuse warrant it, rather than to satisfy a line or hook count.

## Verification proportional to the change

- For code changes, run `npm run typecheck` and relevant Jest tests; use `npm test -- --runInBand` for the full suite when shared behavior or broad integration warrants it.
- Add or update tests for meaningful behavior changes and regressions, especially persistence, calculations, and logging. Avoid tests that merely repeat the implementation or test documentation edits.
- Run lint only if its tooling and configuration are available. A script name alone does not establish a working check.
- Use device or emulator checks for affected mobile interactions, layout, permissions, lifecycle, and native behavior when access is available. Automated checks do not establish that a screen works on a phone.
- Distinguish pre-existing failures from regressions and report unverified behavior. Stop expanding checks once the task's acceptance criteria and material risks are sufficiently covered.

## Git and project memory

- Work on the selected branch and preserve unrelated edits. Use an isolated checkout when concurrent work requires it, following the coordination rules above.
- Do not commit, push, merge, publish, or release unless specifically authorized. The current standing preference is to leave changes uncommitted for review; a `/goal` request alone does not authorize those actions.
- After substantive work, the main agent adds a short outcome to `.agent/knowledge/current-progress.md`: what changed, important verification, unresolved blockers, and the next useful step. Also save durable product or architecture decisions and their rationale in the relevant knowledge file.
- Read reference documents as needed; do not rewrite historical logs or maintain exhaustive duplicate inventories. Create or update a workflow only when a reusable procedure actually needs documenting.
- Before an explicit chat handoff, ensure another agent can resume from the recorded state without reconstructing the conversation.
