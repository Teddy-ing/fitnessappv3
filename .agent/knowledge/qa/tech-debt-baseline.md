---
description: Tracking document for technical debt, anti-patterns, and scalability findings from Tech Debt Auditor QA passes
---

# Tech Debt Audit Baseline

## Summary

- **Last full pass:** 2026-03-24 (comprehensive full-project scan — 118 files)
- **Last scoped pass:** 2026-04-12 (Exercise Details "Master Guide" — 8 files)
- **Open issues:** 0 (Active: 0, Latent: 0)
- **Fixed since baseline:** 35

---

## Open Issues — Active Debt

*No active debt issues.*

---

## Open Issues

*No open tech debt issues. All items resolved as of 2026-03-30.*

---

## Resolved

### ~~TD-037~~ · Chart sub-components duplicated between ChartsTab and dead ExerciseAnalyticsScreen — **RESOLVED 2026-04-12**

- **Category:** DRY violation / drift risk
- **Fix applied:** Auto-resolved by deleting dead `ExerciseAnalyticsScreen.tsx` (TD-036). `ChartsTab.tsx` is now the sole owner of `TimeSeriesLineChart`, `VolumeBarChart`, `RangePills`, `SectionHeader`, and `computeChartSpacing`.
- **Result:** Zero duplication. Future chart fixes apply in one place.

### ~~TD-036~~ · `ExerciseAnalyticsScreen.tsx` is dead code (545 lines) — **RESOLVED 2026-04-12**

- **Category:** Dead code / maintenance burden
- **Fix applied:** Deleted `src/screens/ExerciseAnalyticsScreen.tsx`. No route in `AppNavigator.tsx` pointed to it after `ExerciseDetails` replaced it. Confirmed zero imports remain.
- **Result:** 545 lines of unmaintained dead code removed.

### ~~TD-035~~ · Epley 1RM formula duplicated in RecordsTab (client-side JS) — **RESOLVED 2026-04-12**

- **Guardrail:** #10 (Shared formulas in one canonical location)
- **Fix applied:** Created `src/utils/formulas.ts` with `computeEpley1RM()` — the canonical JS implementation of the Epley formula (companion to the SQL version in `sqlFragments.ts`). `RecordsTab.tsx` now imports from `formulas.ts` instead of defining its own copy. Updated guardrail #10 in `conventions.md` to cover JS formulas alongside SQL fragments.
- **Result:** Single source of truth for Epley formula in both SQL and JS.

### ~~TD-029~~ · `SparklinePoint` type defined in widget component — **RESOLVED 2026-03-30**

- **Guardrail:** #5 (Canonical types live in `src/models/`)
- **Fix applied:** Moved `SparklinePoint` interface from `BodyweightSparklineWidget.tsx` to `src/models/widget.ts` (after `WeightTrendIntent`). Re-exported from `BodyweightSparklineWidget` for backward compatibility. Updated `WidgetGrid.tsx` to import from models.
- **Result:** Type now follows guardrail #5 — canonical definition in models, consumed across widget layer.

### ~~TD-032~~ · `RpeSelector` and `RirSelector` near-identical — **RESOLVED 2026-03-30**

- **Category:** DRY violation
- **Fix applied:** Extracted shared `NumericPillSelector.tsx` (184 lines) parameterized by `title`, `subtitle?`, `values`, `isHard`, `formatLabel`. `RpeSelector` (34 lines) and `RirSelector` (36 lines) are now thin wrappers passing config-only props.
- **Result:** 315 lines → 254 lines. Zero structural duplication. Adding future selectors (tempo, rest period) requires only a new ~35-line wrapper.

### ~~TD-030~~ · `WorkoutScreen.tsx` exceeds 600-line component guardrail — **RESOLVED 2026-03-30**

- **Guardrail:** #1 (Component size limit)
- **Original:** 856 lines (43% over limit)
- **Fix applied:** Extracted 4 modules to `src/components/workout/` and `src/hooks/workout/`:
  - `SupersetGroup.tsx` (151 lines) — visual superset bracketing wrapper with ExerciseCard rendering
  - `WorkoutNoteSection.tsx` (130 lines) — workout-level note editor/display
  - `WorkoutHeader.tsx` (162 lines) — title bar with Discard/Finish buttons + live stats row
  - `useWorkoutSettings.ts` (72 lines) — settings state management hook (5 `useState` → 1 hook call)
- **Result:** `WorkoutScreen.tsx` reduced to 603 lines (30% reduction). All extracted files well under 600 lines. Also resolved guardrail #4 (hook extraction signal) for settings concern.

