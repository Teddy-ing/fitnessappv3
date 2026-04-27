---
description: Product requirements document for the Widget System — modular, customizable profile dashboard cards
---

# Widget System PRD

## Overview

The Widget System lets users customize their Profile screen with at-a-glance data cards. Widgets surface key metrics — streaks, goals, body trends, exercise PRs — so users feel the pull of progress every time they open the app.

**Design philosophy:** This is the **solo-celebration layer**. No social features, no leaderboards. Just the user's own data, beautifully rendered, reminding them how far they've come.

---

## Placement & Layout

### Where Widgets Live

Widgets appear on the **Profile Screen**, between the profile header and the "Your Data" navigation section.

- A subtle `+ Add Widget` button (or pencil/edit icon) sits **right-aligned** with the "Widgets" section header.
- Tapping it opens a widget picker/editor where users can add, remove, and reorder widgets.

### Below the Widgets: Dashboard Grid

The "Your Data" section (Statistics, Calendar, Measurements, Goals) should be converted from a vertical list into a **2×2 grid of large, tappable cards**. Personal Records is omitted until that screen is implemented. This kills the "scrolly list" vibe and makes the Profile feel like a modern dashboard hub.

> [!NOTE]
> Settings is accessed via a **gear icon in the top-right** of the profile header (matching the workout screen gear icon). Both icons navigate to the same Settings screen.

---

## The Modular Grid System

Widgets use a **modular grid** inspired by iOS/Android home screen widgets. Two sizes:

### Square Widgets (1×1) — 50% screen width

Sit side-by-side, two per row. Perfect for single-metric data or circular graphics.

| Widget | Content |
|--------|---------|
| **Active Goal Progress** | Circular ring (e.g., "87% → Bench 225") |
| **Muscle Balance Pie** | Mini donut chart of volume by muscle group |
| **Weekly Wrap-Up** | Mini 2×2 grid: Volume, Sets, Reps, Time |
| **Streak Badge** | Active week streak with 🔥 icon |

### Rectangle Widgets (2×1) — 100% screen width

Full-width cards. **Mandatory for time-series data** — line graphs inside a tiny square look cramped and illegible.

| Widget | Content |
|--------|---------|
| **Pinned Exercise 1RM / Volume** | Wide purple line graph tracking a specific lift over time |
| **Bodyweight Sparkline** | Wide line graph showing 30-day weight trend |

### Grid Behavior

The layout uses **flexbox / grid**:

- Two squares → sit side-by-side in one row
- One rectangle → drops to next row, takes full width
- One square + nothing → left-aligned, half-width (no stretching)
- Mixed order preserved: if user pins [Square, Rectangle, Square, Square], the result is Row 1: [Square], Row 2: [Rectangle], Row 3: [Square, Square]

> [!IMPORTANT]  
> The grid must be **un-breakable by design** — any combination of squares and rectangles must result in a clean layout with no gaps.

---

## Widget Catalog

### 1. Active Goal Progress (Square)

- **Data source:** `goalService.getActiveGoals()` → top goal by deadline proximity
- **Visual:** Circular progress ring with percentage, goal label, and target value
- **Example:** Ring at 87%, label "Bench 225 lbs"
- **Tap action:** Navigate to Goals screen
- **Why mandatory:** Seeing progress toward a concrete goal every day is massive psychological motivation

### 2. Weekly Wrap-Up (Square)

- **Data source:** `analyticsService.getAggregatedMetric()` for volume, sets, reps, duration — filtered to current ISO week
- **Visual:** Clean 2×2 grid inside the card
  - Top-left: Volume (e.g., "42,350 lbs")
  - Top-right: Sets (e.g., "87")
  - Bottom-left: Reps (e.g., "612")
  - Bottom-right: Time (e.g., "4.2 hrs")
- **Tap action:** Navigate to Analytics screen
- **Consolidates:** Refs #7 (Volume), #8 (Sets), #9 (Reps), #10 (Time) from brainstorm

### 3. Muscle Balance Pie (Square)

- **Data source:** `analyticsService.getMuscleDistribution()` — last 30 days
- **Visual:** Mini donut chart with top 3-4 muscle groups colored, center shows dominant muscle name
- **Tap action:** Navigate to Analytics → Breakdown tab
- **Consolidates:** Refs #33 (Pie) and #35 (Top 3 Muscles) from brainstorm
- **Why:** Colorful, engaging, instantly answers "Am I skipping leg day?"

### 4. Streak Badge (Square)

- **Data source:** `calendarService.getWorkoutStreak()`
- **Visual:** Flame icon 🔥 with streak number and "week streak" label. Subtle glow/pulse animation when streak is active.
- **Tap action:** Navigate to Calendar screen
- **Example:** "🔥 8 week streak"
- **Why:** Gamified consistency — simple, powerful retention driver

### 5. Pinned Exercise Chart (Rectangle)

- **Data source:** `analyticsService.getEstimated1RM(exerciseId)` or `getExerciseVolume(exerciseId)` — user-selected exercise and metric
- **Visual:** Wide line graph (purple accent), Y-axis showing weight/volume, subtle X-axis date labels. Exercise name as card title.
- **Config:** User picks: (a) which exercise, (b) 1RM or Volume
- **Tap action:** Navigate to Exercise Analytics screen for that exercise
- **Example:** "Squat — Est. 1RM" with ascending line graph
- **Why:** This is the killer feature from Strong. Letting a powerlifter pin their Squat 1RM chart is the ultimate power-user flex.

