---
description: Living document tracking completed work, in-progress tasks, next steps, and session log
---

# Current Progress

## Summary

- **Phase:** Post-MVP Development — Phase 1 complete, entering analytics & widget framework
- **Status:** Core features + home screen visual refactor complete
- **Next Milestone:** Phase 2 — Analytics Functions & Profile Screen Scoping

---

## Completed

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

---

## In Progress

- [ ] **Phase 2: Analytics Functions & Profile Screen Scoping**

---

## Upcoming Roadmap

### Phase 2: Analytics Functions & Profile Screen Scoping
- Audit existing analytics/stats capabilities in the codebase
- Define what metrics and charts belong on the Profile screen
- Design the analytics data layer (aggregations, queries, caching)

### Phase 3: Widget Framework
- Reusable widget system (add/remove/reorder on home screen)
- Widgets are bite-sized capsules of profile page analytics
- Core framework first, then populate with real data after analytics

### Phase 4: Profile Screen Visual Refactor + Analytics Screens
- Redesign the Profile screen with analytics integration
- Create dedicated analytics/stats screens (progress charts, PRs, volume trends)
- Visual consistency with Phase 1 design language

### Phase 5: Settings
- User preferences screen (units, theme, rest timer defaults, notifications)
- App configuration (data management, about, privacy)
- On-device ML toggle and privacy controls

### Phase 6: Import & Export
- Export workout data (CSV, JSON, PDF)
- Import from competitors (Hevy, Strong, Fitnotes CSV formats)
- Backup/restore functionality

### Phase 7: ML & Personalization
- On-device ML for rep/weight autocomplete
- Workout day suggestions based on patterns
- Smart rest timer defaults per exercise
- All processing on-device, no cloud dependency

### Phase 8: LLM Chatbot Feature
- AI chatbot assistant (paid tier)
- Preformatted queries (weak points, optimizations, template generation)
- Free-form conversation with workout context
- Cost-effective model selection and rate limiting

---

## Known Bugs (Carry-over)

- [ ] **BUG-001: Superset unlink** — First exercise disappears when unlinking superset (deferred)

## Open Questions

- [x] ~~State management library choice~~ → **Zustand selected and implemented**
- [x] ~~Local database choice~~ → **expo-sqlite selected and implemented**
- [ ] On-device ML approach (TensorFlow Lite vs custom simple stats)
- [ ] Which AI provider for paid tier (cost optimization)
- [ ] App name (to be decided later)
- [ ] Widget framework choice (React Native widget libraries vs native modules)

---

## Session Log

### 2026-02-23: Phase 1 — Home Screen Visual Refactor

**Duration:** ~2 hours across sessions
**Focus:** Extracting home screen UI into dedicated component, matching mockup, fixing bugs

