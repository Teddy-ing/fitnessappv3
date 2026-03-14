---
description: Step-by-step workflow for running the Bug Hunter (Logic & Runtime) QA pass on code diffs
---

# Bug Hunter QA Workflow

Focused review for logic bugs, runtime errors, and edge cases — the things that crash the app or corrupt data.

## Prerequisites

- Access to `.agent/knowledge/qa/bug-hunter-baseline.md`
- Familiarity with `conventions.md` guardrails (especially #2, #5, #6)
- Diff or list of changed files for the feature under review

---

## When to Run

- **After implementing a feature** (before committing)
- **After fixing a bug** (verify the fix doesn't introduce new ones)
- **Before any release** (final sanity check)

---

## Steps

1. **Identify the scope**
   - Get the list of new/modified files from the session log in `current-progress.md`
   - Or use `git diff --name-only` against the last clean commit

2. **Run the Bug Hunter prompt**
   - Open a new chat session
   - Paste the tailored Bug Hunter prompt (from `tailored_qa_prompts.md` or below)
   - Attach the diff or changed files as context
   - Let the reviewer run to completion

3. **Triage findings**
   - For each issue reported, classify:
     - **🔴 Confirmed bug** — reproduce or clearly trace the failure path
     - **🟡 Plausible** — can't immediately reproduce but logic looks wrong
     - **⚪ False positive** — reviewer misunderstood context; note why
   - Add confirmed/plausible issues to `bug-hunter-baseline.md`

4. **Fix confirmed bugs**
   - Fix inline if trivial (<5 lines)
   - Create a separate fix commit if substantial
   - Update `bug-hunter-baseline.md` → move to Resolved section

5. **Re-run on fix diff (if substantial)**
   - If fixes touched >3 files or >50 lines, run the prompt again on just the fix diff
   - Goal: ensure fixes didn't introduce new issues

---

## The Prompt

> Act as a meticulous QA Automation Engineer and Security Researcher reviewing a **React Native + Expo + TypeScript** fitness app. The app uses **Zustand** for state management, **expo-sqlite** for local persistence, and a **versioned migration system** for schema changes. Review this code diff strictly for logic bugs, runtime errors, and edge cases. Ignore architectural choices and formatting. Point out:
>
> - Missing null/undefined checks — especially on **SQLite query results**, **hydration functions** that parse raw DB rows, and **Zustand store selectors**.
> - **Stale closure bugs** in `useEffect` / `useCallback` / `useRef` patterns — particularly in hooks that watch entity IDs (e.g. workout ID, split ID) and must reset state on identity change.
> - Unhandled promise rejections or missing error boundaries — the app wraps critical sections in `<ErrorBoundary>`, check that new components are covered.
> - **SQLite transaction safety** — writes must be atomic; check for partial writes on workout saves or template operations.
> - Off-by-one errors in loops, arrays, or **template cycling logic** (index math on `SplitScheduleItem[]` that must skip rest days).
> - Flaws in conditional logic, including incorrect set type badge rendering (`Working`/`Warmup`/`Drop`/`Failure`/`AMRAP`) and **superset grouping** edge cases.
> - **Timer and background state issues** — rest timer uses `endTime` timestamps; verify correctness across app background/foreground transitions.
> - **Hydration bugs** — `hydration.ts` maps raw SQL rows to typed models. Check for epoch vs ISO date confusion, missing field mappings, and negative value clamping.
>
> For every issue found, provide the exact line/block, explain how it fails (with a concrete scenario a gym user would hit), and provide the fix.

---

## Checklist Areas (What the Prompt Targets)

| Area | What to Look For |
|------|-----------------|
| SQLite results | Null rows, empty arrays, missing fields |
| Hydration layer | Epoch↔ISO confusion, unmapped new fields, negative values |
| Stale closures | `useEffect` missing deps, hooks not resetting on ID change |
| ErrorBoundary gaps | New screens/components not wrapped |
| Transaction atomicity | Partial writes on multi-table saves |
| Template cycling | Index math, rest day skipping, out-of-bounds |
| Set type logic | Badge rendering, superset grouping edge cases |
| Rest timer | Background/foreground timestamp reconciliation |

---

## Stop Conditions

The pass is COMPLETE when:
- All files in scope have been reviewed
- All findings are triaged (confirmed / plausible / false positive)
- Confirmed bugs are fixed or logged in baseline
- No new patterns emerging

---

## Last Updated
- Date: 2026-03-14
- Session Context: Initial creation — tailored from generic Bug Hunter prompt
