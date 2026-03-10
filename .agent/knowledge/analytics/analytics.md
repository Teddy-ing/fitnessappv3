---
description: Analytics feature spec — macro/micro workout statistics, dual-axis chart UI, fatigue tracking, and exercise-specific progression
---

# Analytics Feature

> **Architecture note:** This spec aligns with the post-audit codebase (March 2026).
> See `conventions.md` for guardrails: 600-line component cap, typed DB rows, versioned migrations, hook extraction.

Core statistics and visualization system. Two scopes: **Macro** (global workout trends) and **Micro** (per-exercise progression). Accessed from the Profile screen as a dedicated analytics hub.

---

## Entry Point

Button on `ProfileScreen` → pushes `AnalyticsScreen` onto the Profile stack navigator. The screen has two main sections accessible via a top-level segmented control or tab:

```
[ Workouts ]  [ Exercises ]
```

- **Workouts** = Macro-level analytics (global trends, muscle distribution, consistency)
- **Exercises** = Micro-level analytics (exercise-specific charts, accessed by tapping an exercise from a picker)

---

## Macro Analytics (Workouts Tab)

### The Dual-Axis Controller

This is the primary UI pattern for avoiding dropdown menus and keeping users anchored on visual data. Three control layers stacked vertically above the chart:

```
┌─────────────────────────────────────────────────┐
│  [ Volume ] | [ Sets ] | [ Reps ] | [ Duration ]│  ← Axis 1: Metric (segmented control)
│                                                  │
│  ( Per Workout ) ( Per Week ) ( Per Month ) ( Per Year )  ← Axis 2: Time Bucket (pills)
│                                                  │
│  ┌─────────────────────────────────────────┐     │
│  │          BAR CHART                      │     │  ← Main visualization
│  │   ▓▓  ▓▓  ▓▓     ▓▓  ▓▓  ▓▓  ▓▓  ▓▓   │     │
│  │   ▓▓  ▓▓  ▓▓  ▓  ▓▓  ▓▓  ▓▓  ▓▓  ▓▓   │     │
│  └─────────────────────────────────────────┘     │
│                                                  │
│  ( 1M ) ( 3M ) ( 6M ) ( 1Y ) ( ALL )            │  ← Axis 3: Chart Range (bottom pills)
└─────────────────────────────────────────────────┘
```

**Axis 1 — Metric (Segmented Control):**

| Option | DB Source | Aggregation |
|--------|-----------|-------------|
| Volume | `workouts.total_volume` | SUM per bucket |
| Sets | `workouts.total_sets` | SUM per bucket |
| Reps | `workout_sets.reps` | SUM (via join) per bucket |
| Duration | `workouts.total_duration` | SUM per bucket (display as hours/minutes) |

**Axis 2 — Time Bucket (Scrollable Pills):**

| Option | Grouping | Bar count example (1Y range) |
|--------|----------|------------------------------|
| Per Workout | Each workout is one bar | Variable (every workout in range) |
| Per Week | ISO weeks | ~52 bars |
| Per Month | Calendar months | 12 bars |
| Per Year | Calendar years | Variable |

**Axis 3 — Chart Range (Bottom Pills):**
Standard zoom: `1M`, `3M`, `6M`, `1Y`, `ALL`. Controls the date window of data shown.

**UX Example:** User wants monthly volume for the year → tap `[Volume]` → `(Per Month)` → `(1Y)` → chart shows 12 bars, one per month, each bar = SUM of `total_volume` for workouts in that month.

### Muscle Group Distribution

Below the time-series chart, a section showing muscle group breakdown:

**Chart type:** Horizontal bar chart or radar chart (configurable via small toggle).

**Data source:** Parse `workout_exercises.exercise_muscle_groups` (JSON string of `{muscleGroup, contribution}` pairs) using `safeJsonParse()` from `hydration.ts`. Aggregate by the selected metric:

| Metric | Calculation |
|--------|-------------|
| Sets | Count of sets per muscle group (weighted by contribution %) |
| Reps | SUM reps per muscle group |
| Volume | SUM (weight × reps) per muscle group |