### ~~TD-033~~ · Inline volume formatting in `WorkoutScreen.tsx` duplicates `formatCompactVolume` — **RESOLVED 2026-03-30**

- **Category:** DRY violation / drift risk
- **Fix applied:** Replaced inline `> 999 ? ${(v/1000).toFixed(1)}k : v` with `formatCompactVolume(stats.volume)` from `src/utils/formatters.ts`. Formatter now lives in `WorkoutHeader.tsx` which imports it directly.
- **Result:** Single source of truth for compact volume formatting restored.

### ~~TD-031~~ · `PreviousSetData` type defined in service, imported by UI components — **RESOLVED 2026-03-30**

- **Guardrail:** #5 (Canonical types live in `src/models/`)
- **Fix applied:** Moved `PreviousSetData` interface from `workoutService.ts` to `src/models/workout.ts` (after `WorkoutSet` which defines `SetType`). Re-exported from `workoutService` for backward compatibility. Updated 6 direct import sites (`SetRow`, `ExerciseCard`, `SupersetGroup`, `RenderableExerciseItem`, `workoutStore`, `services/index`) to import from models.
- **Result:** Type now follows guardrail #5 — canonical definition in models, consumed across all layers.

### ~~TD-005~~ · `ExerciseFilter` → muscle group mapping hardcoded in UI — **RESOLVED 2026-03-29**

- Created centralized `src/models/muscleGroups.ts` with typed exports: `MUSCLE_LABELS`, `INDIVIDUAL_MUSCLE_FILTERS`, `COMPOSITE_FILTER_PILLS`, `ALL_MUSCLE_GROUPS`.
- Replaced 4 local duplications: `ExerciseListView` (type + switch + array), `ExercisePicker` (10-item array), `MuscleDistributionChart` (18-entry labels), `AddExerciseScreen` (14-entry array).
- All consumers now import from a single source of truth typed against `MuscleGroup`.

### ~~TD-004~~ · Hardcoded `" lbs"` unit across UI — **RESOLVED 2026-03-29**

- Created `useWeightUnit` hook (`src/hooks/useWeightUnit.ts`) with module-level cache.
- Provides `useWeightUnit()` (hook) and `getWeightUnitSync()` (sync accessor) to read `weightUnit` from `user_settings`.
- Updated 13 files: `MacroAnalyticsView`, `ExerciseAnalyticsScreen`, `formatters`, `PhotoCell`, `PhotoViewer`, `CompareView`, `GoalsScreen`, `GoalCreationModal`, `GoalEmptyState`, `WorkoutKeyboard`, `SetRow`, `BodyweightSparklineWidget`, `PinnedExerciseWidget`, `MeasurementsScreen`, `TrendsTab`.
- All UI-facing weight unit strings now read from settings; only DB defaults and type definitions retain literal `'lbs'`.

### ~~TD-011~~ · `calendarService.ts` monolith — **RESOLVED 2026-03-28**

- **Category:** Service boundary concern
- **Fix applied:** Extracted `personalRecordsService.ts` (327 lines) with 4 functions (`getPersonalRecordDates`, `backfillPersonalRecords`, `getFatigueDates`, `getPRSetIdsForDate`). Updated barrel exports and test file imports.
- **Result:** `calendarService.ts` reduced from 844 to 542 lines (calendar/heatmap/journal). `personalRecordsService.ts` at 327 lines (PRs/fatigue).

### ~~TD-003~~ · `analyticsService.ts` is a monolith — **RESOLVED 2026-03-28**

- **Category:** Service boundary concern
- **Fix applied:** Extracted `exerciseAnalyticsService.ts` (421 lines) with 7 per-exercise queries (`getPerformedExercises`, `getEstimated1RM`, `getMaxWeight`, `getExerciseVolume`, `getMaxReps`, `getBestWeightForReps`, `getFatigueRatio`). Updated barrel exports, 3 direct import sites, and test file.
- **Result:** `analyticsService.ts` reduced from 851 to 462 lines (macro only). `exerciseAnalyticsService.ts` at 421 lines (micro/exercise).

### ~~TD-026~~ · `WeightTrendIntent` type defined in component, not `src/models/` — **RESOLVED 2026-03-28**

- **Category:** Type ownership / guardrail #5 deviation
- **Fix applied:** Moved `WeightTrendIntent` to `src/models/widget.ts`. Updated 4 import sites (`WidgetGrid.tsx`, `BodyweightSparklineWidget.tsx`, `SparklineRow.tsx`, `TrendsTab.tsx`). `WidgetGrid.tsx` re-exports for backward compatibility.
- **Result:** All consumers import from models layer. No more `measurements → widgets` cross-boundary coupling.