**What was done:**
- **WorkoutHomeView extraction** — Pulled home screen JSX/styles out of `WorkoutScreen.tsx` (1,601 → 1,228 lines)
- **WeeklyTracker** — M–S day circles with completed/rest/today/future states
- **Navigation overhaul** — Replaced emoji tab icons with MaterialIcons, tab bar hidden during active workout
- **Service layer** — Added `getWorkoutDatesThisWeek()` for weekly workout date queries
- **Rest day UX** — Rest day items tappable in template picker, rest day state on home screen with swap button
- **Bug fixes:**
  - Timezone: `DATE()` YYYY-MM-DD parsed as local time (not UTC) to prevent day-shift
  - Keyboard safe area: Added `useSafeAreaInsets()` bottom padding when tab bar is hidden
  - Rest day alignment: Simplified to today-only indicator (schedule doesn't map to calendar linearly)

**Files created:**
- `src/screens/WorkoutHomeView.tsx` — Extracted home screen component
- `src/components/WeeklyTracker.tsx` — Weekly day tracker

**Files modified:**
- `src/screens/WorkoutScreen.tsx` — Extracted home screen, added weekly dates state
- `src/navigation/AppNavigator.tsx` — MaterialIcons, tab bar hide on active workout
- `src/components/WorkoutKeyboard.tsx` — Safe area bottom padding
- `src/services/workoutService.ts` — `getWorkoutDatesThisWeek()`, timezone fix
- `src/services/index.ts`, `src/components/index.ts` — Barrel exports

---

### 2026-01-07/08: Splits Feature & Template Cycling

**Duration:** ~2 hours across sessions
**Focus:** Implementing splits, template cycling, and home screen redesign

**What was done:**
- **Splits System:**
  - Created `Split` model with `SplitScheduleItem` type (templates + rest days)
  - Created `splitService.ts` with full CRUD operations
  - Added database tables: `splits`, `splits_templates`, `user_preferences`
  - Created `SplitsScreen.tsx` modal (browse, create, delete, select active)
  - Multi-step template creation flow in split creation
  
- **Home Screen Redesign:**
  - Replaced single "All Templates" with dual browse buttons
  - Added "Current Template" + "Current Split" cards side-by-side
  - Current Template card shows next workout with "Start" and "Change" buttons
  
- **Template Cycling System:**
  - `getCurrentTemplateIndex()` / `setCurrentTemplateIndex()` for tracking position
  - `advanceToNextTemplate()` skips rest days automatically
  - `checkAndAdvanceIfNewDay()` - advances only when opening app next day
  - `markWorkoutCompletedToday()` - records date for next-day advance
  - Template picker modal for manual position switching
  
- **Created `TemplatesScreen.tsx`** — Browse all templates with delete

**Files created:**
- `src/models/split.ts` — Split and SplitScheduleItem types
- `src/services/splitService.ts` — Split CRUD + template cycling
- `src/screens/SplitsScreen.tsx` — Browse/create/delete splits modal
- `src/screens/TemplatesScreen.tsx` — Browse all templates modal

**Files updated:**
- `src/services/database.ts` — Added splits tables
- `src/services/index.ts` — Added split service exports
- `src/screens/WorkoutScreen.tsx` — New layout, template cycling integration
- `src/models/index.ts` — Added Split export

**Deferred to future session:**
- Rest days UI in split creation (data model supports it)

---

### 2026-01-09: Exercise System Overhaul (Phase 1-3)

**Duration:** ~4+ hours across sessions
**Focus:** Complete exercise management system with custom exercises, set variations, and cardio/stretching support

**What was done:**

**Phase 1a: Exercise Database & Service**
- Created `exercises` database table for custom exercises
- Created `exerciseService.ts` with full CRUD operations
- Added favorites toggle and hide/unhide functionality

**Phase 1b: Add/Edit Exercise UI**
- Created `AddExerciseScreen.tsx` modal with form
- Edit exercise (reuses AddExerciseScreen)
- Delete exercise (custom only)
- ExercisePicker '+ New' button
- Star toggle for favorites (in list view)
- Long-press menu for hide/edit options
- 'Custom' badge on user-created exercises

**Phase 1c: Images & Polish**
- Hidden exercises filter tab with Unhide button
- Exercise images with placeholder
- All styles for new UI elements

**Phase 2: Set Variations UI**
- Set type selector (tap badge → action sheet: Working/Warmup/Drop/Failure/AMRAP)
- Visual badges for set types (W/D/F/A letters with distinct colors)
- Row background colors per set type
- Superset grouping UI (Link button + SUPERSET badge + visual connector)
  - **NOTE: Superset unlink has a bug — see BUG-001**

**Phase 3: Cardio & Stretching**
- Category tabs in ExercisePicker (All/Strength/Cardio/Stretch with icons)
- Muscle filters only show for Strength category
- 14 cardio exercises added to seed data:
  - Treadmill Running, Outdoor Running, Stationary Bike, Outdoor Cycling
  - Rowing Machine, Elliptical, Stair Climber, Jump Rope
  - Battle Ropes, Box Jumps, Burpees, Mountain Climbers, Jumping Jacks, High Knees
- 8 new equipment types: treadmill, stationary_bike, elliptical, rowing_machine, stair_climber, jump_rope, battle_ropes, plyo_box

**Polish Fixes:**
- Favorites sort to top of exercise list
- Hidden filter tab moved to end of list
- First-time hide notice (per session)
- Smaller category icons with added spacing

**Files created:**
- `src/screens/AddExerciseScreen.tsx` — Add/edit exercise modal

**Files significantly modified:**
- `src/components/ExercisePicker.tsx` — Category tabs, favorites sorting, UI improvements
- `src/components/ExerciseCard.tsx` — Superset UI (badge, connector, link button)
- `src/components/SetRow.tsx` — Set type selector, visual badges, row colors
- `src/stores/workoutStore.ts` — toggleSuperset function
- `src/screens/WorkoutScreen.tsx` — Superset state computation
- `src/data/exercises.ts` — 14 cardio exercises
- `src/models/exercise.ts` — 8 new equipment types
- `src/services/exerciseService.ts` — CRUD operations for exercises

**Known Bug (deferred):**
- BUG-001: Superset unlink causes first exercise to visually disappear

---

### 2026-01-05 (Late Evening): Rest Timer, Database & Templates

**Duration:** ~45 min
**Focus:** Implementing persistence and template system

**What was done:**
- **Rest Timer:**
  - Added timer state to `workoutStore.ts` (duration, remaining, active, endTime)
  - Created `RestTimer.tsx` floating overlay component
  - Auto-starts on set completion, haptic feedback when done
  - +30s/-30s adjust buttons and skip option
- **Database (expo-sqlite):**
  - Created `database.ts` with schema (workouts, exercises, sets, templates)
  - Created `workoutService.ts` with CRUD operations
  - Created `templateService.ts` for template management
- **Template System:**
  - Created `TemplateCard.tsx` component
  - Save workout as template flow (modal after finishing)
  - Start workout from template functionality
- **WorkoutScreen Updates:**
  - Displays recent workouts from database
  - Displays saved templates
  - Pull-to-refresh for data reload
  - Save as template modal

**Files created:**
- `src/components/RestTimer.tsx` — Floating rest timer overlay
- `src/components/TemplateCard.tsx` — Template display card
- `src/services/database.ts` — SQLite database initialization
- `src/services/workoutService.ts` — Workout CRUD operations
- `src/services/templateService.ts` — Template CRUD operations
- `src/services/index.ts` — Service exports

**Files updated:**
- `src/stores/workoutStore.ts` — Added rest timer state and actions
- `src/screens/WorkoutScreen.tsx` — Full integration with all features
- `src/components/index.ts` — Added new component exports

**Dependencies added:**
- `expo-sqlite` — Local database
- `expo-haptics` — Haptic feedback for rest timer

---

### 2026-01-05 (Evening): Core Workout Logging Implementation

**Duration:** ~30 min
**Focus:** Implementing the main workout logging experience

**What was done:**
- Installed Zustand for state management
- Created exercise seed database with 50+ exercises:
  - Chest, Back, Shoulders, Arms (Biceps/Triceps)
  - Legs (Quads, Hamstrings, Glutes, Calves)
  - Core exercises and stretches
  - Helper functions for search/filter by muscle/equipment/category
- Built `workoutStore.ts` with Zustand:
  - Active workout state management
  - Exercise and set CRUD operations
  - Checkmark completion flow
- Built UI components following Hevy/Strong design patterns:
  - `SetRow` — Weight/reps inputs with completion checkbox
  - `ExerciseCard` — Card layout with exercise info, sets list, progress bar
  - `ExercisePicker` — Modal with search and muscle group filtering
- Updated `WorkoutScreen` with:
  - Empty state with "Start Empty Workout" button
  - Active workout view with stats (duration, exercises, sets, volume)
  - Exercise cards with full set logging
  - "Add Exercise" flow with picker modal

**Files created:**
- `src/data/exercises.ts` — 50+ seed exercises
- `src/data/index.ts` — Data exports
- `src/stores/workoutStore.ts` — Zustand workout store
- `src/stores/index.ts` — Store exports
- `src/components/SetRow.tsx` — Set row component
- `src/components/ExerciseCard.tsx` — Exercise card component
- `src/components/ExercisePicker.tsx` — Exercise picker modal
- `src/components/index.ts` — Component exports

**Files updated:**
- `src/screens/WorkoutScreen.tsx` — Full workout logging implementation

**Dependencies added:**
- `zustand` — Lightweight state management

---

### 2026-01-05 (Afternoon): Navigation & Android Fixes

**Duration:** ~1.5 hours
**Focus:** Setting up navigation, fixing Android compatibility issues

**What was done:**
- Installed navigation dependencies (@react-navigation/native, bottom-tabs)
- Created 3-tab bottom navigation (Assistant, Workout, Profile)
- Created placeholder screens for all tabs with dark theme styling
- Fixed Android runtime error ("java.lang.String cannot be cast to java.lang.Boolean")
  - Downgraded react-native-screens to ~4.16.0
  - Removed `gap` property (replaced with margins)
  - Removed `textTransform: 'uppercase'`
  - Removed `transform: [{ scale: 1.1 }]`
- Fixed bottom navigation overlapping system navigation buttons
  - Added `useSafeAreaInsets()` for dynamic padding
  - Works with gesture nav, 3-button nav, and older devices
- Documented device-specific considerations in ui-guidelines.md
- Added TODO for custom navigation icons

**Files created/updated:**
- `src/navigation/AppNavigator.tsx` — Main navigation with safe area handling
- `src/navigation/index.ts` — Navigation exports
- `src/screens/WorkoutScreen.tsx` — Placeholder with empty state
- `src/screens/AssistantScreen.tsx` — AI feature buttons placeholder
- `src/screens/ProfileScreen.tsx` — Stats and settings menu
- `src/screens/index.ts` — Screen exports
- `App.tsx` — Updated to use AppNavigator
- `ui-guidelines.md` — Device considerations, custom icons TODO

---

### 2026-01-05 (Afternoon): Data Models & Scaffolding

**Duration:** ~1 hour
**Focus:** Core data models and project structure

**What was done:**
- Created comprehensive TypeScript data models:
  - `exercise.ts` — MuscleGroup, Equipment, ExerciseCategory, MuscleContribution
  - `workout.ts` — SetType, WorkoutSet, WorkoutExercise, WorkoutSection, Workout
  - `template.ts` — TemplateSet, TemplateExercise, Template
  - `user.ts` — UserPreferences, UserStats, PersonalRecord
- Models include support for:
  - Warmup/main/cooldown workout sections
  - Multiple muscle groups per exercise (weighted)
  - Set types (warmup, working, drop, failure, AMRAP, etc.)
  - RPE/RIR tracking
  - ML preparation fields (suggested values, day patterns)

**Files created:**
- `src/models/index.ts`
- `src/models/exercise.ts`
- `src/models/workout.ts`
- `src/models/template.ts`
- `src/models/user.ts`

---

### 2026-01-04 (Late Evening): Comprehensive Market Research

**Duration:** ~45 min
**Focus:** Web research across Reddit and fitness communities

**Key findings:**
- **Hevy is the current Reddit favorite** — active development, $75 lifetime
- **Strong is losing users** — perceived stagnant development
- **Fitnotes is Android-only** — major gap for cross-platform
- **Hevy does NOT have on-device ML** — our key differentiator
- **Users hate: too many clicks, start/stop paradigm, paywalls**
- **Users love: fast logging, CSV export, lifetime purchases**

---

### 2026-01-04 (Earlier): Initial Setup & Planning

**What was created:**
- AGENTS.md (knowledge persistence instructions)
- Knowledge files: app-vision, target-users, competitive-analysis, monetization
- feature-design.md, project-config.md, ui-guidelines.md
- market-research.md

---

## Reference Screenshots

Screenshots of competitor apps are available in `.agent/reference/`:
- `hevy/` — 15 screenshots (homescreen, workout, exercise detail, statistics, profile)
- `strong/` — 4 screenshots (template, workout screens)

---

## Last Updated
- Date: 2026-02-23
- Session Context: Completed Phase 1 home screen visual refactor, reordered roadmap (analytics before widgets)

