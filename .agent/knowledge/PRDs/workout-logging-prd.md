---
description: Product Requirements Document for the core workout logging screen redesign — covers removals, visual polish, new features, and phased implementation strategy
---

# Workout Logging Screen Redesign — PRD

> **Goal:** Transform the exercise logging experience from a functional prototype into a premium, high-density interface that rivals Hevy/Strong while staying true to the app's veteran-first, zero-friction philosophy.

---

## 1. Current State

The workout logging screen (`WorkoutScreen.tsx`) uses stacked `ExerciseCard` components, each containing `SetRow` instances. The current implementation provides:

- **Exercise cards** with name, muscle tag, and an `×` remove button
- **Set rows** with SET / WEIGHT / REPS / ✓ columns
- **Set type cycling** via tapping the set number (no visual affordance)
- **Swipe-to-delete** on individual sets
- **Persistent "+" Add Set** text links and superset toggle buttons visible at all times
- **Blocky dark-gray input fields** for weight and reps
- **Color coding:** Orange/yellow active set circles, green "Save" buttons, yellow warmup backgrounds
- **Superset linking:** 🔗 Link/Unlink button at bottom of every card with `canSuperset`
- **Progress bar** at the bottom of each card

### Relevant Files

| File | Lines | Role |
|------|-------|------|
| `WorkoutScreen.tsx` | 521 | Orchestrator — workout lifecycle, keyboard coordination |
| `ExerciseCard.tsx` | 355 | Card layout — header, sets header, set iteration, action row |
| `SetRow.tsx` | 441 | Individual set — inputs, swipe delete, type badge, completion |
| `WorkoutKeyboard.tsx` | ~200 | Custom numeric keyboard with weight/reps modes |
| `ActiveRestLine.tsx` | ~100 | Inline rest timer between sets |
| `stores/workoutStore.ts` | — | Zustand store — active workout state + actions |
| `models/workout.ts` | 235 | Data model — `WorkoutSet`, `WorkoutExercise`, `Workout` |

---

## 2. Removals

Items to **strip out** entirely to reduce visual clutter:

| ID | What | Where | Why |
|----|------|-------|-----|
| R-01 | Fragmented accent colors (orange/yellow active circles, green "Save" buttons) | `SetRow` styles, `ExerciseCard` | Clashing, inconsistent with theme palette |
| R-02 | Persistent pencil/notes icon under each exercise | `ExerciseCard` | Rarely used; moves to `...` menu |
| R-03 | Massive solid dark-gray input rectangles | `SetRow` input styles | Blocky, takes too much space; replace with inline text |
| R-04 | Standalone superset button at bottom of card | `ExerciseCard.tsx:176-182` | Redundant once `...` menu exists |
| R-05 | Progress bar at bottom of each card | `ExerciseCard.tsx:186-200` | Redundant once auto-collapse shows completion state |

---

## 3. UI Changes

### 3.1 Strict Table Layout

Compress the current padded rows into a tight, spreadsheet-like horizontal layout.

- **Column widths are fixed and compact** — no `flex: 1` weight/reps columns
- **Minimal vertical padding** — rows should feel dense but tappable (40px row height)
- **Separator lines** between rows (1px `colors.separator`)
- **New column order:** `[ Set # ] | [ Previous ] | [ Weight ] | [ Reps ] | [ ✓ ]`

### 3.2 Set Type Interaction (Popover Menu)

**Current:** Tapping the set number silently cycles through types. No visual affordance.

**New:**
- Set number renders as a subtle pill/button (rounded, slight background tint)
- Tapping opens a **clean popover** anchored to the pill with options:
  - `[ Normal ]` `[ Warmup ]` `[ Dropset ]` `[ Failure ]`
- Selected type updates the badge styling on the set number

### 3.3 Warmup Styling

**Current:** Yellow background, yellow text — competes for attention.

**New:** Warmups are low-priority data.
- Muted flat gray background badge on the set number
- Slightly dimmed text (70% opacity)
- No bright colors — warmups should recede visually

### 3.4 Active Set Highlighting (Opacity-Based)

Replace color-based highlighting with an opacity and typography system:

| State | Styling |
|-------|---------|
| **Completed sets** | Entire row dimmed to **50% opacity** |
| **Active set** (first uncompleted) | Pure bright white text, faintly pulsing purple checkbox |
| **Future sets** | Standard text (default opacity) |

The "pulsing" effect is a subtle `Animated.loop` scale/opacity oscillation on the checkbox — period ~2s, range 0.8–1.0 opacity.

### 3.5 Deletion UX (Onboarding Hint)

**Keep:** Swipe-left-to-delete gesture on set rows.

**Add:** A one-time onboarding animation:
- On the **first workout ever opened**, the first set row subtly slides 40px left (revealing the red trash icon), holds for 800ms, then snaps back
- Guard with a `hasSeenSwipeHint` key in `AsyncStorage`
- Animation uses `Animated.sequence` with `spring` for the snap-back

---

## 4. New Features

### 4.1 "Previous" Column ⭐ (High Priority)

Insert a dedicated column showing what was lifted **last session** for the same exercise.

**Table row becomes:** `[ Set # ] | [ Previous ] | [ lbs ] | [ reps ] | [ ✓ ]`

- **Data source:** Query the most recent completed workout containing this `exerciseId`, pull matching sets by `orderIndex`
- **Display format:** `135×8` (weight × reps) in `colors.text.disabled` (muted)
- **Edge cases:**
  - No prior data → show `—`
  - Different number of sets → match by index, show `—` for extras
  - Exercise was never performed → show `—` for all rows
- **Performance:** Fetch previous data once when the exercise is added, cache in the workout store or a local `Map<exerciseId, PreviousSetData[]>`

### 4.2 Ellipsis (`...`) Menu

Place a discrete `⋯` icon at the **top-right of every exercise card header** (replaces the current `×` button).

**Menu items:**
| Action | Icon | Notes |
|--------|------|-------|
| Add Note | 📝 | Opens inline text input under exercise title |
| Add Set | ＋ | Replaces the removed persistent button |
| Add Warm-up Sets | 🔥 | Adds N warmup sets (configurable, default 2) |
| Replace Exercise | 🔄 | Opens ExercisePicker, swaps exercise keeping set structure |
| Create Superset | 🔗 | Links with the next exercise below |
| Remove Exercise | 🗑️ | With confirmation alert |

**Implementation:** Use a `PopoverMenu` component (or Android/iOS native `ActionSheet` via `Alert.alert` for v1, upgrade to a custom popover later).

### 4.3 Auto-Collapsing Cards

When the user checks off the **final set** of an exercise, the card automatically collapses.

**Collapsed state:** A single sleek row: `[ ✓ ] Barbell Bench Press (4 Sets)`
- Tapping anywhere on the collapsed row **expands** it back
- The collapse uses `LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)` for smooth transition
- Collapsed state is stored **in the workout store** per exercise (`isCollapsed: boolean`)
- Manual collapse/expand (without completing all sets) is NOT supported — it's automatic

### 4.4 Visual Superset Linking

When two exercises are supersetted via the `...` menu:

**Visual treatment:**
- Both exercise cards are housed inside a **single overarching container** with a shared background
- A distinct **vertical colored line** (3px, `colors.accent.primary`) runs down the **left margin**, connecting Exercise A and Exercise B
- A small `SUPERSET` label badge at the top of the container
- The existing `borderBottomColor: colors.accent.primary` approach is replaced with this bracket/line approach

### 4.5 Multi-Level Notes

#### 4.5.1 Workout-Level Notes
- Add a `📝` icon button to the **global workout header** (next to the timer/finish button)
- Tapping opens a **collapsible text input area** at the top of the workout, above the first exercise card
- Stored in `Workout.note` (field already exists in the model)

#### 4.5.2 Exercise-Level Notes
- Added via the `...` menu → "Add Note"
- Once saved, the note displays as **small, italicized text** directly under the exercise title, above the data table
- Styled: `fontSize: typography.size.xs`, `color: colors.text.secondary`, `fontStyle: 'italic'`
- Stored in `WorkoutExercise.note` (field already exists in the model)

### 4.6 Conditional QOL Columns (Settings-Dependent)