### ~~TD-027~~ · Bodyweight goal intent derivation logic duplicated in 2 files — **RESOLVED 2026-03-28**

- **Category:** DRY violation
- **Fix applied:** Created `src/utils/goalHelpers.ts` with `deriveBodyweightIntent(activeGoals: Goal[]): WeightTrendIntent`. Both `WidgetGrid.tsx` and `TrendsTab.tsx` now call this shared helper.
- **Result:** Single source of truth for bodyweight intent derivation. Adding "maintain" state only requires one change.

### ~~TD-028~~ · `formatVolume` duplicated in `WorkloadReadinessWidget.tsx` — **RESOLVED 2026-03-28**

- **Category:** DRY violation
- **Fix applied:** Added `formatCompactVolume(v: number): string` to `src/utils/formatters.ts` (compact format: "12k", "1.5k", "450"). `WorkloadReadinessWidget.tsx` now imports it instead of defining a local copy.
- **Result:** Single source of truth for compact volume formatting.

### ~~TD-009~~ · Cross-boundary types defined in service files instead of `src/models/` — **RESOLVED 2026-03-25**

- **Category:** Type ownership / guardrail #5 deviation
- **Fix applied:** Moved `Template`/`TemplateExercise` to `src/models/template.ts` (replaced unused design-time types), created `src/models/calendar.ts` for `CalendarDayData`/`JournalEntry`/`PRSetIds`. Services import from models and re-export for barrel consumers. `UserSettings` was moved earlier (TD-015).
- **Result:** All cross-boundary types now live in `src/models/`. Guardrail #5 fully satisfied.


### ~~TD-015~~ · `formatISODate` helper duplicated — **RESOLVED 2026-03-24**

- **Category:** DRY violation
- **Fix applied:** Added `formatISODate(d: Date): string` to `src/utils/formatters.ts`. Replaced all 4 duplication sites (`TrackTab.tsx`, `GalleryTab.tsx`, `DetailChartView.tsx`, `mockDataService.ts`) with imports. Also moved `UserSettings` type from `preferencesService.ts` to `src/models/preferences.ts` (partial TD-009 scope).
- **Result:** Single source of truth for ISO date formatting. `UserSettings` now lives in models layer.

### ~~TD-025~~ · `WidgetEditorModal.tsx` exceeds 600-line component guardrail — **RESOLVED 2026-03-28**

- **Guardrail violated:** #1 (Component size limit)
- **Original:** 666 lines
- **Fix applied:** Extracted `ExercisePickerView.tsx` (225 lines) — exercise picker with metric toggle, search, and list. State management (exercises list, search text, metric selection) moved to the new component.
- **Result:** `WidgetEditorModal.tsx` reduced to 511 lines. `ExercisePickerView.tsx` at 225 lines.

### ~~TD-020~~ · `DetailChartView.tsx` exceeds 600-line component guardrail — **RESOLVED 2026-03-24**

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

### TD-021 · No in-progress workout persistence — **RESOLVED 2026-03-24**

- **Category:** Data safety / user trust
- **Original:** Active workout lived exclusively in Zustand's in-memory store. App crash/kill = entire workout lost.
- **Fix applied:** Created `workoutPersistence.ts` using `expo-file-system` (new File/Paths API). Every store mutation triggers a debounced (1s) JSON snapshot to disk. `restoreWorkout()` called on cold start from `App.tsx`. Dates serialized via JSON replacer/reviver. `finishWorkout`/`discardWorkout` clear the persisted file.
- **Result:** In-progress workouts survive app kills, crashes, and force-stops.

### TD-022 · `clearAllData()` does not clear all tables — **RESOLVED 2026-03-24**

- **Category:** Data integrity / maintenance
- **Original:** `clearAllData()` only deleted from 9 tables, but schema has 16 tables (including `personal_records`, `measurements`, `progress_photos`, `goals`, `exercises`, `user_preferences`). Tables from migrations v2–v7 were never cleaned.
- **Fix applied:** Added DELETE FROM for all 6 missing user-data tables in FK-safe order. `measurement_types` deliberately not cleared (migration-seeded reference data). Also clears persisted in-progress workout file (TD-021 artifact).
- **Result:** `clearAllData()` now covers all 15 user-data tables. Guardrail #11 satisfied.

### TD-002 · Duplicated chart label formatting logic across 3 files — **RESOLVED 2026-03-14**