**Time range:** Uses the same chart range selection from Axis 3.

### Consistency Stats

Summary cards below the charts:

| Stat | Source | Display |
|------|--------|---------|
| Total Workouts | `COUNT(*) FROM workouts` in range | "142 workouts" |
| Active Days | `COUNT(DISTINCT DATE(completed_at))` in range | "98 active days" |
| Current Streak | Consecutive weeks with ≥1 workout (shared with calendar) | "🔥 3 Week Streak" |
| Avg Workouts/Week | Total workouts ÷ weeks in range | "3.2/week" |

---

## Micro Analytics (Exercise-Specific)

### Exercise Selection

When user taps the **Exercises** tab, they see:
- Search bar at top
- List of exercises they've performed (sorted by recency or frequency)
- Tapping an exercise pushes an `ExerciseAnalyticsScreen`

### Exercise Analytics Layout

**Vertical stack of charts** (no tabs/toggles — scroll naturally):

```
┌─────────────────────────────────────┐
│  Barbell Bench Press                │
│  Last performed: Mar 1, 2026       │
│                                     │
│  ── Estimated 1RM ──────────────── │
│  ┌─────────────────────────┐       │
│  │  📈 Line Chart          │       │  ← Chart 1: Est. 1RM over time
│  └─────────────────────────┘       │
│  ( 1M ) ( 3M ) ( 6M ) ( 1Y )      │
│                                     │
│  ── Max Weight ─────────────────── │
│  ┌─────────────────────────┐       │
│  │  📈 Line Chart          │       │  ← Chart 2: Heaviest weight used
│  └─────────────────────────┘       │
│                                     │
│  ── Workout Volume ─────────────── │
│  ┌─────────────────────────┐       │
│  │  📊 Bar Chart           │       │  ← Chart 3: Total volume per session
│  └─────────────────────────┘       │
│                                     │
│  ── Max Reps ───────────────────── │
│  ┌─────────────────────────┐       │
│  │  📈 Line Chart          │       │  ← Chart 4: Best reps at any weight
│  └─────────────────────────┘       │
│                                     │
│  ── Best Weight for Reps ───────── │
│  │  5 reps: 225 lbs (Feb 28)      │  ← Chart 5 or table
│  │  8 reps: 195 lbs (Feb 21)      │
│  │  10 reps: 175 lbs (Feb 14)     │
│  └─────────────────────────────── │
└─────────────────────────────────────┘
```

### Data Sources for Each Chart

| Chart | Query | Calculation |
|-------|-------|-------------|
| **Estimated 1RM** | `workout_sets` for exercise, grouped by workout date | Epley: `weight × (1 + reps/30)`, take MAX per workout |
| **Max Weight** | `workout_sets` for exercise, grouped by workout date | `MAX(weight)` per workout |
| **Workout Volume** | `workout_sets` for exercise, grouped by workout date | `SUM(weight × reps)` per workout |
| **Max Reps** | `workout_sets` for exercise, grouped by workout date | `MAX(reps)` per workout (working sets only) |
| **Best Weight for Reps** | `workout_sets` for exercise | For each rep count (1-15), find `MAX(weight)` across all time |

All charts share a unified time range selector at the top of the screen (like macro view).

---

## Unique Innovation Features

### 1. Relative Strength Tracking

Combines bodyweight data from the **Measurements** feature with estimated 1RM data.

**Display:** Toggle on the `ExerciseAnalyticsScreen` 1RM chart: `"Show Relative Strength"`

When active:
- Divides each 1RM data point by the user's bodyweight on (or nearest to) that date
- Y-axis switches from absolute weight to a ratio (e.g., 1.25× BW)
- Alternative: dual-axis chart overlaying bodyweight line and 1RM line

