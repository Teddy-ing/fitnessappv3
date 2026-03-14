---
description: Step-by-step workflow for running the Tech Debt Auditor QA pass on the codebase
---

# Tech Debt Auditor QA Workflow

Ruthless review for architectural rot, anti-patterns, and scalability bottlenecks — the things that make the codebase unmaintainable over time.

## Prerequisites

- Access to `.agent/knowledge/qa/tech-debt-baseline.md`
- Familiarity with all `conventions.md` guardrails (#1–#7)
- Knowledge of upcoming roadmap phases (Settings, Import/Export, ML, Chatbot)
- Diff for per-feature reviews, or full `src/` scan for quarterly audits

---

## When to Run

- **After completing a major feature phase** (e.g., Analytics, Exercise List refactor)
- **Quarterly** (full codebase scan — schedule alongside baseline audit from `/code-review`)
- **Before starting a new roadmap phase** (ensure foundation supports upcoming work)
- **After a large refactor** (verify the refactor actually improved things)

---

## Steps

1. **Identify the scope**
   - **Per-feature:** Changed files from session log
   - **Quarterly:** Full `src/` directory scan
   - **Pre-phase:** Files in the areas the next phase will build on

2. **Run the Tech Debt Auditor prompt**
   - Open a new chat session
   - Paste the tailored Tech Debt Auditor prompt (from `tailored_qa_prompts.md` or below)
   - Attach the diff or full file set as context
   - Let the reviewer run to completion — expect harsh feedback, that's the point

3. **Triage findings**
   - For each issue reported, classify:
     - **🔴 Active debt** — will cause problems in the next 1–2 phases
     - **🟡 Latent debt** — acceptable now but will bite during Phase 5+ (Settings, Import, ML)
     - **⚪ Acceptable / Won't Fix** — trade-off is understood and documented
   - Add active/latent issues to `tech-debt-baseline.md`

4. **Address active debt**
   - Fix inline if the change is safe and <20 lines
   - Create a dedicated refactor task if substantial
   - Update `tech-debt-baseline.md` → move to Resolved section

5. **Update conventions if patterns emerge**
   - If the reviewer identifies a recurring anti-pattern not yet in `conventions.md`, add a new guardrail
   - Format: numbered guardrail with explanation (see existing guardrails #1–#7)

6. **Cross-reference with existing baselines**
   - Check if any findings overlap with `code-audit-baseline.md` (general code quality)
   - Check if any findings overlap with `bug-hunter-baseline.md` or `performance-baseline.md`
   - Avoid duplicate tracking — reference the canonical location

---

## The Prompt

> Act as a highly critical senior Staff Engineer familiar with **React Native + Expo + TypeScript** fitness apps at scale. Review this codebase specifically looking for technical debt, anti-patterns, and future scalability bottlenecks. Do not compliment the code. Be ruthless. Tell me exactly what will break first and what is currently unmaintainable.
>
> **Project context you must factor in:**
> - State management is **Zustand** — stores should hold domain state only; UI state belongs in component-local `useState`. Any UI state leaking into stores is a regression (this was already fixed once).
> - Database is **expo-sqlite** with a **versioned migration system** (`migrations.ts`). Any schema change not going through a migration is a critical violation.
> - Canonical types live in `src/models/`. Service files must not re-declare model types — import them. Flag any type re-declarations.
> - Components should stay under **600 lines**. If one exceeds this, flag it as needing extraction.
> - Hooks managing entity-scoped state must **reset on identity change** (e.g., watching workout ID). Missing resets = stale data bugs.
> - The project has a known open bug: **BUG-001 (superset unlink)** — if your review touches this area, note whether the code makes it worse.
>
> **Specifically evaluate:**
> - Are service boundaries clean? (`workoutService`, `templateService`, `splitService`, `analyticsService`, `exerciseService`) — or is logic bleeding across services?
> - Is the hydration layer (`hydration.ts`) a single point of failure? What happens when a new field is added to a model but hydration isn't updated?
> - Are the Zustand stores testable in isolation? Do they have side effects that make testing fragile?
> - Is the navigation structure (3-tab bottom nav + stack modals) going to scale to Settings, Import/Export, and ML features on the roadmap?
> - Is there enough separation between "data fetching" and "data display" to support the upcoming Widget framework (Phase 3)?
> - **What will break first when the user base grows from 1 to 1,000 concurrent installs?** (All local storage — no server — but consider SQLite write contention, migration failures on update, etc.)

---

## Checklist Areas (What the Prompt Targets)

| Area | What to Look For |
|------|-----------------|
| Store architecture | UI state in Zustand stores (regression), side effects in stores |
| Migration system | Schema changes bypassing `migrations.ts` |
| Type ownership | Types re-declared outside `src/models/` |
| Component size | >600 lines (guardrail #1) |
| Entity ID resets | Hooks not resetting state when entity identity changes |
| Service boundaries | Logic bleeding across service files |
| Hydration fragility | New model fields not mapped in `hydration.ts` |
| Navigation scaling | Can current nav support 3+ more feature areas? |
| Widget readiness | Data fetching vs display separation |
| BUG-001 impact | Does code change interact with superset logic? |

---

## Stop Conditions

The pass is COMPLETE when:
- All files in scope have been reviewed
- All findings are triaged (active / latent / acceptable)
- Active debt items are fixed or have a refactor task created
- `conventions.md` updated if new guardrails identified
- No new patterns emerging

---

## Last Updated
- Date: 2026-03-14
- Session Context: Initial creation — tailored from generic Tech Debt Auditor prompt
