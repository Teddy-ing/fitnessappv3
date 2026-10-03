---
description: Historical planning artifacts captured from the old progress document
---

# Planning artifacts — captured 2026-10-02

The lists below accumulated during development, mostly January–May 2026. They
did not have reliable individual snapshot dates; October 2 is the capture date,
not an invented planning or completion date. They are preserved as historical
artifacts rather than an active roadmap. Checked boxes and old future-tense
statements describe the original notes.

## How these plans changed

- IronJot is the final name. Zustand, SQLite and local statistical suggestions
  are implemented; those technology choices are settled.
- The assistant and paid cloud AI tier were retired in September 2026.
- Themes, optional setup and the quick-start tutorial are implemented.
- Google Drive backup exists, but production sign-in/restore verification
  remains. Local/cloud backups do not yet package progress-photo image files.
- The old superset-unlink report still needs reproduction before being treated
  as a current defect. It is tracked in the current release follow-up.
- The original MIT note conflicts with the GPLv3 LICENSE file; the license
  choice remains unresolved.
- RPE/RIR analytics below are speculative product ideas, not implemented
  features, validated training advice or release commitments.

Use [Current Progress](../current-progress.md) for current priorities and
[Improvement Backlog](../improvement-backlog.md) for feature candidates.

## Completed checklist

