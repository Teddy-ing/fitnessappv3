---
description: Tracking document for technical debt, anti-patterns, and scalability findings from Tech Debt Auditor QA passes
---

# Tech Debt Audit Baseline

## Summary

- **Last full pass:** 2026-03-17 (calendar feature post-completion)
- **Open issues:** 8 (Active: 3, Latent: 5)
- **Fixed since baseline:** 3

---

## Open Issues — Active Debt

Issues that will cause problems in the next 1–2 roadmap phases.

### TD-007 · ISO week helpers duplicated across two services

- **Category:** DRY violation / anti-pattern
- **Files:**
  - [calendarService.ts:76-95](file:///c:/Users/teddy/projects/workout-app/src/services/calendarService.ts#L76-L95) — `getISOWeekNumber`, `getISOWeekYear`, `toISOWeekKey`
  - [analyticsService.ts:378-400](file:///c:/Users/teddy/projects/workout-app/src/services/analyticsService.ts#L378-L400) — identical functions
- **What:** Three ISO week calculation functions are copy-pasted between `calendarService.ts` and `analyticsService.ts`. The comment on line 72 of `calendarService.ts` even acknowledges this: `"(shared logic with analyticsService)"`.
- **Why active:** Any bug fix to week computation (e.g., year-boundary edge cases) must be applied in two places. This is exactly the pattern that created TD-002 (chart labels) which was fixed 3 days ago.
- **Recommended fix:** Extract to `src/utils/dateUtils.ts` or `src/utils/isoWeek.ts`. Both services import from there. ~15 min fix.

### TD-008 · `formatDuration` duplicated in DailyWorkoutModal and JournalView

- **Category:** DRY violation
- **Files:**
  - [DailyWorkoutModal.tsx:57-63](file:///c:/Users/teddy/projects/workout-app/src/components/DailyWorkoutModal.tsx#L57-L63) — `formatDuration(seconds)`
  - [JournalView.tsx:38-44](file:///c:/Users/teddy/projects/workout-app/src/components/JournalView.tsx#L38-L44) — identical function
- **What:** The same seconds-to-`"1h 05m"` formatting function is copy-pasted between two calendar components. `formatVolume` in `DailyWorkoutModal.tsx` is also a one-off that could be shared.
- **Why active:** These components were just built — if not extracted now, the pattern will continue into Profile widgets and any future component that shows workout summaries.
- **Recommended fix:** Create `src/utils/formatters.ts` with `formatDuration`, `formatVolume`, and potentially `formatDateHeader`. ~10 min fix.

### TD-010 · `DailyWorkoutModal` contains raw DB query bypassing service layer

- **Category:** Service boundary violation
- **File:** [DailyWorkoutModal.tsx:82-96](file:///c:/Users/teddy/projects/workout-app/src/components/DailyWorkoutModal.tsx#L82-L96) — `getPRSetIdsForDate()`
- **What:** The `getPRSetIdsForDate` function imports `getDatabase` directly and runs a raw SQL query inside a UI component file. All other data access goes through service files. This breaks the established data access pattern where components call services, never the database directly.
- **Why active:** Widget framework (Phase 3) and Profile refactor (Phase 4) will need PR data too. Having this query trapped in a modal component forces copy-paste or circular imports.
- **Recommended fix:** Move `getPRSetIdsForDate` to `calendarService.ts` and export it. The component should import from `services/`. ~5 min fix.

---

## Open Issues — Latent Debt

Acceptable now but will bite during Phase 5+ (Settings, Import/Export, ML, Chatbot).

### TD-003 · `analyticsService.ts` is a monolith (873 lines) heading toward bloat

- **Category:** Service boundary concern
- **File:** [analyticsService.ts](file:///c:/Users/teddy/projects/workout-app/src/services/analyticsService.ts) — 873 lines
- **Why latent:** Contains macro analytics (aggregations, consistency, muscle distribution) AND micro analytics (per-exercise time series, best-for-reps, fatigue ratio). Currently well-organized with section headers, but the ML phase (Phase 7) and widget framework (Phase 3) will add more query functions here. At current growth rate it will exceed 1200 lines by Phase 5.
- **Will break at:** ML features adding prediction queries, widget framework adding dashboard queries
- **Recommended fix (when):** Before Phase 5, extract `exerciseAnalyticsService.ts` (micro-level queries: lines 504–858) from the current file. Keep `analyticsService.ts` for macro-level queries.

### TD-004 · Hardcoded `" lbs"` unit across analytics UI + calendar modal

- **Category:** Scalability / internationalization
- **Files:**
  - [AnalyticsScreen.tsx:183](file:///c:/Users/teddy/projects/workout-app/src/screens/AnalyticsScreen.tsx#L183) — `getYAxisSuffix` returns `' lbs'`
  - [ExerciseAnalyticsScreen.tsx:387,391](file:///c:/Users/teddy/projects/workout-app/src/screens/ExerciseAnalyticsScreen.tsx#L387-L391) — `suffix=" lbs"` prop
  - [ExerciseAnalyticsScreen.tsx:337](file:///c:/Users/teddy/projects/workout-app/src/screens/ExerciseAnalyticsScreen.tsx#L337) — hardcoded `lbs` in tooltip
  - [ExerciseAnalyticsScreen.tsx:417](file:///c:/Users/teddy/projects/workout-app/src/screens/ExerciseAnalyticsScreen.tsx#L417) — `{row.weight} lbs` in table
  - **[NEW]** [DailyWorkoutModal.tsx:68](file:///c:/Users/teddy/projects/workout-app/src/components/DailyWorkoutModal.tsx#L68) — `formatVolume` appends `' lbs'`
- **Why latent:** Settings phase (Phase 5) will need kg/lbs toggle. All these hardcoded strings will need updating.
- **Will break at:** Settings feature — unit preference toggle
- **Recommended fix (when):** When implementing Settings, create a `useUnitPreference()` hook that reads from user settings and returns formatted weight strings. Replace all hardcoded `lbs` with the hook's output.

### TD-005 · `ExerciseFilter` → muscle group mapping is hardcoded in UI

- **Category:** Tight coupling
- **File:** [AnalyticsScreen.tsx:385-415](file:///c:/Users/teddy/projects/workout-app/src/screens/AnalyticsScreen.tsx#L385-L415)
- **What:** `ExerciseFilter` type and `getMuscleGroupsForFilter()` hardcode the mapping from filter pill labels to DB muscle group values. If new muscle groups are added to exercises or the taxonomy changes, this mapping must be manually updated.
- **Why latent:** Current exercise set is stable. But import/export feature (Phase 6) could introduce exercises with muscle groups not in this mapping.
- **Recommended fix (when):** When implementing import, derive filter pills dynamically from `SELECT DISTINCT muscle FROM ...` or from the exercise model's muscle group enum.

### TD-009 · `CalendarDayData` type defined in service file instead of `src/models/`

- **Category:** Type ownership / guardrail #5 deviation
- **File:** [calendarService.ts:31-44](file:///c:/Users/teddy/projects/workout-app/src/services/calendarService.ts#L31-L44) — `CalendarDayData` interface + `JournalEntry` interface
- **What:** `CalendarDayData` is exported from `calendarService.ts` and imported by `CalendarScreen.tsx`. `JournalEntry` is similarly exported and used by `JournalView.tsx`. Guardrail #5 says canonical types live in `src/models/`. The current precedent is that model types used across file boundaries should be in `models/`.
- **Why latent:** Only two consumers each right now. Will become problematic when widgets or Profile refactor need these same types.
- **Recommended fix (when):** Create `src/models/calendar.ts` with `CalendarDayData`, `JournalEntry`, and `MonthData`. Import from models in both service and component files.

### TD-011 · `calendarService.ts` is 848 lines and growing toward monolith territory

- **Category:** Service boundary concern
- **File:** [calendarService.ts](file:///c:/Users/teddy/projects/workout-app/src/services/calendarService.ts) — 848 lines
- **Why latent:** Contains 10 exported functions spanning 4 distinct domains: heatmap queries, streak/rest computation, PR backfill, journal search, and fatigue detection. This mirrors the `analyticsService.ts` pattern (TD-003). The service was built all at once as part of the calendar feature, so the growth was rapid.
- **Will break at:** Widget framework (Phase 3) will likely add calendar-widget queries. Import/export (Phase 6) may need to write/read PR records.
- **Recommended fix (when):** Before Phase 5, consider extracting `personalRecordsService.ts` (backfill + PR date queries) from `calendarService.ts`. Keep `calendarService.ts` for heatmap, streak, and workout date queries. Fatigue detection could go either way.

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

### TD-006 · `CalendarScreen.tsx` exceeds 600-line component guardrail — **RESOLVED 2026-03-17**

- **Guardrail violated:** #1 (Component size limit)
- **Original:** 1056 lines (76% over limit)
- **Fix applied:** Extracted to `src/components/calendar/`:
  - `CalendarHeader.tsx` — streak/rest badges + metric/filter/journal controls (~290 lines)
  - `MonthBlock.tsx` — month grid with `DayCell` sub-component (~305 lines)
  - `types.ts` — shared types (`MonthData`), constants, and pure helpers (~107 lines)
  - `index.ts` — barrel exports
- **Result:** `CalendarScreen.tsx` reduced to ~310 lines (71% reduction). All extracted files well under 600 lines.

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

| # | Guardrail | Calendar Feature Status |
|---|-----------|------------------------|
| 1 | Component size limit (600 lines) | ✅ `CalendarScreen.tsx` at ~310 lines (TD-006 resolved) |
| 2 | Avoid `any` types | ✅ No `any` usage in any calendar file |
| 3 | Database schema changes require versioned migrations | ✅ v5 migration used for `personal_records` table |
| 4 | Hook extraction signal: 3+ `useState` for one concern | ✅ CalendarScreen has 12 `useState` but they span multiple concerns (data, filters, UI) — no single concern exceeds 3 |
| 5 | Canonical types live in `src/models/` | ⚠️ `CalendarDayData` and `JournalEntry` in service file (TD-009) |
| 6 | State reset on lifecycle boundaries | ✅ `DailyWorkoutModal` uses effect cleanup with `cancelled` flag on `date` change |
| 7 | SafeAreaView edges must match tab bar visibility | ✅ `CalendarScreen` uses `edges={['bottom']}` (tab bar hidden, stack header handles top) |

---

## Scalability Watch List

Areas to monitor as the app approaches later roadmap phases:

| Concern | Current State | Will Break At |
|---------|--------------|--------------|
| Navigation structure (3 tabs + modals) | Adequate for current features | Phase 5 (Settings) may need nested stacks or drawer |
| SQLite write patterns | Single-user, low frequency | Import feature (Phase 6) — bulk inserts need batching |
| Service file boundaries | 6 services, `analyticsService` at 873 lines, **`calendarService` at 848 lines** | ML features (Phase 7), Widget framework (Phase 3) |
| Hydration layer | Single mapping file | Every new model field = hydration update needed — fragile |
| Unit hardcoding (`lbs`) | Analytics + calendar modal | Phase 5 (Settings) — kg/lbs toggle per TD-004 |
| Chart label logic | Shared via `chartLabels.tsx` | ✅ Resolved (TD-002) |
| Calendar component size | ✅ Resolved (TD-006) — 310 lines | — |
| **ISO week helper duplication** | **Identical functions in 2 services** | **Any week-boundary bug fix** |

---

## Last Updated
- Date: 2026-03-17
- Session Context: Tech Debt Auditor pass on calendar feature (Phases A–E). TD-006 resolved (CalendarScreen 1056→310 lines). 3 active issues remain (TD-007, TD-008, TD-010), 5 latent (TD-003, TD-004, TD-005, TD-009, TD-011).
