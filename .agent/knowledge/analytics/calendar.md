---
description: Calendar feature spec — heatmap view, daily modal, filtering, and journal mode
---

# Calendar Feature

> **Architecture note:** This spec aligns with the post-audit codebase (March 2026).
> See `conventions.md` for guardrails: 600-line component cap, typed DB rows, versioned migrations, hook extraction.

Profile-accessible calendar providing a heatmap of workout history with drill-down, filtering, and journal capabilities.

---

## Entry Point

Accessed via a **Calendar button on the Profile screen**. Opens as a full-screen view (not a modal) within the Profile tab's navigation stack.

---

## Layout Structure

### 1. Sticky Header

Fixed at the top while the calendar grid scrolls beneath it.

| Element | Source | Notes |
|---------|--------|-------|
| Streak badge | Computed: consecutive weeks with ≥1 workout | Format: `🔥 N Week Streak` |
| Rest days badge | Computed: rest days in current week from active split schedule | Format: `🛌 N Rest Day(s)` |
| Settings gear | Top-right | Opens calendar-specific preferences (see §Settings) |
| Filter icon | Adjacent to gear | Opens filter panel (see §Filters) |

**Data dependencies:**
- Streak: query `workouts.completed_at`, group by ISO week, find max consecutive run ending at current week
- Rest days: read from `splits_schedule` for active split where `item_type = 'rest'`

### 2. Calendar Grid (Infinite Scroll)

Vertical scroll of month blocks. Each month block contains:
- Month/year header (e.g., "March 2026")
- 7-column day grid aligned to user's configured start day (Sunday or Monday)
- Day cells: number + heatmap background

**Scrolling behavior:**
- Loads current month centered on screen
- Scrolls up = future months, down = past months
- Lazy-load month data as user scrolls (batch query by month range)
- Consider `FlatList` or `FlashList` with month-block items for performance

### 3. Day Cell Heatmap

Days with completed workouts receive a purple background fill. Intensity is driven by a user-selected metric:

| Metric (user-configurable) | DB Source | Calculation |
|----------------------------|-----------|-------------|
| **Total Volume** (default) | `workouts.total_volume` | Sum of all `weight × reps` for the day |
| **Number of Sets** | `workouts.total_sets` | Sum of sets across all workouts that day |
| **Workout Duration** | `workouts.total_duration` | Sum of durations (seconds) for the day |

**Color mapping:** Normalize the selected metric across the visible range (e.g., min-max of loaded months) to a 2-stop gradient:
- Low end → `colors.accent.primary` at ~30% opacity (light purple)
- High end → `colors.accent.primary` at 100% with a subtle glow/shadow

Days without workouts: transparent/default background.

---

## Tap Action — Daily Workout Modal

Tapping a day cell opens a **bottom-sheet modal** (slides up from bottom, covers approximately lower 50-60% of screen). Does NOT navigate to a new screen.

### Modal Contents

```
┌────────────────────────────────────┐
│  Saturday, March 1                 │
│  ─────────────────────────────     │
│  Push Day   🕐 47m   📊 12,450 lbs│
│                                    │
│  Bench Press         4×8 @ 185 lbs │
│  Incline DB Press    3×10 @ 60 lbs │
│  Cable Fly           3×12 @ 30 lbs │
│  Tricep Pushdown     3×10 @ 50 lbs │
│                                    │
│  [Edit Workout]          [Close]   │
└────────────────────────────────────┘
```

**Data source:** Query by `workouts.completed_at` date → JOIN `workout_exercises` → JOIN `workout_sets`.

**Fields displayed:**
- Workout name (`workouts.name`), duration (`workouts.total_duration`), total volume (`workouts.total_volume`)
- Exercise list: `workout_exercises.exercise_name`, aggregated sets (count × reps @ weight from `workout_sets`)

**Actions:**
- **Edit Workout** — routes to the active workout logger screen pre-loaded with this workout's data (requires a "load historical workout for editing" flow)
- **Close** — dismisses the bottom sheet

If multiple workouts exist on one day, show each workout as a separate section within the modal.

---

## Settings (Calendar-Specific)

Accessed via the gear icon in the sticky header. Opens as a small settings panel or bottom sheet.

| Setting | Options | Storage |
|---------|---------|---------|
| Start day of week | `Sunday` / `Monday` | `user_settings.calendar_start_day` column |
| Heatmap metric | `volume` (default) / `sets` / `duration` | `user_settings.calendar_heatmap_metric` column |

Read/write via `preferencesService.ts` (`getSettings()` / `updateSettings()`).

---

## Filter System

Accessed via the filter icon in the sticky header. Opens a panel/bottom sheet with toggleable filter modes. When a filter is active, the calendar grid changes its highlighting logic.

### Filter: PR / Progression

When active:
- **Normal workout days are grayed out** (desaturated, low opacity)
- **PR days are highlighted** with a distinct indicator (e.g., gold/yellow star badge on the day cell)
- PR types: Weight PR, Volume PR (weight × reps), Max Reps PR — per exercise