- [x] Initial brainstorming session
- [x] Market positioning defined
- [x] User personas documented
- [x] Competitive landscape analyzed
- [x] Monetization philosophy established
- [x] Agent knowledge system set up
- [x] Tech stack decided (React Native + Expo)
- [x] On-device ML features conceptualized
- [x] AI tier features conceptualized
- [x] Comprehensive market research completed (Strong, Hevy, Reddit sentiment)
- [x] UI design guidelines documented (Frankenstein Method)
- [x] Open source decision made
- [x] Background timer technical solution identified
- [x] **React Native + Expo project scaffolded**
- [x] Project structure created (src/components, screens, services, etc.)
- [x] Theme configuration created (dark mode, Hevy-inspired colors)
- [x] README.md and LICENSE (MIT) created
- [x] **Core data models designed** (Exercise, Workout, Template, User)
- [x] **Navigation set up** (3 tabs: Assistant, Workout, Profile)
- [x] Placeholder screens created for all tabs
- [x] **Safe area handling for different device navigation types**
- [x] Android compatibility fixes (removed gap, transform properties)
- [x] **Zustand state management installed and configured**
- [x] **Exercise seed database created** (50+ exercises covering all muscle groups)
- [x] **Core workout logging components built** (SetRow, ExerciseCard, ExercisePicker)
- [x] **WorkoutScreen fully implemented** (start workout, add exercises, log sets)
- [x] **Rest timer implemented** (FloatingOverlay, haptic feedback, +/-30s adjust)
- [x] **Local database with expo-sqlite** (workouts, exercises, sets, templates)
- [x] **Template system** (save workout as template, start from template)
- [x] **Workout history** (recent workouts displayed on home screen)
- [x] **Splits feature** (group templates, active split, split-based home screen)
- [x] **Template cycling** (current template, manual position switching, date-based advance)
- [x] **Browse Templates/Splits dual-button layout**
- [x] **Current Template + Current Split cards side-by-side**
- [x] **Rest days in split creation** (Add Rest Day button, schedule preview)
- [x] **Phase 1: Custom Exercises** (add/edit/delete custom exercises, favorites, hide/unhide)
- [x] **Phase 2: Set Variations** (set type selector, visual badges W/D/F/A, row colors)
- [x] **Phase 3: Cardio & Stretching** (category tabs, 14 cardio exercises, equipment types)
- [x] **Polish fixes** (favorites sort to top, Hidden tab at end, smaller category icons)
- [x] **Phase 1: Visual Refactor — Home Screen** (WorkoutHomeView extraction, WeeklyTracker, MaterialIcons nav, keyboard safe area, rest day UX)
- [x] **Codebase Quality & Testing — Phase 1/2** (God Component Decomposition, `WorkoutScreen`/`SplitsScreen` broken down, Jest setup, typed hydration bugfixes)
- [x] **Database Reliability** (Versioned migrations system implemented)
- [x] **Store Architecture Cleanup** (UI state removed from domain stores, RestTimer extracted)
- [x] **Fix overlapping X-axis labels in Analytics charts** (added dynamic month tick marks while preserving full date tooltips)
- [x] **Phase 2: Analytics Functions** (Macro charts, muscle distribution pie chart, micro exercise charts, fatigue ratio, tooltips, all backed by 140 passing tests)
- [x] **Exercise List 3-Layer Navigation** (Search bar + muscle group filter pills + dynamic list with icon placeholders, SQL LIKE filter on exercise_muscle_groups)
- [x] **Phase 3: Calendar Feature** (Phases A–E complete: all spec items implemented — heatmap grid, modal, PR/notes/fatigue filters, journal view, edit workout button, 10 service functions, 39 calendar tests)
- [x] **Measurements Feature** (Phases 1–4: DB schema + 15 seeded types, Track tab with keyboard, Trends tab with sparklines + detail charts, Gallery tab with photo grid/viewer/compare, Relative Strength overlay, 26 measurement tests)
- [x] **Goals Feature — Foundation + Screen Shell** (Phases 1–2: v7 migration + goals table, Goal model + goalService with CRUD/progress/completion, GoalsScreen with SegmentedControl/FAB/empty state, 34 goal tests)
- [x] **Goals Feature — Cards + Creation Flow** (Phases 3–4: GoalCard with deadline projection, CompletedGoalCard, context menu, multi-step creation wizard with ExercisePicker reuse)
- [x] **Goals Feature — Auto-Progress + Celebration** (Phase 5: refreshAllGoalProgress hooked into saveWorkout/updateWorkout/logMeasurement, Zustand-based celebration toast overlay)
- [x] **Goals Feature — Polish** (Phase 6: GoalDetailModal with progress circle/stats grid/timeline/projection, deadline warning badges)
- [x] **Full-Project QA Audit** (Bug Hunter: 0 new bugs across 65+ files; Performance Profiler: 0 regressions across 8 checklist areas; Tech Debt Auditor: 1 active item found and resolved (TD-020), 6 latent items tracked, all 7 guardrails pass)
- [x] **Profile & Settings Restructure** (Moved admin features to new SettingsScreen, replaced static stats on ProfileScreen with widget placeholders, cleaned WorkoutHomeView)
- [x] **Widget System — Phase 3A** (Widget data model + v8 migration, WidgetGrid flexbox layout, 3 MVP widgets: Streak Badge, Weekly Wrap-Up, Bodyweight Sparkline, WidgetEditorModal with add/remove/reorder, ProfileScreen overhaul with 2×2 dashboard grid)
- [x] **Widget System — Phase 3B** (4 advanced widgets: Goal Progress SVG ring, Muscle Balance bar chart, Workload/Readiness ACWR ratio, Pinned Exercise line chart, exercise picker with search + metric toggle in editor, all 7 catalog entries live)
- [x] **Bug Fix & QOL Pass** (Settings navigation fix, GoalsScreen/WidgetEditorModal safe area clipping, swipe-to-navigate between tabs, keyboard unit labels, bodyweight trend intent coloring, widget deep-linking)
- [x] **Tech Debt Remediation — Widget System** (TD-025: extracted ExercisePickerView from WidgetEditorModal 666→511 lines; TD-026: moved WeightTrendIntent to models; TD-027: shared deriveBodyweightIntent helper; TD-028: shared formatCompactVolume formatter)
- [x] **Tech Debt Remediation — Service Monoliths** (TD-003: split analyticsService 851→462+421 lines into macro + exerciseAnalyticsService; TD-011: split calendarService 844→542+327 lines into calendar + personalRecordsService)
- [x] **Tech Debt Remediation — Hardcoded Units** (TD-004: created `useWeightUnit` hook with module-level cache, replaced 20+ hardcoded `'lbs'` strings across 13+ files with dynamic settings-based unit)
- [x] **Tech Debt Remediation — Muscle Group Taxonomy** (TD-005: created centralized `muscleGroups.ts` with `MUSCLE_LABELS`, `COMPOSITE_FILTER_PILLS`, `INDIVIDUAL_MUSCLE_FILTERS`, `ALL_MUSCLE_GROUPS`; replaced 4 duplicated mappings across `ExerciseListView`, `ExercisePicker`, `MuscleDistributionChart`, `AddExerciseScreen`)
- [x] **Workout Logging Redesign — Phase 1** (Table layout + visual cleanup: stripped removals R-01/R-04/R-05/R-06, strict 40px table rows, Previous column with service query, opacity-based active set highlighting with pulsing checkbox, muted warmup styling)

