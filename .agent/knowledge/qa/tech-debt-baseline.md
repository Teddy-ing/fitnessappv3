---
description: Tracking document for technical debt, anti-patterns, and scalability findings from Tech Debt Auditor QA passes
---

# Tech Debt Audit Baseline

## Summary

- **Last full pass:** 2026-03-14 (initial — no findings yet)
- **Open issues:** 0 (Active: 0, Latent: 0)
- **Fixed since baseline:** 0

---

## Open Issues — Active Debt

Issues that will cause problems in the next 1–2 roadmap phases.

*No open active debt issues.*

---

## Open Issues — Latent Debt

Acceptable now but will bite during Phase 5+ (Settings, Import/Export, ML, Chatbot).

*No open latent debt issues.*

---

## Resolved

*No resolved issues yet.*

---

## Accepted / Won't Fix

*No accepted issues yet.*

---

## Historical Tech Debt Addressed

These were identified and fixed before this baseline was created. Documented here for pattern awareness and to prevent regressions:

| Debt | Category | Where | What Was Done | Fixed |
|------|----------|-------|--------------|-------|
| God Component — WorkoutScreen (1,600+ lines) | Component Size | `WorkoutScreen.tsx` | Extracted hooks, modals, home view → 385 lines | 2026-03-05 |
| God Component — SplitsScreen (1,258 lines) | Component Size | `SplitsScreen.tsx` | Extracted wizard, list view, form view → 225 lines | 2026-03-05 |
| UI state in domain stores | Store Architecture | `workoutStore.ts` | Moved `isExercisePickerOpen`, `currentExerciseId` to local state | 2026-03-05 |
| Rest timer coupled to workout store | Store Architecture | `workoutStore.ts` | Extracted `restTimerStore.ts` | 2026-03-05 |
| No migration system — inline schema changes | Data Layer | `database.ts` | Created `migrations.ts` with versioned migration system | 2026-03-05 |
| Duplicated hydration logic across services | Data Layer | Multiple services | Consolidated into `hydration.ts` pure mapping functions | 2026-03-05 |
| Modals as ReactNode props | Anti-pattern | `WorkoutScreen.tsx` | `WorkoutHomeView` now owns its own modals | 2026-03-10 |
| Type declarations scattered outside models/ | Type Ownership | Various services | Consolidated canonical types to `src/models/` | 2026-03-05 |

---

## Convention Guardrails (Cross-Reference)

These guardrails in `conventions.md` were created specifically to prevent tech debt recurrence. The Tech Debt Auditor should verify compliance with all of them:

| # | Guardrail | Status |
|---|-----------|--------|
| 1 | Component size limit (600 lines) | ✅ Enforced |
| 2 | Avoid `any` types | ✅ Enforced |
| 3 | Database schema changes require versioned migrations | ✅ Enforced |
| 4 | Hook extraction signal: 3+ `useState` for one concern | ✅ Enforced |
| 5 | Canonical types live in `src/models/` | ✅ Enforced |
| 6 | State reset on lifecycle boundaries | ✅ Enforced |
| 7 | SafeAreaView edges must match tab bar visibility | ✅ Enforced |

---

## Scalability Watch List

Areas to monitor as the app approaches later roadmap phases:

| Concern | Current State | Will Break At |
|---------|--------------|--------------|
| Navigation structure (3 tabs + modals) | Adequate for current features | Phase 5 (Settings) may need nested stacks or drawer |
| SQLite write patterns | Single-user, low frequency | Import feature (Phase 6) — bulk inserts need batching |
| Service file boundaries | 5 clean services | ML features (Phase 7) may need new service or risk bloating `analyticsService` |
| Hydration layer | Single mapping file | Every new model field = hydration update needed — fragile |

---

## Last Updated
- Date: 2026-03-14
- Session Context: Initial creation — historical debt seeded from refactoring sessions