**Data join:**
```sql
-- For each workout date, find the nearest bodyweight measurement
SELECT ws.completed_at, MAX(ws.weight * (1 + ws.reps / 30.0)) as est_1rm,
       m.value as bodyweight
FROM workout_sets ws
JOIN workout_exercises we ON ws.workout_exercise_id = we.id
LEFT JOIN measurements m ON m.measurement_type_id = 'bodyweight'
  AND m.recorded_at = (
    SELECT recorded_at FROM measurements
    WHERE measurement_type_id = 'bodyweight'
    ORDER BY ABS(JULIANDAY(recorded_at) - JULIANDAY(ws.completed_at))
    LIMIT 1
  )
WHERE we.exercise_id = ?
GROUP BY DATE(ws.completed_at)
```

**Dependency:** Requires the Measurements feature's `measurements` table with bodyweight data.

### 2. Fatigue & Workload Ratios

Tracks the ratio between chronic and acute workload to flag overtraining risk.

| Metric | Definition | Window |
|--------|-----------|--------|
| **Chronic Workload** | Average weekly volume over last 4 weeks | Rolling 4-week |
| **Acute Workload** | Total volume this week | Current week |
| **Acute:Chronic Ratio (ACR)** | `Acute ÷ Chronic` | Point-in-time |

**Thresholds:**
- ACR < 0.8 → "Light Week" (green indicator)
- ACR 0.8–1.3 → "Normal" (no indicator)
- ACR > 1.3 → "High Fatigue Week" (orange/red flag on dashboard)

**Display location:** Banner/card on the Macro analytics screen and optionally as a home screen widget.

**Computation:**
```sql
-- Acute: this week's total volume
SELECT SUM(total_volume) FROM workouts
WHERE completed_at >= DATE('now', '-7 days');

-- Chronic: avg weekly volume over last 4 weeks
SELECT SUM(total_volume) / 4.0 FROM workouts
WHERE completed_at >= DATE('now', '-28 days');
```

### 3. Automated Trophy Context

When aggregate statistics hit notable milestones, display contextual badges:

| Milestone | Badge Text |
|-----------|-----------|
| 100,000 lbs monthly volume | "Equivalent to lifting a commercial jet! ✈️" |
| 1,000 sets in a month | "A thousand sets strong! 💪" |
| 50 workouts completed | "Half-century club! 🏅" |
| 1RM exceeds bodyweight | "You lift more than yourself! 🏆" |
| 365 active days | "Year-round athlete! 🗓️" |

**Implementation:** Pure display logic — check computed values against a threshold table, render subtitle text when matched. No schema changes needed.

---

## Component Architecture

```
ProfileScreen
  └─ AnalyticsScreen (stack navigation push)
       ├─ SegmentedControl (Workouts | Exercises)
       │
       ├─ MacroAnalyticsTab (Workouts)
       │    ├─ DualAxisController
       │    │    ├─ MetricSelector (segmented: Volume/Sets/Reps/Duration)
       │    │    ├─ TimeBucketPills (Per Workout/Week/Month/Year)
       │    │    └─ ChartRangePills (1M/3M/6M/1Y/ALL)
       │    ├─ ErrorBoundary (wraps chart area)
       │    │    └─ BarChart (main visualization)
       │    ├─ ErrorBoundary (wraps distribution)
       │    │    └─ MuscleDistributionChart (horizontal bars or radar)
       │    ├─ ConsistencyCards (total workouts, active days, streak, avg/week)
       │    └─ FatigueRatioBanner (conditional, when ACR > 1.3)
       │
       └─ ExerciseListTab (Exercises)
            ├─ SearchBar
            ├─ ExerciseList (sorted by recency)
            └─ ExerciseAnalyticsScreen (pushed on tap)
                 ├─ ChartRangePills (shared across all charts)
                 ├─ ErrorBoundary (wraps each chart)
                 │    ├─ Estimated1RMChart (line, with relative strength toggle)
                 │    ├─ MaxWeightChart (line)
                 │    ├─ WorkoutVolumeChart (bar)
                 │    └─ MaxRepsChart (line)
                 ├─ BestWeightForRepsTable
                 └─ TrophyBadges (conditional)
```

