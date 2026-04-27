---
description: Goals feature spec — active/trophy case layout, goal cards with progress tracking, creation flow, quick-add empty states
---

# Goals Feature

> **Architecture note:** This spec aligns with the post-audit codebase (March 2026).
> See `conventions.md` for guardrails: 600-line component cap, typed DB rows, versioned migrations, hook extraction.

Profile-accessible goal tracking system with automatic progress updates from local workout and measurement data. Accessed via a Goals button on the Profile screen, opens as a full-screen view within the Profile stack navigator.

---

## Entry Point & Layout

Button on `ProfileScreen` → pushes `GoalsScreen` onto the Profile stack.

### Top-Level Structure

```
GoalsScreen
  ├─ SegmentedControl: [ Active ] | [ Trophy Case ]
  ├─ GoalsList (active or completed, based on selected tab)
  └─ FAB (+ button, bottom-right, opens creation flow)
```

---

## Tab: Active Goals

Vertically scrolling list of active goal cards. Sorted by deadline proximity (soonest first), then by creation date.

### Goal Card UI

Each card is a self-contained status display:

```
┌─────────────────────────────────────────────┐
│  🏋️ Barbell Squat: 315 lbs          ⏳ 4w  │  ← Title + deadline badge
│  "Prep legs for Galbraith Mountain"         │  ← Custom label (optional, dimmed)
│                                             │
│  ████████████████░░░░░░░░░░░  275 / 315 lbs │  ← Progress bar + numbers
│                                      87%    │
└─────────────────────────────────────────────┘
```

**Card elements:**

| Element | Source | Notes |
|---------|--------|-------|
| Title | `{exercise_name}: {target_value} {unit}` or `{measurement}: {target}` | Auto-generated from goal type |
| Custom label | `goals.label` | Optional, user-supplied motivational text |
| Progress bar | Computed: `current_best / target_value` | Purple gradient fill (`colors.gradient.primary`) |
| Numbers | `{current_best} / {target_value} {unit}` | Current best auto-updated from workout/measurement data |
| Percentage | `ROUND(current_best / target_value * 100)` | Displayed right-aligned below bar |
| Deadline badge | `goals.deadline` | Format: `⏳ Nw left` or `⏳ Nd left` |

**Deadline warning logic:**

Linear projection check: if `current_best + (daily_rate × days_remaining) < target_value`, the deadline badge turns amber (`colors.accent.warning` or similar).

- `daily_rate` = `(current_best - starting_value) / days_elapsed`
- If projected to miss deadline → amber badge: `⚠️ 4w left`
- If past deadline and incomplete → red badge: `⏰ Overdue`

### Card Actions

- **Tap** → expands to detail view (shows progress chart over time, milestone history)
- **Long-press** → context menu: Edit, Delete, Mark Complete (manual override)
- **Swipe left** → Delete with confirmation

---

## Tab: Trophy Case (Completed Goals)

Historical log of achieved goals. Each card shows:

```
┌─────────────────────────────────────────────┐
│  🏆 Barbell Squat: 315 lbs                 │
│  "Prep legs for Galbraith Mountain"         │
│  Achieved: Feb 28, 2026  ·  Started: Jan 1 │
│  ████████████████████████████████████  100%  │
└─────────────────────────────────────────────┘
```

- Full progress bar at 100% with a gold/trophy accent
- Achievement date prominently displayed
- Sorted reverse-chronologically (most recent achievement first)
- Goals move here automatically when `current_best >= target_value`, or via manual completion

---

## Goal Creation Flow

Triggered by the floating `[+]` button. Opens as a multi-step bottom sheet or full-screen modal. Sequential steps restrict input to logical choices:

### Step 1: Select Target Type

Two large tappable cards:

```
┌─────────────────┐  ┌─────────────────┐
│  🏋️ Exercise     │  │  📏 Measurement  │
│                 │  │                 │
│  1RM, Volume,   │  │  Bodyweight,    │
│  Max Reps       │  │  Body Fat %     │
└─────────────────┘  └─────────────────┘
```

### Step 2: Select Specific Target

**If Exercise:**
- Exercise picker (reuse existing `ExercisePicker` component, filtered to exercises user has performed)
- Then select metric: `Estimated 1RM` / `Max Volume (single session)` / `Max Reps (single set)`