**Data computation:**
- For each exercise, scan `workout_sets` ordered by `completed_at`
- A PR occurs when `weight`, `weight × reps`, or `reps` exceeds all previous values for that exercise
- This is a derived computation — consider caching PR dates in a separate table or computing on-demand with SQLite window functions

### Filter: Fatigue Tracking (Strength Dips)

When active alongside PR filter:
- Highlight days where **volume or weight regressed** compared to the trailing average for an exercise
- Visual: subtle red/orange marker on affected days
- **Purpose:** If 3+ consecutive weeks show regressions, the calendar visually signals the user to take a deload week
- **Framing:** Never label as "weakness" — frame as "Fatigue Tracking" in the UI

### Filter: Notes & Journal

When active:
- Highlights only days where `workouts.note IS NOT NULL AND workouts.note != ''`
- Normal workout fill is grayed out; noted days get a distinct marker (e.g., small notebook icon or text indicator)

**Journal View toggle:** When the Notes filter is active, a secondary toggle switches from the calendar grid to a **vertical timeline view**:
- Chronological scrolling list (like a feed)
- Each entry shows: date, workout name, and the note text
- Searchable (text input at top filters notes by content keyword)
- This transforms the app into a searchable training diary

**Data source:** `workouts.note` column exists in the schema. `workout_exercises.note` also exists and could be included for per-exercise notes.

---

## Schema Impact

### Existing tables (no modifications needed for core calendar)
- `workouts` — has `completed_at`, `total_volume`, `total_sets`, `total_duration`, `note`
- `workout_exercises` — has `note`, exercise details
- `workout_sets` — has `weight`, `reps`, `completed_at`

### New tables (via versioned migration)
| Table | Purpose |
|-------|---------|
| `personal_records` | Cached PR entries: `exercise_id`, `pr_type` (weight/volume/reps), `value`, `workout_id`, `achieved_at` |

> **Convention:** All new tables must be created via a new migration in `migrations.ts` (e.g., v4). Never use inline `CREATE TABLE` or `ALTER TABLE`.

### New `user_settings` columns (via migration)
| Column | Type | Default |
|--------|------|---------|
| `calendar_start_day` | `TEXT` | `'sunday'` |
| `calendar_heatmap_metric` | `TEXT` | `'volume'` |

Add these columns to `user_settings` in the migration, then extend `UserSettings` interface and `DEFAULTS` in `preferencesService.ts`.

### Recommended indexes for performance
```sql
CREATE INDEX idx_workouts_completed_at ON workouts(completed_at);
-- idx_workouts_started_at already exists
```

---

## Component Architecture

```
ProfileScreen
  └─ CalendarScreen (stack navigation)
       ├─ CalendarHeader (sticky)
       │    ├─ StreakBadge
       │    ├─ RestDayBadge
       │    ├─ FilterButton → FilterPanel (bottom sheet)
       │    └─ SettingsButton → CalendarSettingsPanel (bottom sheet)
       ├─ CalendarGrid (FlatList/FlashList of MonthBlock items)
       │    └─ ErrorBoundary (wraps each MonthBlock)
       │         └─ MonthBlock
       │              └─ DayCell (heatmap fill, PR badge, note indicator)
       ├─ DailyWorkoutModal (bottom sheet)
       └─ JournalView (conditional, replaces grid when Notes filter + Journal toggle active)
```

### Hooks (convention: extract when 3+ useState for one concern)
- `useCalendarData(month, year)` — fetches workout summaries, manages heatmap data
- `useCalendarFilters()` — manages active filter state (PR, fatigue, notes)
- `useCalendarSettings()` — reads/writes calendar-specific `user_settings` via `preferencesService`

---

## Service Layer

New service file: `src/services/calendarService.ts`

**Required functions:**
- `getWorkoutsForMonth(year, month)` — returns workout summaries for heatmap rendering
- `getWorkoutDetail(workoutId)` — returns full workout with exercises and sets for the daily modal (use `mapWorkoutRow` from `hydration.ts`)
- `getWorkoutStreak()` — returns current consecutive-week streak count
- `getPersonalRecordDates(exerciseId?, prType?)` — returns dates where PRs were achieved
- `getNoteDates(startDate, endDate)` — returns dates that have workout/exercise notes
- `searchNotes(query)` — full-text search across workout and exercise notes

**Data layer conventions:**
- Define typed row interfaces for all query results (e.g., `CalendarDayRow`). Never use `any`.
- Use `safeJsonParse()` from `hydration.ts` for any JSON columns (`muscle_groups_worked`, etc.).
- Reuse `mapWorkoutRow`/`mapExerciseRow`/`mapSetRow` from `hydration.ts` when assembling full workout detail.

**PR detection** can be computed lazily on first calendar load and cached in `personal_records` table, then incrementally updated when new workouts are saved.
