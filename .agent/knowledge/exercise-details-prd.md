---
description: Product requirements document for the Exercise Details screen — a comprehensive per-exercise reference guide with form cues, history timeline, analytics charts, and personal records
---

# Exercise Details PRD ("Master Guide")

## Overview

The Exercise Details screen is a comprehensive, per-exercise reference that consolidates everything the user needs to know about a single exercise into one place. It replaces the current `ExerciseAnalyticsScreen` as the canonical "drill into an exercise" destination, adding form guidance, session history, persistent personal notes, and a cleaner records table alongside the existing charts.

**Design philosophy:** This is the **exercise mastery layer**. A veteran lifter can check their 1RM trend mid-set. A beginner can read instructions and review cues before attempting a lift. One screen, four tabs, zero friction to get there.

---

## Screen Architecture

### Top-Level Layout

```
┌──────────────────────────────────────┐
│ ← [Exercise Name]                    │   ← Stack header (react-navigation)
├──────────────────────────────────────┤
│  [ About ] [ History ] [ Charts ] [ Records ]  │   ← Tab bar (local)
├──────────────────────────────────────┤
│                                      │
│           Tab Content Area           │
│                                      │
└──────────────────────────────────────┘
```

- **Navigation header:** Standard `NativeStackNavigator` header from the Profile stack. Title = exercise name. Back arrow returns to previous screen.
- **Tab bar:** A horizontal pill-style `TabControl` identical to the one used in `AnalyticsScreen.tsx` (visual consistency). Four tabs: `About`, `History`, `Charts`, `Records`.
- **Default tab:** `Charts` — this matches what power users already expect when they tap into an exercise from Analytics. First-time users who arrive via the info icon during a workout will naturally swipe to `About`.

### Tab 1: About (The Form Guide)

> **Purpose:** Teach the user how to perform the exercise. Provide a persistent notepad for personal cues.

**Content (top to bottom):**

1. **Exercise Icon / Image Placeholder**
   - A centered, rounded container (96×96) with a `MaterialIcons` icon matching the exercise category (e.g., `fitness-center` for strength, `directions-run` for cardio, `self-improvement` for stretch).
   - This is explicitly a **placeholder** for future exercise illustration assets. No image generation needed now.

2. **Exercise Metadata Row**
   - Primary muscle group pill (e.g., "Chest") + equipment pill(s) (e.g., "Barbell", "Bench")
   - Styled as small, muted tag pills — similar to the `muscleTag` in `ExerciseCard`.