**If Measurement:**
- Measurement type picker (from `measurement_types` table, filtered to user's visible measurements)
- Metrics are inherent (bodyweight = target weight, body fat = target %)

### Step 3: Set Target Value

- Numeric keypad input (reuse `WorkoutKeyboard` component with a custom hook following `useWorkoutKeyboard.ts` pattern)
- Display current best prominently: "Current best: 275 lbs"
- Unit auto-set based on exercise/measurement selection (read `user_settings.weight_unit` via `preferencesService`)

### Step 4: Set Deadline (Optional)

- Calendar date picker
- Quick options: `4 Weeks`, `8 Weeks`, `12 Weeks`, `6 Months`, `Custom`
- If skipped, no deadline badge shown (open-ended goal)

### Step 5: Custom Label (Optional)

- Text input field
- Placeholder: "Name this goal (optional)"
- Examples shown below input: "Summer Cut", "Prep for competition"

### Confirmation

Summary card showing the goal before creation. `[Create Goal]` button.

---

## Empty State: Quick-Add Goals

When the Active tab is empty, display an actionable onboarding screen:

```
┌──────────────────────────────────────────┐
│                                          │
│         🎯 What are we aiming for?       │
│                                          │
│   Set a target and watch your progress   │
│                                          │
│   ┌──────────────┐ ┌──────────────────┐  │
│   │ Bench 135 lbs│ │ Squat 1.5× BW   │  │
│   └──────────────┘ └──────────────────┘  │
│   ┌────────────────────┐ ┌────────────┐  │
│   │ 30 Day Consistency │ │ Deadlift   │  │
│   │                    │ │ 2× BW      │  │
│   └────────────────────┘ └────────────┘  │
│                                          │
│          [ + Create Custom Goal ]        │
│                                          │
└──────────────────────────────────────────┘
```

**Quick-add chip definitions:**

| Chip Label | Goal Type | Exercise/Metric | Target | Notes |
|-----------|-----------|-----------------|--------|-------|
| Bench Plate (135 lbs) | Exercise 1RM | Barbell Bench Press | 135 | Fixed value |
| Squat 1.5× BW | Exercise 1RM | Barbell Squat | `bodyweight × 1.5` | Dynamic, requires bodyweight data |
| Deadlift 2× BW | Exercise 1RM | Barbell Deadlift | `bodyweight × 2.0` | Dynamic |
| 30 Day Consistency | Consistency | — | 30 workouts | Special type: counts workouts, not weight |

**Bodyweight-relative chips:** If no bodyweight data exists, these chips either hide or prompt: "Log your bodyweight first to use this goal."

Tapping a chip instantly creates the goal (skipping the multi-step flow) and transitions to the Active list with the new card visible.

---

## Progress Tracking: Auto-Update Logic

Goals update automatically when workout or measurement data changes. This happens in real-time as new workouts are completed or measurements logged.

### Exercise Goals

| Metric | Current Best Calculation | Source |
|--------|--------------------------|--------|
| Estimated 1RM | `MAX(weight × (1 + reps/30))` across all working sets for that exercise | `workout_sets` JOIN `workout_exercises` |
| Max Volume | `MAX(SUM(weight × reps))` per workout session for that exercise | `workout_sets` grouped by `workout_exercise_id` |
| Max Reps | `MAX(reps)` across all working sets for that exercise | `workout_sets` where `type = 'working'` |

### Measurement Goals

| Metric | Current Best Calculation | Source |
|--------|--------------------------|--------|
| Bodyweight (loss) | `MIN(value)` or latest value | `measurements` where `type = 'bodyweight'` |
| Bodyweight (gain) | `MAX(value)` or latest value | Direction inferred from `starting_value` vs `target_value` |
| Body Fat % | Latest value (or MIN for loss goals) | `measurements` where `type = 'body_fat'` |

### Consistency Goals

| Metric | Current Best Calculation | Source |
|--------|--------------------------|--------|
| Workout count | `COUNT(*)` from workouts since goal creation | `workouts.completed_at >= goal.created_at` |

### Completion Detection

After every workout save (`workoutService.saveWorkout`) and measurement log (`measurementService.logMeasurement`), run:

```typescript
// Pseudocode: check all active goals for completion
// IMPORTANT: avoid mutating goal objects in-place (see conventions.md §5 re: immutability)
const activeGoals = await getActiveGoals();
for (const goal of activeGoals) {
    const currentBest = await computeCurrentBest(goal);
    if (currentBest >= goal.targetValue) {
        await markGoalCompleted(goal.id, currentBest);
        // Trigger celebration UI (confetti, toast, etc.)
    }
}
```

---

## Schema Impact

### New table (via versioned migration)

> **Convention:** Create via a new migration in `migrations.ts`. Never use inline `CREATE TABLE`.

```sql
CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    goal_type TEXT NOT NULL,           -- 'exercise_1rm', 'exercise_volume', 'exercise_reps',
                                      -- 'measurement', 'consistency'
    exercise_id TEXT,                  -- NULL for measurement/consistency goals
    measurement_type_id TEXT,          -- NULL for exercise/consistency goals
    target_value REAL NOT NULL,
    starting_value REAL,              -- Snapshot of current best at creation time
    current_best REAL,                -- Cached, updated on each workout/measurement save
    label TEXT,                       -- Optional custom motivational label
    deadline TEXT,                    -- ISO date string, NULL if open-ended
    status TEXT NOT NULL DEFAULT 'active',   -- 'active', 'completed', 'abandoned'
    completed_at TEXT,                -- Date when target was reached
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

### Indexes

```sql
CREATE INDEX idx_goals_status ON goals(status);
CREATE INDEX idx_goals_exercise_id ON goals(exercise_id);
```

### Typed row interface

Define in `goalService.ts` (not in `hydration.ts` since goals are a new domain):

```typescript
interface GoalRow {
    id: string;
    goal_type: string;
    exercise_id: string | null;
    measurement_type_id: string | null;
    target_value: number;
    starting_value: number | null;
    current_best: number | null;
    label: string | null;
    deadline: string | null;
    status: string;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
}
```

Never use `any` for query results. Map `GoalRow` to a typed `Goal` model.

---

## Component Architecture

```
ProfileScreen
  └─ GoalsScreen (stack navigation push)
       ├─ SegmentedControl (Active | Trophy Case)
       │
       ├─ ActiveGoalsTab
       │    ├─ ErrorBoundary (wraps goal list)
       │    │    └─ GoalCard (per active goal)
       │    │         ├─ ProgressBar (purple gradient fill)
       │    │         ├─ DeadlineBadge (green/amber/red)
       │    │         └─ GoalDetailView (expanded on tap, progress chart)
       │    └─ EmptyState (when no active goals)
       │         └─ QuickAddChips
       │
       ├─ TrophyCaseTab
       │    └─ CompletedGoalCard (per completed goal, gold accent)
       │
       └─ FAB (+) → GoalCreationFlow (multi-step modal)
            ├─ Step1_TypeSelector
            ├─ Step2_ExerciseOrMetricPicker
            ├─ Step3_TargetValueInput
            ├─ Step4_DeadlinePicker
            ├─ Step5_LabelInput
            └─ ConfirmationCard
```

### Hooks (convention: extract when 3+ useState for one concern)
- `useGoalProgress()` — manages goal list state, refresh logic, progress computation
- `useGoalCreation()` — manages multi-step creation wizard state
- `useDeadlineWarnings()` — computes which goals are off-track

---

## Service Layer

New service file: `src/services/goalService.ts`

**CRUD functions:**
- `createGoal(params)` → inserts goal with snapshot of current best as `starting_value`
- `getActiveGoals()` → returns active goals sorted by deadline
- `getCompletedGoals()` → returns completed goals sorted by `completed_at` DESC
- `updateGoal(goalId, updates)` → edits target, deadline, label
- `deleteGoal(goalId)` → removes goal
- `markGoalCompleted(goalId, finalValue)` → sets `status = 'completed'`, `completed_at = NOW()`
- `abandonGoal(goalId)` → sets `status = 'abandoned'`

**Progress functions:**
- `computeCurrentBest(goal)` → dispatches to the correct query based on `goal_type`
- `refreshAllGoalProgress()` → batch-updates `current_best` for all active goals (called after workout save)
- `getGoalProgressHistory(goalId, dateRange?)` → time-series of progress values for the detail chart
- `checkDeadlineWarnings()` → returns goals that are projected to miss their deadline

**Data layer conventions:**
- Use typed `GoalRow` interface for all query results. Never use `any`.
- Reuse `mapSetRow` from `hydration.ts` when computing exercise-based progress from raw set data.

**Quick-add functions:**
- `getQuickAddSuggestions()` → returns available quick-add chips, resolving bodyweight-relative targets dynamically

---

## Cross-Feature Dependencies

- **Analytics feature:** `computeCurrentBest` for exercise goals reuses the same 1RM/volume/reps queries from `analyticsService`
- **Measurements feature:** Bodyweight-relative goal targets require data from `measurements` table; measurement goals track progress from the same table
- **Calendar feature:** Goal completion dates could be shown as badges on the calendar heatmap
- **Widget system:** Active goal progress is a natural home screen widget (mini progress bar)
- **Workout save hook:** `refreshAllGoalProgress()` must be called after `workoutService.saveWorkout()` and `measurementService.logMeasurement()`