### 6. Bodyweight Sparkline (Rectangle)

- **Data source:** `measurementService.getSparklineData('bodyweight', 30)`
- **Visual:** Wide line graph showing 30-day trend, current value displayed prominently, delta from start shown as +/- badge
- **Tap action:** Navigate to Measurements → Trends tab
- **Example:** "182.4 lbs" with a gently descending sparkline, badge "−2.1 lbs"
- **Why:** Users obsess over this metric. A simple, elegant trend line is highly valuable.

### 7. Workload / Readiness (Square or Rectangle — TBD)

- **Data source:** `analyticsService.getFatigueRatio()` + compare this-week vs last-week volume
- **Visual:** A banner showing workload status with color coding:
  - 🟢 "Light" (ratio < 0.8)
  - 🟡 "Normal" (0.8–1.3)
  - 🔴 "High" (ratio > 1.3)
  - Plus a volume trend arrow: "↑ 12% vs last week"
- **Tap action:** Navigate to Analytics screen
- **Consolidates:** Refs #6 (Fatigue Ratio) and #40 (Volume Trend Arrow) from brainstorm

---

## Widget Configuration & Persistence

### User Settings

Widget configuration is stored in user preferences:

```typescript
interface WidgetConfig {
    id: string;           // Unique instance ID (user can have multiples of same type)
    type: WidgetType;     // 'goal_progress' | 'weekly_wrapup' | 'muscle_pie' | etc.
    size: 'square' | 'rectangle';
    // Type-specific config:
    exerciseId?: string;  // For pinned exercise widgets
    metric?: string;      // '1rm' | 'volume' for pinned exercise
}
```

Store as JSON array in `user_settings` (new column via migration), similar to `visible_measurements`.

### Default Widgets (New Users)

New users start with a sensible default set:

1. **Streak Badge** (Square) — top-left
2. **Weekly Wrap-Up** (Square) — top-right
3. **Bodyweight Sparkline** (Rectangle) — full-width below

This provides immediate value with zero configuration.

### Widget Editor

- Accessed via the edit icon in the widgets section header
- Shows the current widget layout with drag handles for reordering
- "Add Widget" button opens a picker with all available widget types, previews, and descriptions
- Maximum widget limit: **6 widgets** (prevents scroll fatigue, keeps the profile tight)
- Swipe-to-delete or tap X to remove individual widgets

---

## Data Sourcing

All widgets read from existing service functions — no new database queries needed for MVP:

| Widget | Service | Function |
|--------|---------|----------|
| Goal Progress | `goalService` | `getActiveGoals()` |
| Weekly Wrap-Up | `analyticsService` | `getAggregatedMetric('volume'|'sets'|'reps'|'duration', 'week')` |
| Muscle Pie | `analyticsService` | `getMuscleDistribution()` |
| Streak | `calendarService` | `getWorkoutStreak()` |
| Pinned Exercise | `analyticsService` | `getEstimated1RM()` / `getExerciseVolume()` |
| Bodyweight | `measurementService` | `getSparklineData('bodyweight', 30)` |
| Workload | `analyticsService` | `getFatigueRatio()` + `getAggregatedMetric('volume', 'week')` |

> [!TIP]
> Widget data should be fetched once on profile mount and cached in component state with pull-to-refresh. No polling. No background fetching. Respect the "speed over everything" principle.

---

## Implementation Phases

### Phase 3A — Widget Framework + MVP Widgets

1. **Widget data model** — `WidgetConfig` type in `src/models/widget.ts`, migration for `widget_config` column in `user_settings`
2. **Widget grid layout** — `WidgetGrid` component that renders squares and rectangles from config array
3. **MVP widgets** (static data, no interactivity):
   - Streak Badge (Square)
   - Weekly Wrap-Up (Square)
   - Bodyweight Sparkline (Rectangle)
4. **Widget editor** — basic add/remove/reorder

### Phase 3B — Advanced Widgets

5. **Remaining widgets:**
   - Active Goal Progress (Square)
   - Muscle Balance Pie (Square)
   - Pinned Exercise Chart (Rectangle)
   - Workload / Readiness (Square or Rectangle)
6. **Exercise picker** for pinned exercise widget config
7. **Navigation on tap** — each widget navigates to its relevant detail screen

### Phase 3C — Profile Dashboard Grid

8. Convert "Your Data" list into a **2×2 tappable card grid** (Statistics, Calendar, Measurements, Goals)

---

## Design Constraints

- Widgets must render in < 100ms (no blocking queries on the main thread)
- Widget cards follow the existing design language: `colors.background.secondary`, `borderRadius.lg`, `glass.borderLight` border
- Charts inside widgets use the same `react-native-gifted-charts` library as Analytics for visual consistency
- Widget grid must handle 0 widgets gracefully (show the default set or an "Add your first widget" empty state)
- Maximum 600 lines per widget component (guardrail #1)

---

## Out of Scope (Future Phases)

- **OS-level home screen widgets** (Android Glance / iOS WidgetKit) — requires native modules, Phase 7+
- **Live active workout widget** (#38) — live state is too complex for MVP
- **Rest timer widget** (#39) — already has an overlay, no need to duplicate
- **Journal/notes widgets** (#36, #37) — niche, low retention value

---

## Last Updated
- Date: 2026-03-25
- Session Context: Initial PRD creation based on brainstorming session and user design vision
