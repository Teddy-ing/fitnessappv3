---
description: Tracking document for technical debt, anti-patterns, and scalability findings from Tech Debt Auditor QA passes
---

# Tech Debt Audit Baseline

## Summary

- **Last full pass:** 2026-03-14 (analytics feature post-completion)
- **Open issues:** 3 (Active: 0, Latent: 3)
- **Fixed since baseline:** 2

---

## Open Issues — Active Debt

Issues that will cause problems in the next 1–2 roadmap phases.

*No open active debt issues.*

---

## Open Issues — Latent Debt

Acceptable now but will bite during Phase 5+ (Settings, Import/Export, ML, Chatbot).

### TD-003 · `analyticsService.ts` is a monolith (873 lines) heading toward bloat

- **Category:** Service boundary concern
- **File:** [analyticsService.ts](file:///c:/Users/teddy/projects/workout-app/src/services/analyticsService.ts) — 873 lines
- **Why latent:** Contains macro analytics (aggregations, consistency, muscle distribution) AND micro analytics (per-exercise time series, best-for-reps, fatigue ratio). Currently well-organized with section headers, but the ML phase (Phase 7) and widget framework (Phase 3) will add more query functions here. At current growth rate it will exceed 1200 lines by Phase 5.
- **Will break at:** ML features adding prediction queries, widget framework adding dashboard queries
- **Recommended fix (when):** Before Phase 5, extract `exerciseAnalyticsService.ts` (micro-level queries: lines 504–858) from the current file. Keep `analyticsService.ts` for macro-level queries.

### TD-004 · Hardcoded `" lbs"` unit across analytics UI

- **Category:** Scalability / internationalization
- **Files:**
  - [AnalyticsScreen.tsx:183](file:///c:/Users/teddy/projects/workout-app/src/screens/AnalyticsScreen.tsx#L183) — `getYAxisSuffix` returns `' lbs'`
  - [ExerciseAnalyticsScreen.tsx:387,391](file:///c:/Users/teddy/projects/workout-app/src/screens/ExerciseAnalyticsScreen.tsx#L387-L391) — `suffix=" lbs"` prop
  - [ExerciseAnalyticsScreen.tsx:337](file:///c:/Users/teddy/projects/workout-app/src/screens/ExerciseAnalyticsScreen.tsx#L337) — hardcoded `lbs` in tooltip
  - [ExerciseAnalyticsScreen.tsx:417](file:///c:/Users/teddy/projects/workout-app/src/screens/ExerciseAnalyticsScreen.tsx#L417) — `{row.weight} lbs` in table
- **Why latent:** Settings phase (Phase 5) will need kg/lbs toggle. All these hardcoded strings will need updating.
- **Will break at:** Settings feature — unit preference toggle
- **Recommended fix (when):** When implementing Settings, create a `useUnitPreference()` hook that reads from user settings and returns formatted weight strings. Replace all hardcoded `lbs` with the hook's output.

### TD-005 · `ExerciseFilter` → muscle group mapping is hardcoded in UI

- **Category:** Tight coupling
- **File:** [AnalyticsScreen.tsx:385-415](file:///c:/Users/teddy/projects/workout-app/src/screens/AnalyticsScreen.tsx#L385-L415)
- **What:** `ExerciseFilter` type and `getMuscleGroupsForFilter()` hardcode the mapping from filter pill labels to DB muscle group values. If new muscle groups are added to exercises or the taxonomy changes, this mapping must be manually updated.
- **Why latent:** Current exercise set is stable. But import/export feature (Phase 6) could introduce exercises with muscle groups not in this mapping.
- **Recommended fix (when):** When implementing import, derive filter pills dynamically from `SELECT DISTINCT muscle FROM ...` or from the exercise model's muscle group enum.

---

## Resolved

### TD-001 · `AnalyticsScreen.tsx` exceeds 600-line component guardrail — **RESOLVED 2026-03-14**

- **Guardrail violated:** #1 (Component size limit)
- **Original:** 902 lines (50% over limit)
- **Fix applied:** Extracted 3 tab views and 2 shared sub-components to `src/components/analytics/`:
  - `MacroAnalyticsView.tsx` — workouts tab with chart logic
  - `BreakdownView.tsx` — muscle distribution tab
  - `ExerciseListView.tsx` — exercise search/filter/list tab
  - `PillRow.tsx` — generic pill row component
  - `MetricSelector.tsx` — metric segmented control
- **Result:** `AnalyticsScreen.tsx` reduced to 148 lines. All extracted files well under 600 lines.

### TD-002 · Duplicated chart label formatting logic across 3 files — **RESOLVED 2026-03-14**

- **Category:** DRY violation / anti-pattern
- **Original:** `MONTH_NAMES`, `lastMonth` tracking, and `labelComponent` factory copy-pasted 3× across `MacroAnalyticsView.tsx` and `ExerciseAnalyticsScreen.tsx` with only minor margin differences.
- **Fix applied:** Created `src/utils/chartLabels.tsx` with:
  - `createLabelProcessor()` — stateful factory that tracks months and returns `labelComponent` per data point
  - `BAR_CHART_MARGINS` / `LINE_CHART_MARGINS` — preset configs for each chart type
- **Result:** ~75 lines of duplicated code eliminated. All 3 call sites reduced to 2-line invocations. Future chart types just import a preset.

---

## Accepted / Won't Fix

### TD-A01 · `any` in chart library callbacks

- **Files:**
  - [AnalyticsScreen.tsx:335](file:///c:/Users/teddy/projects/workout-app/src/screens/AnalyticsScreen.tsx#L335) — `renderTooltip={(item: any, index: number)`
  - [ExerciseAnalyticsScreen.tsx:210](file:///c:/Users/teddy/projects/workout-app/src/screens/ExerciseAnalyticsScreen.tsx#L210) — `pointerLabelComponent: (items: any[])`
  - [ExerciseAnalyticsScreen.tsx:327](file:///c:/Users/teddy/projects/workout-app/src/screens/ExerciseAnalyticsScreen.tsx#L327) — `renderTooltip={(item: any, index: number)`
- **Why accepted:** `react-native-gifted-charts` does not export proper types for these callbacks. The items are library-internal objects augmented with our own `fullLabel` property. Typing them would require maintaining fragile declaration merges. Guardrail #2 allows justified `any` for RN library quirks.

### TD-A02 · Mock data in production hook (`useExerciseAnalytics.ts`)

- **File:** [useExerciseAnalytics.ts:38-72](file:///c:/Users/teddy/projects/workout-app/src/hooks/useExerciseAnalytics.ts#L38-L72)
- **What:** `generateMockTimeSeries()` and `getWebMockData()` are included in the production bundle, gated behind `Platform.OS === 'web'`.
- **Why accepted:** Web is development-only (no production web target). Mock data enables chart debugging via browser DevTools, which was critical for fixing x-axis alignment issues. Code is cleanly separated and clearly documented. When tree-shaking is needed for a production web build, this can be extracted to `__mocks__/`.

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

| # | Guardrail | Analytics Status |
|---|-----------|-----------------|
| 1 | Component size limit (600 lines) | ✅ `AnalyticsScreen.tsx` at 148 lines (TD-001 resolved) |
| 2 | Avoid `any` types | ⚠️ 3 instances in chart callbacks — accepted (TD-A01) |
| 3 | Database schema changes require versioned migrations | ✅ No schema changes in analytics |
| 4 | Hook extraction signal: 3+ `useState` for one concern | ✅ Both hooks properly extracted |
| 5 | Canonical types live in `src/models/` | ✅ All types in `models/analytics.ts`, service uses local row types only |
| 6 | State reset on lifecycle boundaries | ✅ `useExerciseAnalytics` re-fetches on `exerciseId` change |
| 7 | SafeAreaView edges must match tab bar visibility | ✅ Both screens use `edges={['bottom']}` (tab bar hidden, stack header handles top) |

---

## Scalability Watch List

Areas to monitor as the app approaches later roadmap phases:

| Concern | Current State | Will Break At |
|---------|--------------|--------------:|
| Navigation structure (3 tabs + modals) | Adequate for current features | Phase 5 (Settings) may need nested stacks or drawer |
| SQLite write patterns | Single-user, low frequency | Import feature (Phase 6) — bulk inserts need batching |
| Service file boundaries | 5 services, `analyticsService` at 873 lines | ML features (Phase 7) — needs split per TD-003 |
| Hydration layer | Single mapping file | Every new model field = hydration update needed — fragile |
| Unit hardcoding (`lbs`) | Everywhere in analytics | Phase 5 (Settings) — kg/lbs toggle per TD-004 |
| Chart label logic | Shared via `chartLabels.tsx` | ✅ Resolved (TD-002) |

---

## Last Updated
- Date: 2026-03-14
- Session Context: TD-002 resolved — chart label logic deduplicated into `src/utils/chartLabels.tsx`. 0 active issues remain, 3 latent.