- **Category:** DRY violation / anti-pattern
- **Original:** `MONTH_NAMES`, `lastMonth` tracking, and `labelComponent` factory copy-pasted 3× across `MacroAnalyticsView.tsx` and `ExerciseAnalyticsScreen.tsx` with only minor margin differences.
- **Fix applied:** Created `src/utils/chartLabels.tsx` with:
  - `createLabelProcessor()` — stateful factory that tracks months and returns `labelComponent` per data point
  - `BAR_CHART_MARGINS` / `LINE_CHART_MARGINS` — preset configs for each chart type
- **Result:** ~75 lines of duplicated code eliminated. All 3 call sites reduced to 2-line invocations. Future chart types just import a preset.

### TD-023 · `updateWorkout()` uses delete-then-reinsert — **RESOLVED 2026-03-24**

- **Category:** Data integrity / anti-pattern
- **Original:** `updateWorkout()` deleted the workout row + all exercises + all sets, then re-inserted everything. Any FK referencing `workouts(id)` (e.g., `personal_records.workout_id`) would silently orphan data.
- **Fix applied:** Replaced DELETE+INSERT of the parent `workouts` row with a proper `UPDATE ... SET ... WHERE id = ?`. Children (exercises/sets) still use delete-reinsert since their IDs are ephemeral and no external tables reference them.
- **Result:** `personal_records` FK references preserved across workout edits. Future child tables are automatically safe.

### TD-024 · Epley 1RM, volume, and status filter formulas duplicated — **RESOLVED 2026-03-24**

- **Category:** DRY violation / drift risk
- **Original:** Epley 1RM formula (`weight * (1.0 + reps / 30.0)`) and volume formula (`SUM(weight * reps)`) copy-pasted across `analyticsService.ts`, `calendarService.ts`, and `goalProgressService.ts`. Risk of drift on formula updates.
- **Fix applied:** Created `src/utils/sqlFragments.ts` with canonical constants (`EPLEY_1RM`, `MAX_EPLEY_1RM`, `SET_VOLUME`, `SESSION_VOLUME`, `SESSION_VOLUME_COALESCE`). Replaced 8 inline formula instances across all 3 services.
- **Result:** Formulas defined once. Future formula changes (e.g., Epley → Brzycki) require editing a single file.

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

### TD-034 · `workoutStore.ts` borderline at 650 lines

- **Guardrail:** #1 (Component size limit — 600)
- **Current:** 650 lines (8% over)
- **Why accepted:** The store is logically cohesive — all actions operate on `activeWorkout`. The persistence subscriber at the bottom (L640–649) is a natural extension. Action methods are individually small. Splitting a Zustand store has higher cost than benefit at this size. Will revisit if Phase 7 (ML auto-suggestions) adds significantly.
- **Found:** 2026-03-30 (workout logging refactor audit)

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
| 1 | Component size limit (600 lines) | ✅ `WorkoutScreen.tsx` at 603 lines (TD-030 resolved). `workoutStore.ts` at 650 (TD-034 accepted). All Exercise Details tabs under 452. |
| 2 | Avoid `any` types | ✅ Only in chart library callbacks (TD-A01 accepted — also in `ChartsTab.tsx`), `SaveTemplateModal` Alert buttons, navigation ref casts, and `ExerciseCard` cross-stack nav (BH-041). |
| 3 | Database schema changes require versioned migrations | ✅ 12 versioned migrations. v11 (`exercise_notes` single-note) and v12 (`exercise_notes` multi-note with DROP+recreate) added correctly. |
| 4 | Hook extraction signal: 3+ `useState` for one concern | ✅ All complex state correctly in hooks. Exercise Details tabs keep concerns separated (no single concern exceeds 3). |
| 5 | Canonical types live in `src/models/` | ✅ All cross-boundary types in models. `ExerciseSession`/`ExerciseNote` in `models/exerciseDetails.ts` (TD-035 compliant). |
| 6 | State reset on lifecycle boundaries | ✅ All Exercise Details tabs reset state in `useEffect([exerciseId])`. HistoryTab resets `sessions`, `hasMore`, `loadingMoreRef`. |
| 7 | SafeAreaView edges must match tab bar visibility | ✅ `ExerciseDetailsScreen` uses `edges={['bottom']}` — correct (stack header handles top, tab bar hidden in Profile stack). |
| 8 | Batch `IN (...)` queries chunked at 500 | ✅ `exerciseDetailsService.ts` chunks workout IDs at `BATCH_SIZE = 500`. All other IN() queries use shared `batchGetAll()`. |
| 9 | Services must not reach into stores | ✅ `exerciseDetailsService` imports only `getDatabase`, models, and `expo-crypto`. Zero store imports. |
| 10 | Shared formulas in one canonical location | ✅ SQL formulas in `sqlFragments.ts`. JS formulas in `formulas.ts` (`computeEpley1RM`, TD-035 resolved). JS formatters in `formatters.ts`. |
| 11 | New tables registered in `clearAllData()` | ✅ `exercise_notes` table added to `clearAllData()` with v11 reference comment. |
| 12 | `updateX()` must use UPDATE, not delete-reinsert | ✅ No update functions introduced in Exercise Details. `saveExerciseNote` uses INSERT, `deleteExerciseNote` uses DELETE by ID. |