3. **Instructions List**
   - Numbered step-by-step instructions rendered from `exercise.instructions: string[]`.
   - Most exercises will have an **empty array** initially; this is expected and a placeholder `"Instructions coming soon"` message should be shown.
   - Long-term, instructions will be populated as a separate content task (not part of this feature's scope).

4. **Exercise Notes (Persistent)**
   - A `TextInput` card with the label "Your Notes" and placeholder "Add personal cues…"
   - Content is **persistent across sessions** — stored in the database, not tied to any single workout.
   - Examples: "Keep elbows tucked", "Pause at bottom", "Use suicide grip".
   - This is a new data field — see [Data Model Changes](#data-model-changes).

> [!NOTE]
> The existing `WorkoutExercise.note` field is per-workout-instance (ephemeral). The new Exercise Notes field is **per-exercise-definition** (permanent). They serve different purposes and must not be conflated.

### Tab 2: History (The Timeline)

> **Purpose:** Show every past session where this exercise was performed, in reverse chronological order.

**Content:**

- A `FlatList` of history cards, one per workout session containing this exercise.
- Each card shows:
  - **Date** — e.g., "Apr 8, 2026" (left-aligned, bold)
  - **Workout name** — e.g., "Push Day" (right-aligned, muted, truncated)
  - **Sets detail** — Each set rendered as a compact row: `1. 135 × 8`, `2. 185 × 6`, etc. (set number, weight × reps). Warmup sets shown in muted text with a "W" prefix.
  - **Session Volume** — Total `weight × reps` for this exercise in that workout, displayed as a summary line at the bottom of each card (e.g., "Volume: 5,240 lbs")

- **Empty state:** "No history for this exercise yet. Start a workout to track your progress!"

**Data source:** New query `getExerciseSessionHistory(exerciseId)` in `exerciseAnalyticsService.ts`. Joins `workout_exercises` → `workout_sets` → `workouts`, grouped by workout ID, ordered by `completed_at DESC`.

### Tab 3: Charts (The Micro-Analytics)

> **Purpose:** Visualize progression over time. This is the existing `ExerciseAnalyticsScreen` content, relocated into a tab.

**Content (vertically stacked, scrollable):**

1. **Range Pills** — `1M | 3M | 6M | 1Y | ALL` (shared across all charts)
2. **Estimated 1RM** — Line chart (purple, `colors.accent.primary`)
3. **Max Weight** — Line chart (blue, `#3b82f6`)
4. **Session Volume** — Bar chart (purple gradient)

> [!IMPORTANT]
> The existing `Max Reps` line chart and `Best Weight for Reps` table currently live on this screen too. Per the user's spec, the **charts tab should only contain the three charts listed above**. The rep-max data moves to the new **Records** tab (Tab 4). Max Reps chart is cut — it's redundant with the Records table, which provides the same data in a more actionable format.

**Reuse:** The existing `useExerciseAnalytics` hook and the chart sub-components (`TimeSeriesLineChart`, `VolumeBarChart`, `RangePills`) from `ExerciseAnalyticsScreen.tsx` should be extracted and reused directly within this tab's content.

### Tab 4: Records (The Spreadsheet Replacement)

> **Purpose:** Show the user's best real-world performance at each rep count, alongside the calculated estimated 1RM.

**Content:**

- A table with columns: **Reps** | **Best Weight** | **Est. 1RM** | **Date**
- Rows for 1RM through 12RM (or up to 15RM — wherever the user has data).
- Each row shows:
  - `Reps` — The rep count (1, 2, 3, … 12)
  - `Best Weight` — The heaviest weight the user has *actually lifted* for that exact rep count (from `getBestWeightForReps()`)
  - `Est. 1RM` — The Epley-calculated 1RM from that weight × reps (i.e., `weight × (1 + reps/30)`)
  - `Date` — When this PR was set

- **Highlight:** The row with the highest estimated 1RM should be visually highlighted (e.g., purple accent border or subtle background) to show the user which rep range gives their best calculated max.

- **Empty state:** "No records yet. Complete a workout with this exercise to see your records."

**Data source:** Existing `getBestWeightForReps()` from `exerciseAnalyticsService.ts`. The Est. 1RM column is computed client-side from the returned weight/reps data.

---

## Navigation Routing

### Constraint: Profile Screen Grid MUST NOT Change

> [!CAUTION]
> Do **NOT** add an "Exercises" button or any new entry point to the Profile Screen's 2×2 dashboard grid (`Statistics`, `Calendar`, `Measurements`, `Goals`). The existing hierarchical flow must remain: **Profile → Statistics → Analytics Hub → Exercises tab → Exercise Details**.

### Path A: From the Analytics Hub

**Current flow:** `Analytics > Exercises tab > tap row` → navigates to `ExerciseAnalyticsScreen`

**New flow:** `Analytics > Exercises tab > tap row` → navigates to `ExerciseDetails` (the new Master Guide screen, defaulting to the Charts tab for continuity)

**Implementation:**
- Register a new `ExerciseDetails` route in `ProfileStackParamList` (replacing or aliasing `ExerciseAnalytics`)
- Update `ExerciseListView.tsx` `onPress` to navigate to `ExerciseDetails` instead of `ExerciseAnalytics`
- The new route params: `{ exerciseId: string; exerciseName: string; initialTab?: 'about' | 'history' | 'charts' | 'records' }`
- Default `initialTab` = `'charts'` when coming from Analytics (preserves existing UX)

### Path B: From Active Workout (Info Icon)

**New behavior:** Each exercise card in the active workout view gets a small info icon next to the exercise name. Tapping it opens the Exercise Details screen.

**Implementation:**
- Add a small `MaterialIcons` icon (`info-outline` or `lightbulb-outline`, 18dp) to the right of the exercise name in the `ExerciseCard` header.
- Tapping this icon navigates to the Exercise Details screen. Since the workout screen lives in the `Workout` tab (not the `Profile` stack), this should use `navigationRef` to do a cross-stack push:
  ```
  navigationRef.navigate('Profile', {
    screen: 'ExerciseDetails',
    params: { exerciseId, exerciseName, initialTab: 'about' },
    initial: false
  })
  ```
- `initialTab: 'about'` — when accessed from a workout, the user is most likely looking for form guidance.

> [!TIP]
> The `initial: false` param ensures the back button returns to the active workout (the originating tab) rather than ProfileHome. This pattern is already used by the Settings navigation fix (see session log 2026-03-27).

**Visual placement in ExerciseCard header:**

```
┌──────────────────────────────────────┐
│  Bench Press  ⓘ                   ⋯  │
│  chest                                │
└──────────────────────────────────────┘
```

- The ⓘ icon sits between the exercise name and the ⋯ menu button.
- Small, muted (`colors.text.secondary`), not visually heavy — veterans can ignore it, beginners can discover it.
- The icon should NOT appear in collapsed cards (only in the expanded view).

### Path C: Widget Deep-Link (Existing — Update Target)

The **Pinned Exercise Widget** currently deep-links to `ExerciseAnalytics`. Update the `WidgetGrid.getWidgetPressHandler` to navigate to the new `ExerciseDetails` screen instead, with `initialTab: 'charts'`.

---

## Data Model Changes

### New: `exercise_notes` Table

A new database table to store persistent, per-exercise notes:

```sql
CREATE TABLE IF NOT EXISTS exercise_notes (
    exercise_id TEXT PRIMARY KEY,
    note TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

- **exercise_id:** References the exercise definition ID (from seed data or custom exercises).
- **note:** Free-text user content (personal cues, form reminders).
- **updated_at:** Timestamp for display/sorting.

> [!NOTE]
> This is a simple key-value store intentionally. One note per exercise. No versioning needed. `ON CONFLICT REPLACE` handles upserts cleanly.

### Migration

- New versioned migration (v10 or next available) in `migrations.ts`.
- Add `exercise_notes` to `clearAllData()` per Guardrail #11.

### Service Layer

New functions in a dedicated `exerciseDetailsService.ts` (or added to `exerciseService.ts`):

```typescript
/** Get the persistent note for an exercise (null if none) */
getExerciseNote(exerciseId: string): Promise<string | null>

/** Save or update the persistent note for an exercise */
saveExerciseNote(exerciseId: string, note: string): Promise<void>

/** Delete the persistent note for an exercise */
deleteExerciseNote(exerciseId: string): Promise<void>

/** Get full session history for an exercise (for History tab) */
getExerciseSessionHistory(exerciseId: string): Promise<ExerciseSession[]>
```

### New Type: `ExerciseSession`

```typescript
interface ExerciseSessionSet {
    setNumber: number;
    weight: number | null;
    reps: number | null;
    duration: number | null;
    type: SetType;
}

interface ExerciseSession {
    workoutId: string;
    workoutName: string;
    date: string;             // ISO date of completed_at
    sets: ExerciseSessionSet[];
    totalVolume: number;      // SUM(weight × reps) for this exercise in this session
}
```

---

## Data Sourcing Summary

| Tab | Service | Function(s) | New? |
|-----|---------|-------------|------|
| About — Metadata | In-memory | `exercise.muscleGroups`, `exercise.equipment` | No |
| About — Instructions | In-memory | `exercise.instructions` | No (field exists, mostly empty) |
| About — Notes | `exerciseDetailsService` | `getExerciseNote()`, `saveExerciseNote()` | **Yes** |
| History | `exerciseDetailsService` | `getExerciseSessionHistory()` | **Yes** |
| Charts — 1RM | `exerciseAnalyticsService` | `getEstimated1RM()` | No |
| Charts — Max Weight | `exerciseAnalyticsService` | `getMaxWeight()` | No |
| Charts — Volume | `exerciseAnalyticsService` | `getExerciseVolume()` | No |
| Records | `exerciseAnalyticsService` | `getBestWeightForReps()` | No (add Est. 1RM client-side) |

---

## Implementation Phases

### Phase 1: Foundation — Screen Shell + Navigation

1. **New screen file:** `src/screens/ExerciseDetailsScreen.tsx` — Tab bar with 4 tabs, placeholder content in each.
2. **Register route:** Add `ExerciseDetails` to `ProfileStackParamList` in `AppNavigator.tsx`.
3. **Wire Path A:** Update `ExerciseListView.tsx` to navigate to `ExerciseDetails` instead of `ExerciseAnalytics`.
4. **Wire Path B:** Add info icon to `ExerciseCard.tsx` header, navigate via `navigationRef`.
5. **Wire Path C:** Update `WidgetGrid.tsx` pinned exercise deep-link.

### Phase 2: Charts + Records Tabs (Relocate Existing)

6. **Extract chart components** from `ExerciseAnalyticsScreen.tsx` into reusable sub-components under `src/components/exerciseDetails/`.
7. **Charts tab** — Render the three charts (1RM, Max Weight, Volume) with range pills.
8. **Records tab** — Render the rep-max table with the new Est. 1RM column + PR highlight.
9. **Deprecate `ExerciseAnalyticsScreen.tsx`** — Remove the old screen and its route after verifying the new screen works correctly. Keep the route name as an alias during transition if needed.

### Phase 3: History Tab (New Data)

10. **New query:** `getExerciseSessionHistory()` in the service layer.
11. **History tab UI** — FlatList of session cards with set details and volume summary.

### Phase 4: About Tab (New Data + DB Migration)

12. **DB migration:** Create `exercise_notes` table (v10).
13. **Service functions:** `getExerciseNote()`, `saveExerciseNote()`, `deleteExerciseNote()`.
14. **About tab UI** — Icon placeholder, metadata pills, instructions list, persistent notes input.

---

## Design Constraints

- **Tab bar** must use the same visual style as `AnalyticsScreen`'s `TabControl` for consistency.
- **Charts** must use the same `react-native-gifted-charts` components and styling as the existing analytics screens.
- **Info icon** in ExerciseCard must be subtle enough that power users don't feel cluttered, but visible enough that beginners discover it.
- **Exercise Notes `TextInput`** should auto-save on blur (no explicit Save button needed) — mirrors the UX of the workout-level notes.
- **Maximum 600 lines** per component file (Guardrail #1, enforced post-completion).
- **Screen component** will likely need extraction into sub-components for each tab to stay under limit — plan for this from the start by placing tab content components in `src/components/exerciseDetails/`.

---

## Out of Scope (Future)

- **Exercise images/illustrations** — The About tab has a placeholder. Populating real images is a separate content task.
- **Exercise instructions content** — Writing the actual step-by-step instructions for each exercise is a bulk content task, not part of this feature.
- **Exercise video embeds** — `exercise.videoUrl` exists in the model but is not used yet.
- **Social/sharing** — No sharing of exercise stats or records.
- **Per-exercise rest timer defaults** — Will be part of the ML/Personalization phase.

---

## Open Questions

1. **Route naming:** Should we keep `ExerciseAnalytics` as an alias route that redirects to `ExerciseDetails` (charts tab) for backward compat with any deep links or widget handlers? Or clean-break rename?

2. **Info icon choice:** `info-outline` (ⓘ) vs `lightbulb-outline` (💡) — which communicates "form guide" better? Leaning ⓘ since it's more universally understood, but open to your preference.

3. **History tab pagination:** For users with years of data, should the History tab load all sessions at once, or use incremental pagination (load 20 at a time)? Recommending pagination with `onEndReached` for performance.

---

## Last Updated
- Date: 2026-04-10
- Session Context: Initial PRD creation based on user's exercise details feature request