#### 4.6.1 RPE Tracking
- Gated behind a **settings toggle** (e.g., `settings.showRpeColumn`)
- When enabled, injects a tight `[ RPE ]` column **right before the checkbox**
- New column order: `[ Set # ] | [ Previous ] | [ lbs ] | [ reps ] | [ RPE ] | [ ✓ ]`
- RPE input: Tap to open a quick-select wheel/popover (6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10)
- Data already exists: `WorkoutSet.rpe` field is in the model

> **Note:** RPE can be addressed last in the implementation phases. It should still be considered during layout design to ensure column widths accommodate it.

#### 4.6.2 Plate Calculator
- **NOT on the main screen** — lives in the numeric keyboard
- Add a small plate calculator icon to the **top accessory bar of `WorkoutKeyboard`** when the user is inputting weight
- Tapping opens a modal/popover showing the plate breakdown for the entered weight
- Assumes standard Olympic barbell (45 lbs / 20 kg) — configurable in settings later

---

## 5. Phased Implementation Strategy

### Phase 1: Table Layout + Visual Cleanup _(Foundation)_
1. Strip removals R-01 through R-06
2. Implement strict table layout with new column widths
3. Implement opacity-based active set highlighting
4. Restyle warmup sets (muted gray)
5. Add "Previous" column (requires service query)

### Phase 2: Interactions + Menu _(Core UX)_
1. Build the `...` ellipsis menu (popover or action sheet)
2. Migrate "Add Set", "Add Note", "Remove Exercise", "Replace Exercise", "Create Superset" into the menu
3. Implement set type popover (replaces silent cycling)
4. Wire up exercise-level notes display

### Phase 3: Collapse + Superset Visuals _(Polish)_
1. Implement auto-collapsing cards on final set completion
2. Build visual superset bracketing (vertical line, shared container)
3. Add workout-level notes icon to header
4. Implement swipe-hint onboarding animation

### Phase 4: Settings-Gated Features _(Last)_
1. RPE column (settings toggle + UI + data flow)
2. Plate calculator in keyboard accessory bar
3. Final QA pass

---

## 6. Data Model Impact

### Existing fields that already support these features:
- `WorkoutSet.rpe` — RPE tracking ✅
- `WorkoutExercise.note` — Exercise-level notes ✅
- `Workout.note` — Workout-level notes ✅
- `WorkoutExercise.supersetGroupId` — Superset grouping ✅

### New fields/state needed:
| Field | Location | Purpose |
|-------|----------|---------|
| `isCollapsed` | Workout store (per exercise, runtime only) | Auto-collapse state |
| `previousSets` | Workout store or local cache | Last session's set data per exercise |
| `hasSeenSwipeHint` | AsyncStorage | One-time onboarding guard |
| `settings.showRpeColumn` | User settings / preferences | RPE column toggle |
| `settings.barbellWeight` | User settings / preferences | Plate calculator base weight |

### No DB migration needed — collapse state and previous-set data are runtime-only.

---

## 7. Design Constraints

1. **Set logging must remain < 3 seconds** (app-vision principle #1)
2. **No modals blocking input flow** — popovers and inline UI only
3. **Previous column must not slow down workout start** — fetch asynchronously, show `—` as placeholder
4. **RPE column must not widen the table on standard phones** — all columns must fit within 375px viewport
5. **Auto-collapse must be reversible** — one tap to expand back
6. **All changes must respect the existing performance optimizations** (React.memo on SetRow/ExerciseCard, fine-grained Zustand selectors)

---

## 8. Success Criteria

- [ ] Exercise card fits 5-column table on a 375px-wide phone without horizontal scroll
- [ ] All removed elements are gone (R-01 through R-06)
- [ ] Previous column shows accurate last-session data, `—` for no history
- [ ] `...` menu provides all migrated actions (6 items)
- [ ] Completed exercise auto-collapses to single row
- [ ] Superset visual linking uses left-margin bracket/line
- [ ] Warmups appear muted, not attention-grabbing
- [ ] Active set is visually distinguishable via opacity, not color
- [ ] TypeScript compiles clean, no performance regressions

---

## Last Updated
- Date: 2026-03-29
- Session Context: Initial PRD creation from user requirements for workout logging screen redesign