---

- [x] **Workout Logging Redesign — Phase 2** (Interactions + Menu: `⋯` ellipsis menu with 5 actions, SetTypeMenu pill selector, inline exercise notes, replace exercise flow, warm-up set insertion)
- [x] **Workout Logging Redesign — Phase 3** (Auto-collapsing cards with LayoutAnimation, visual superset bracketing with vertical purple line + badge, workout-level notes via 📝 header icon, swipe-hint onboarding animation using expo-file-system guard)
- [x] **Workout Logging Redesign — Phase 4** (Settings-gated RPE column with RpeSelector popover, plate calculator modal in WorkoutKeyboard, v9 DB migration for `show_rpe` column)

---

- [x] **Exercise Details "Master Guide" Screen** — 4-tab exercise reference (About/History/Charts/Records) replacing ExerciseAnalyticsScreen

---

## Phase roadmap

### ~~Phase 2: Analytics Functions & Profile Screen Scoping~~ ✅ COMPLETE
- Macro charts, muscle distribution, micro exercise charts, fatigue ratio — all implemented
- Exercise list 3-layer navigation with filter pills
- Profile screen serves as hub for Analytics, Calendar, Measurements, Goals

### ~~Phase 3: Widget Framework~~ ✅ COMPLETE
- Reusable widget system with all 7 widget types implemented
- Widgets: Streak Badge, Weekly Wrap-Up, Bodyweight Sparkline, Goal Progress, Muscle Balance, Workload/Readiness, Pinned Exercise
- WidgetEditorModal with add/remove/reorder + exercise picker for pinned exercise
- ProfileScreen overhauled with WidgetGrid + 2×2 dashboard grid
- v8 migration for `widget_config` JSON column on `user_settings`

### ~~Phase 4: Profile Screen Visual Refactor + Analytics Screens~~ ✅ COMPLETE
- Profile screen redesigned with analytics integration
- Dedicated analytics screens (progress charts, PRs, volume trends) implemented
- Visual consistency achieved across all feature areas

### ~~Phase 5: Settings~~ ✅ COMPLETE
- General settings screen (units, theme placeholder, calendar start day, keep-awake, exercise media/instructions toggles)
- Workout settings menu (Previous/RPE/RIR columns, plate calc, warmup sets, default sets, weight increment, auto timer, timer duration, smart suggestions placeholder)
- Reusable row components (SettingToggleRow, SettingSegmentedRow, SettingNavigationRow)
- DB migration v12-v13 for 6 new settings columns
- Canonical weight storage (lbs) with input/output conversion
- Live-apply default/warmup sets to active workout
- RestTimer auto-start gating + configurable duration
- Weight unit propagation across analytics, records, history, calendar

### ~~Phase 6: Import & Export~~ ✅ COMPLETE (code)
- ~~Export workout data (XLSX, JSON)~~ ✅ Phases 1–3
- ~~Import from competitors (Hevy, Strong, FitNotes CSV formats)~~ ✅
- ~~Cloud Backup (Google Drive)~~ ✅ Phase 4 code complete (blocked on GCP setup)
- iCloud backup deferred