### Hooks (convention: extract when 3+ useState for one concern)
- `useMacroAnalytics(metric, bucket, range)` — fetches aggregated data, manages chart state
- `useExerciseAnalytics(exerciseId, range)` — fetches per-exercise time-series
- `useFatigueRatio()` — computes acute/chronic workload ratio

---

## Service Layer

New service file: `src/services/analyticsService.ts`

**Macro functions:**
- `getAggregatedMetric(metric, timeBucket, dateRange)` → returns `{label, value}[]` for bar chart
- `getMuscleDistribution(metric, dateRange)` → returns `{muscleGroup, value}[]` (use `safeJsonParse` for muscle group JSON)
- `getConsistencyStats(dateRange)` → returns `{totalWorkouts, activeDays, streak, avgPerWeek}`
- `getFatigueRatio()` → returns `{acute, chronic, ratio, status}`

**Micro functions:**
- `getExerciseHistory(exerciseId)` → returns list of workout dates where exercise was performed
- `getEstimated1RM(exerciseId, dateRange)` → returns `{date, value}[]` time series
- `getMaxWeight(exerciseId, dateRange)` → returns `{date, value}[]` time series
- `getExerciseVolume(exerciseId, dateRange)` → returns `{date, value}[]` time series
- `getMaxReps(exerciseId, dateRange)` → returns `{date, value}[]` time series
- `getBestWeightForReps(exerciseId)` → returns `{reps, weight, date}[]` table
- `getRelativeStrength(exerciseId, dateRange)` → returns `{date, ratio, est1rm, bodyweight}[]`

**Trophy function:**
- `checkTrophyMilestones(dateRange?)` → returns `{milestone, achieved, badgeText}[]`

**Data layer conventions:**
- Define typed row interfaces for all query results (e.g., `AggregatedMetricRow`). Never use `any`.
- Use `safeJsonParse()` from `hydration.ts` for JSON columns (`muscle_groups_worked`, `exercise_muscle_groups`).
- Reuse `mapSetRow` from `hydration.ts` when processing raw set data.

---

## Schema Impact

No new tables required — all data is derived from existing tables:
- `workouts` — `total_volume`, `total_sets`, `total_duration`, `completed_at`
- `workout_exercises` — `exercise_id`, `exercise_muscle_groups`
- `workout_sets` — `weight`, `reps`, `completed_at`
- `measurements` — bodyweight data for relative strength (from measurements feature)

### Recommended Indexes

```sql
-- Exercise-level queries (micro analytics)
CREATE INDEX idx_workout_exercises_exercise_id ON workout_exercises(exercise_id);
-- Already exists: idx_workouts_started_at, idx_workout_exercises_workout_id, idx_workout_sets_workout_exercise_id
```

### Optional: Precomputed Aggregation Cache

For performance on large datasets, consider a materialized cache table (created via versioned migration in `migrations.ts`):

```sql
CREATE TABLE IF NOT EXISTS analytics_cache (
    id TEXT PRIMARY KEY,
    cache_key TEXT NOT NULL UNIQUE,  -- e.g., 'macro_volume_monthly_2026'
    data TEXT NOT NULL,              -- JSON payload
    computed_at TEXT NOT NULL,
    expires_at TEXT                  -- Invalidated when new workout saved
);
```

Invalidation: clear relevant cache keys in `workoutService.saveWorkout()` after a workout is completed.

> **Convention:** Parse `data` column with `safeJsonParse()` from `hydration.ts` to protect against corrupt cache entries.

---

## Cross-Feature Dependencies

- **Measurements feature:** Required for relative strength tracking (bodyweight data from `measurements` table)
- **Calendar feature:** Shares streak computation logic and PR detection; consider extracting shared service functions
- **Widget system:** Fatigue ratio banner, consistency stats, and recent PRs are natural widget candidates
- **Personal Records table** (from calendar spec): The `personal_records` cache table serves both the calendar PR filter and the micro analytics PR badges