---

## Scalability Watch List

Areas to monitor as the app approaches later roadmap phases:

| Concern | Current State | Will Break At |
|---------|--------------|--------------|
| **In-progress workout persistence** | ✅ Persisted via `workoutPersistence.ts` (TD-021 resolved) | N/A |
| **SQLite 999-param limit** | ✅ All IN() queries chunked via `batchGetAll()` (PP-037 resolved) | N/A |
| Navigation structure (3 tabs + modals) | Adequate for current features. Swipe navigation added. | Phase 5 (Settings) may need nested stacks or drawer |
| SQLite write patterns | Single-user, low frequency | Import feature (Phase 6) — bulk inserts need batching |
| Service file boundaries | ✅ 16 services, all under 600 lines. New `exerciseDetailsService` at 231 lines. `analyticsService` 462 + `exerciseAnalyticsService` 421 (TD-003). `calendarService` 542 + `personalRecordsService` 327 (TD-011). | ML features (Phase 7) |
| Hydration layer | Single mapping file, 256 lines | Every new model field = hydration update needed — fragile |
| Unit hardcoding (`lbs`) | ✅ Resolved (TD-004) — `useWeightUnit` hook + `getWeightUnitSync` accessor | — |
| SQL formula duplication | ✅ Resolved (TD-024) — `sqlFragments.ts` + `formulas.ts` (TD-035) | — |
| JS formatter duplication | ✅ Resolved (TD-033) — `formatCompactVolume` in `formatters.ts`, used by `WorkoutHeader` | — |
| Widget system type ownership | ✅ Resolved (TD-026, TD-029) — `WeightTrendIntent` + `SparklinePoint` in `models/widget.ts` | — |
| Workout logging type ownership | ✅ Resolved (TD-031) — `PreviousSetData` in `src/models/workout.ts` | — |
| Selector component duplication | ✅ Resolved (TD-032) — `NumericPillSelector` shared, RPE/RIR are thin wrappers | — |
| `WorkoutScreen` component size | ✅ Resolved (TD-030) — 603 lines after extracting 4 modules | — |
| `workoutStore` size | ⚠️ 650 lines (TD-034 accepted) — cohesive, monitor only | Phase 7 ML additions |
| Bodyweight intent derivation | ✅ Resolved (TD-027) — shared `deriveBodyweightIntent` in `goalHelpers.ts` | — |
| Service→store coupling | ✅ Resolved — `workoutService`/`measurementService` decoupled (BH-024) | — |
| Chart label logic | ✅ Resolved (TD-002) — shared via `chartLabels.tsx` | — |
| Calendar component size | ✅ Resolved (TD-006) — 325 lines | — |
| Measurement component sizes | ✅ Resolved (TD-012/013/014/020) — all under 550 lines | — |
| Goals component sizes | ✅ Resolved (TD-016/017/018/019) — all under 440 lines | — |
| `formatISODate` duplication | 4 files with identical date formatting logic (TD-015) | Any timezone edge-case fix |
| Type ownership | ✅ Resolved (TD-009) — all cross-boundary types in `src/models/` | — |
| Dead code (`ExerciseAnalyticsScreen`) | ✅ Resolved (TD-036) — deleted 545-line dead screen | — |
| Exercise Details component sizes | ✅ All tabs under 452 lines. Screen shell at 182. | — |

---

## Last Updated
- Date: 2026-04-12
- Session Context: Exercise Details ("Master Guide") tech debt audit — 8 files reviewed. TD-035 (Epley JS duplication → extracted to `formulas.ts`), TD-036 (dead `ExerciseAnalyticsScreen` → deleted), TD-037 (chart duplication → auto-resolved by TD-036). Guardrail #10 updated in conventions.md to cover JS formulas. 0 open issues.