### Phase 7: ML & Personalization
- [x] On-device statistical engine for weight/rep prediction (trend-aware regression)
- [x] Smart rest timer defaults per exercise (learned from history)
- [x] Exercise suggestions (co-occurrence analysis)
- [x] Progressive overload nudge banners
- [x] Ghost text autocomplete (suggestions appear as dimmed values)
- [x] Ghost text tap-to-promote (Next/Complete commits suggestion values)
- [x] Template/split workout suggestion loading (batch fetch on workout open)
- [x] Pre-fill previous session values as ghost text fallback (prefillPrevious setting)
- [x] Settings toggles: Smart Suggestions, Progression Nudges, Pre-fill Previous
- [x] All processing on-device, no cloud dependency

### Phase 8: LLM Chatbot Feature
- AI chatbot assistant (paid tier)
- Preformatted queries (weak points, optimizations, template generation)
- Free-form conversation with workout context
- Cost-effective model selection and rate limiting

---

## Open questions at the time

- [x] ~~State management library choice~~ → **Zustand selected and implemented**
- [x] ~~Local database choice~~ → **expo-sqlite selected and implemented**
- [ ] On-device ML approach (TensorFlow Lite vs custom simple stats)
- [ ] Which AI provider for paid tier (cost optimization)
- [ ] App name (to be decided later)
- [x] ~~Widget framework choice~~ → **Custom modular system: WidgetConfig model + WidgetGrid flexbox layout + per-widget components (no third-party widget library needed)**

---

## RPE and RIR analytics proposal

**Focus:** Transforming qualitative RPE/RIR user inputs logged during workouts into quantifiable training metrics within the app's Analytics and Widget suites.

*The following outlines potential implementations linking training exertion data to performance tracking:*

**1. "True Potential" e1RM Calculations**
- **Trigger:** When users track `RIR` or `RPE` alongside standard `weight × reps`.
- **Implementation:** Enhance the `exerciseAnalyticsService.ts` to calculate a theoretical 1RM incorporating remaining effort. E.g., a set of 5 reps at 2 RIR is mathematically equivalent to a 7-rep max. 
- **UI Element:** Under `ExerciseAnalyticsScreen`, plot two lines on the 1RM LineChart: "Historical 1RM" (solid) and "Potential 1RM" (dotted, calculated via RIR offset).

**2. Fatigue Detection & Deload Prompting**
- **Trigger:** High `RPE` averages aggregated across successive weeks via the calendar service.
- **Implementation:** Create a chron-aggregator that flags when a user's trailing 14-day average RPE spikes into the 9–10 range on major compound lifts. 
- **UI Elements:** 
  - A contextual banner injected into `AnalyticsScreen` triggering a "High CNS Fatigue Risk: Consider a deload week".
  - Calendar integration reflecting "Redline" days in the heatmap or journal.

**3. "Stimulating" Volume Visualization**
- **Trigger:** Advanced volume tracking inside `AnalyticsScreen`. 
- **Implementation:** Shift focus from sheer physical volume (`reps × sets × weight`) to hypertrophy-stimulating volume by filtering sets. Sets registered at RIR 0–4 act as the core stimulus block.
- **UI Element:** Stacked `BarChart` on the Volume breakdown tab visualizing "Effective Volume" (Green, <4 RIR) vs "Junk/Warmup Volume" (Grey, >5 RIR).

**4. Evolved Workload Readiness Widget**
- **Implementation:** Modify the ACWR (Acute:Chronic Workload Ratio) algorithm powering the Home Screen's `WorkloadReadinessWidget` to scalar-multiply incoming `volume` by internal exertion (`RPE`). 10,000 lbs moved at RPE 6 will yield a drastically different recovery decay rate than 10,000 lbs moved at RPE 10.
