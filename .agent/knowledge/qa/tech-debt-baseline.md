---
description: Tracking document for technical debt, anti-patterns, and scalability findings from Tech Debt Auditor QA passes
---

# Tech Debt Audit Baseline

## Summary

- **Last full pass:** 2026-03-24 (comprehensive full-project scan — 118 files)
- **Open issues:** 6 (Active: 0, Latent: 6)
- **Fixed since baseline:** 14

---

## Open Issues — Active Debt

_No active debt items._

---

## Open Issues — Latent Debt

Acceptable now but will bite during Phase 5+ (Settings, Import/Export, ML, Chatbot).

### TD-003 · `analyticsService.ts` is a monolith (873 lines) heading toward bloat

- **Category:** Service boundary concern
- **File:** [analyticsService.ts](file:///c:/Users/teddy/projects/workout-app/src/services/analyticsService.ts) — 873 lines
- **Why latent:** Contains macro analytics (aggregations, consistency, muscle distribution) AND micro analytics (per-exercise time series, best-for-reps, fatigue ratio). Currently well-organized with section headers, but the ML phase (Phase 7) and widget framework (Phase 3) will add more query functions here. At current growth rate it will exceed 1200 lines by Phase 5.
- **Will break at:** ML features adding prediction queries, widget framework adding dashboard queries
- **Recommended fix (when):** Before Phase 5, extract `exerciseAnalyticsService.ts` (micro-level queries: lines 504–858) from the current file. Keep `analyticsService.ts` for macro-level queries.

### TD-004 · Hardcoded `" lbs"` unit across analytics UI + calendar modal + measurements gallery + goals

- **Category:** Scalability / internationalization
- **Files (20 instances across 13 files):**
  - [MacroAnalyticsView.tsx:75](file:///c:/Users/teddy/projects/workout-app/src/components/analytics/MacroAnalyticsView.tsx#L75) — `getYAxisSuffix` returns `' lbs'`
  - [ExerciseAnalyticsScreen.tsx:288,338,342,368](file:///c:/Users/teddy/projects/workout-app/src/screens/ExerciseAnalyticsScreen.tsx#L288) — `suffix=" lbs"` props + tooltip + table
  - [formatters.ts:20](file:///c:/Users/teddy/projects/workout-app/src/utils/formatters.ts#L20) — `formatVolume` appends `' lbs'`
  - [PhotoCell.tsx:77](file:///c:/Users/teddy/projects/workout-app/src/components/measurements/PhotoCell.tsx#L77) — `{photo.bodyweight} lbs`
  - [PhotoViewer.tsx:108](file:///c:/Users/teddy/projects/workout-app/src/components/measurements/PhotoViewer.tsx#L108) — `{currentPhoto.bodyweight} lbs`
  - [CompareView.tsx:68,90,105](file:///c:/Users/teddy/projects/workout-app/src/components/measurements/CompareView.tsx#L68) — `{left/right.bodyweight} lbs` + delta
  - [GoalsScreen.tsx:174](file:///c:/Users/teddy/projects/workout-app/src/screens/GoalsScreen.tsx#L174) — `unit: 'lbs'` in `resolveGoalDisplayInfo`
  - [GoalCreationModal.tsx:70](file:///c:/Users/teddy/projects/workout-app/src/components/goals/GoalCreationModal.tsx#L70) — `useState('lbs')` default
  - [GoalEmptyState.tsx:28](file:///c:/Users/teddy/projects/workout-app/src/components/goals/GoalEmptyState.tsx#L28) — `'Bench 135 lbs'` chip label
  - [WorkoutHomeView.tsx:225](file:///c:/Users/teddy/projects/workout-app/src/screens/WorkoutHomeView.tsx#L225) — `lbs` in workout widget
  - [WorkoutKeyboard.tsx:106](file:///c:/Users/teddy/projects/workout-app/src/components/WorkoutKeyboard.tsx#L106) — `case 'weight': return 'lbs'`
  - [SetRow.tsx:46](file:///c:/Users/teddy/projects/workout-app/src/components/SetRow.tsx#L46) — `weightUnit = 'lbs'` default prop
- **Why latent:** Settings phase (Phase 5) will need kg/lbs toggle. All these hardcoded strings will need updating.
- **Will break at:** Settings feature — unit preference toggle
- **Recommended fix (when):** When implementing Settings, create a `useUnitPreference()` hook that reads from user settings and returns formatted weight strings. Replace all hardcoded `lbs` with the hook's output.
- **Note:** `MeasurementsScreen.tsx` and `TrendsTab.tsx` correctly read `weightUnit` from settings — these are the only two files currently doing it right.

### TD-005 · `ExerciseFilter` → muscle group mapping is hardcoded in UI

- **Category:** Tight coupling
- **File:** [AnalyticsScreen.tsx:385-415](file:///c:/Users/teddy/projects/workout-app/src/screens/AnalyticsScreen.tsx#L385-L415)
- **What:** `ExerciseFilter` type and `getMuscleGroupsForFilter()` hardcode the mapping from filter pill labels to DB muscle group values. If new muscle groups are added to exercises or the taxonomy changes, this mapping must be manually updated.
- **Why latent:** Current exercise set is stable. But import/export feature (Phase 6) could introduce exercises with muscle groups not in this mapping.
- **Recommended fix (when):** When implementing import, derive filter pills dynamically from `SELECT DISTINCT muscle FROM ...` or from the exercise model's muscle group enum.

### TD-009 · Cross-boundary types defined in service files instead of `src/models/`

- **Category:** Type ownership / guardrail #5 deviation
- **Files:**
  - [calendarService.ts:31,607](file:///c:/Users/teddy/projects/workout-app/src/services/calendarService.ts#L31) — `CalendarDayData`, `JournalEntry`, `PRSetIds`
  - [templateService.ts:36,49](file:///c:/Users/teddy/projects/workout-app/src/services/templateService.ts#L36) — `Template`, `TemplateExercise`
  - [splitService.ts:283](file:///c:/Users/teddy/projects/workout-app/src/services/splitService.ts#L283) — `SplitInfo`
  - [preferencesService.ts:19](file:///c:/Users/teddy/projects/workout-app/src/services/preferencesService.ts#L19) — `UserSettings`
- **What:** Multiple service files export types that are imported by UI components. Guardrail #5 says canonical types live in `src/models/`. These are cross-boundary types used by 2+ consumers each.
- **Why latent:** Currently functional via barrel re-exports. Will become problematic when widgets, import/export, or settings features need these same types from different entry points.
- **Recommended fix (when):** Before Phase 5, create `src/models/template.ts`, `src/models/calendar.ts`, `src/models/preferences.ts` and move the cross-boundary interfaces there. Services import from models.
- **Note:** `hydration.ts` row types (`SetRow`, `ExerciseRow`, `WorkoutRow`) are internal DB mapping types — acceptable to keep in the hydration file.

### TD-011 · `calendarService.ts` is 848 lines and growing toward monolith territory

- **Category:** Service boundary concern
- **File:** [calendarService.ts](file:///c:/Users/teddy/projects/workout-app/src/services/calendarService.ts) — 848 lines
- **Why latent:** Contains 10 exported functions spanning 4 distinct domains: heatmap queries, streak/rest computation, PR backfill, journal search, and fatigue detection. This mirrors the `analyticsService.ts` pattern (TD-003). The service was built all at once as part of the calendar feature, so the growth was rapid.
- **Will break at:** Widget framework (Phase 3) will likely add calendar-widget queries. Import/export (Phase 6) may need to write/read PR records.
- **Recommended fix (when):** Before Phase 5, consider extracting `personalRecordsService.ts` (backfill + PR date queries) from `calendarService.ts`. Keep `calendarService.ts` for heatmap, streak, and workout date queries. Fatigue detection could go either way.

### TD-015 · `formatISODate` helper duplicated across measurement files

- **Category:** DRY violation
- **Files:**
  - [MeasurementsScreen.tsx:589-594](file:///c:/Users/teddy/projects/workout-app/src/screens/MeasurementsScreen.tsx#L589-L594) — `formatISODate()` + `getTodayStr()`
  - [GalleryTab.tsx:562](file:///c:/Users/teddy/projects/workout-app/src/components/measurements/GalleryTab.tsx#L562) — inline `${today.getFullYear()}-${...}` (same pattern, repeated at line 586)
  - [TrendsTab.tsx:265](file:///c:/Users/teddy/projects/workout-app/src/components/measurements/TrendsTab.tsx#L265) — inline `${d.getFullYear()}-${...}` pattern
  - [mockDataService.ts:201](file:///c:/Users/teddy/projects/workout-app/src/services/mockDataService.ts#L201) — same inline pattern
- **Why latent:** Four copies of the same date → ISO string formatting logic. Currently small and unlikely to contain bugs, but any timezone edge-case fix would need to be applied in 4 places.
- **Recommended fix (when):** During the next refactor cycle, add `formatISODate(date: Date): string` to `src/utils/formatters.ts` (where `formatDuration` and `formatVolume` already live) and import from there. Low-risk, ~10-line change.



---

## Resolved

### TD-020 · `DetailChartView.tsx` exceeds 600-line component guardrail — **RESOLVED 2026-03-24**

- **Guardrail violated:** #1 (Component size limit)
- **Original:** 624 lines
- **Fix applied:** Extracted `OverlayExercisePicker.tsx` (113 lines) — exercise picker modal with FlatList + styles.
- **Result:** `DetailChartView.tsx` reduced to 547 lines. `OverlayExercisePicker.tsx` at 113 lines.

### TD-016 · `GoalsScreen.tsx` exceeds 600-line component guardrail — **RESOLVED 2026-03-24**

- **Guardrail violated:** #1 (Component size limit)
- **Original:** 643 lines
- **Fix applied:** Extracted `GoalContextMenu.tsx` (140 lines) and `GoalEmptyState.tsx` (155 lines) to `src/components/goals/`.
- **Result:** `GoalsScreen.tsx` reduced to 440 lines. Both extracted files well under 600 lines.

### TD-017 · `goalService.ts` exceeds 600-line service guardrail — **RESOLVED 2026-03-24**

- **Guardrail violated:** #1 (File size limit)
- **Original:** 632 lines
- **Fix applied:** Extracted progress computation into `src/services/goalProgressService.ts` (396 lines) — `computeCurrentBest`, 5 type-specific compute functions, `refreshAllGoalProgress`, `getCurrentBestForTarget`.
- **Result:** `goalService.ts` reduced to 260 lines (CRUD only). `goalProgressService.ts` at 396 lines.

### TD-018 · `getProgressPercent` + `formatDate` duplicated across goals components — **RESOLVED 2026-03-24**

- **Category:** DRY violation
- **Fix applied:** Created `src/components/goals/goalUtils.ts` (60 lines) with shared `getProgressPercent()`, `formatDate()`, and `formatTitle()`. Updated `GoalCard.tsx`, `CompletedGoalCard.tsx`, and `GoalDetailModal.tsx` to import from `goalUtils`.

### TD-019 · `formatTitle` duplicated between GoalCard and CompletedGoalCard — **RESOLVED 2026-03-24**

- **Category:** DRY violation
- **Fix applied:** Consolidated into `goalUtils.ts` alongside TD-018.

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

### TD-010 · `DailyWorkoutModal` raw DB query bypassing service layer — **RESOLVED 2026-03-17**

- **Category:** Service boundary violation
- **Original:** `getPRSetIdsForDate()` imported `getDatabase` directly in a UI component.
- **Fix applied:** Moved `getPRSetIdsForDate` to `calendarService.ts`, exported via barrel. Component now imports from `services/`.
- **Result:** No UI components import `getDatabase` anymore. PR query is reusable by future widgets.

### TD-008 · `formatDuration` duplicated in DailyWorkoutModal and JournalView — **RESOLVED 2026-03-17**

- **Category:** DRY violation
- **Original:** Identical `formatDuration` in both files, `formatVolume` as one-off in modal.
- **Fix applied:** Created `src/utils/formatters.ts` with `formatDuration(seconds, fallback?)` and `formatVolume(volume, fallback?)`. Both components import from shared utility. JournalView passes `''` fallback to preserve conditional badge display.
- **Result:** ~30 lines of duplicated code eliminated. Shared formatters available for future components.

### TD-007 · ISO week helpers duplicated across two services — **RESOLVED 2026-03-17**

- **Category:** DRY violation / anti-pattern
- **Original:** `getISOWeekNumber`, `getISOWeekYear`, `toISOWeekKey` copy-pasted between `calendarService.ts` and `analyticsService.ts`.
- **Fix applied:** Created `src/utils/isoWeek.ts` with shared exported functions. Both services now import from the shared utility.
- **Result:** ~45 lines of duplicated code eliminated. Future week-boundary fixes apply in one place.

### TD-006 · `CalendarScreen.tsx` exceeds 600-line component guardrail — **RESOLVED 2026-03-17**

- **Guardrail violated:** #1 (Component size limit)
- **Original:** 1056 lines (76% over limit)
- **Fix applied:** Extracted to `src/components/calendar/`:
  - `CalendarHeader.tsx` — streak/rest badges + metric/filter/journal controls (~290 lines)
  - `MonthBlock.tsx` — month grid with `DayCell` sub-component (~305 lines)
  - `types.ts` — shared types (`MonthData`), constants, and pure helpers (~107 lines)
  - `index.ts` — barrel exports
- **Result:** `CalendarScreen.tsx` reduced to ~310 lines (71% reduction). All extracted files well under 600 lines.

### TD-012 · `MeasurementsScreen.tsx` exceeds 600-line component guardrail — **RESOLVED 2026-03-23**

- **Guardrail violated:** #1 (Component size limit)
- **Original:** 854 lines (42% over limit)
- **Fix applied:** Extracted to `src/components/measurements/`:
  - `SegmentedControl.tsx` — generic pill tab selector (~88 lines)
  - `TrackTab.tsx` — DateSelector, MetricInputRow, ManageMeasurementsModal, MeasurementField type (~350 lines)
- **Result:** `MeasurementsScreen.tsx` reduced to 264 lines (69% reduction).

### TD-013 · `TrendsTab.tsx` exceeds 600-line component guardrail — **RESOLVED 2026-03-23**

- **Guardrail violated:** #1 (Component size limit)
- **Original:** 932 lines (55% over limit)
- **Fix applied:** Extracted to `src/components/measurements/`:
  - `SparklineRow.tsx` — SparklineSVG + SparklineRow + SparklineRowData type (~153 lines)
  - `DetailChartView.tsx` — full chart view with overlay, exercise picker, summary rows (~430 lines)
- **Result:** `TrendsTab.tsx` reduced to 167 lines (82% reduction).

### TD-014 · `GalleryTab.tsx` exceeds 600-line component guardrail — **RESOLVED 2026-03-23**

- **Guardrail violated:** #1 (Component size limit)
- **Original:** 847 lines (41% over limit)
- **Fix applied:** Extracted to `src/components/measurements/`:
  - `PhotoCell.tsx` — grid thumbnail with compare-mode overlay (~163 lines)
  - `PhotoViewer.tsx` — full-screen modal with swiping (~226 lines)
  - `CompareView.tsx` — side-by-side comparison modal (~178 lines)
- **Result:** `GalleryTab.tsx` reduced to 302 lines (64% reduction).

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

| # | Guardrail | Full-Project Status |
|---|-----------|----------------------------|
| 1 | Component size limit (600 lines) | ✅ All components under 600 lines (TD-020 resolved). Services `analyticsService.ts` 755, `calendarService.ts` 741 tracked as latent (TD-003/011). |
| 2 | Avoid `any` types | ✅ Only in chart library callbacks (TD-A01 accepted) and `SaveTemplateModal` Alert buttons |
| 3 | Database schema changes require versioned migrations | ✅ 7 versioned migrations, all with `columnExists` guards |
| 4 | Hook extraction signal: 3+ `useState` for one concern | ✅ All complex state correctly extracted to hooks (`useGoalCreation`, `useWorkoutKeyboard`, `useExerciseAnalytics`, `useMacroAnalytics`, `useHomeScreenData`) |
| 5 | Canonical types live in `src/models/` | ⚠️ 6 cross-boundary types still in services (TD-009 expanded). Domain types correct in `models/`. |
| 6 | State reset on lifecycle boundaries | ✅ All hooks and modals properly reset on identity/visibility change |
| 7 | SafeAreaView edges must match tab bar visibility | ✅ All screens verified correct |

---

## Scalability Watch List

Areas to monitor as the app approaches later roadmap phases:

| Concern | Current State | Will Break At |
|---------|--------------|--------------|
| Navigation structure (3 tabs + modals) | Adequate for current features | Phase 5 (Settings) may need nested stacks or drawer |
| SQLite write patterns | Single-user, low frequency | Import feature (Phase 6) — bulk inserts need batching |
| Service file boundaries | 13 services, `analyticsService` 755 lines, `calendarService` 741 lines | ML features (Phase 7), Widget framework (Phase 3) |
| Hydration layer | Single mapping file, 256 lines | Every new model field = hydration update needed — fragile |
| Unit hardcoding (`lbs`) | **20 instances across 13 files** (TD-004 expanded) | Phase 5 (Settings) — kg/lbs toggle |
| Chart label logic | ✅ Resolved (TD-002) — shared via `chartLabels.tsx` | — |
| Calendar component size | ✅ Resolved (TD-006) — 325 lines | — |
| Measurement component sizes | ✅ Resolved (TD-012/013/014/020) — all under 550 lines | — |
| Goals component sizes | ✅ Resolved (TD-016/017/018/019) — all under 440 lines | — |
| `formatISODate` duplication | 4 files with identical date formatting logic (TD-015) | Any timezone edge-case fix |
| Type ownership | 6 cross-boundary types in services (TD-009 expanded) | Phase 5/6 — new consumers of these types |

---

## Last Updated
- Date: 2026-03-24
- Session Context: Comprehensive full-project Tech Debt Auditor scan (118 files). TD-020 found and immediately resolved (DetailChartView 624→547 lines via OverlayExercisePicker extraction). Expanded TD-004 to 20 lbs instances across 13 files. Expanded TD-009 to 6 cross-boundary types in services. 6 open latent issues, 0 active.
