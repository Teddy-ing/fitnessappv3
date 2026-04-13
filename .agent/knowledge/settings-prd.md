---
description: Product requirements document for the Settings feature — app-wide General settings + expanded WorkoutSettingsMenu
---

# Settings PRD

## Overview

The Settings feature has two distinct surfaces:

1. **Settings Screen** — The full-screen settings page accessed via the gear icon on Profile. This is being expanded from the current barebones Data Management + Dev Tools layout into a comprehensive General settings hub covering units, display preferences, and app-wide configuration. It also houses Support, About, and Data Management sections.

2. **WorkoutSettingsMenu** — The existing bottom-sheet (accessed via the `⋮` icon during an active workout) that currently manages Show Previous, RPE, RIR, Plate Calculator, and Warm-up Sets. This is being **expanded** with additional workout-specific settings: Default Sets Per Exercise, Auto Timer Start, Default Timer Duration, Smart Suggestions (placeholder), and Default Weight Increment.

**Design philosophy:** Settings should be **discoverable but never forced**. Every toggle ships with a sensible default so users never *have* to visit Settings. Workout-specific settings live in the contextual `WorkoutSettingsMenu` where they're needed most — during an active workout. App-wide preferences live in the Settings screen. Think iOS Settings for the screen, and a quick-access control panel for the workout menu.

---

## Current State

### What Exists Today

The `SettingsScreen.tsx` (305 lines) currently has three sections:

1. **Data Management** — Export, Import, Cloud Backup (placeholder)
2. **App** — Support the App (placeholder), About (placeholder)
3. **🛠️ DEV TOOLS** — Clear All Data, Generate Mock Data

### What Exists in `UserSettings`

The `user_settings` table (single-row, `id = 1`) already has several columns that are managed elsewhere but not yet surfaced in the Settings screen:

| Column | Current Default | Currently Managed By |
|--------|----------------|---------------------|
| `weight_unit` | `'lbs'` | Not exposed in UI |
| `distance_unit` | `'mi'` | Not exposed in UI |
| `theme` | `'dark'` | Not exposed in UI |
| `default_rest_time` | `90` | Not exposed in UI |
| `auto_start_rest_timer` | `1` (true) | Not exposed in UI |
| `rest_timer_vibration` | `1` (true) | Not exposed in UI |
| `default_sets_per_exercise` | `3` | Not exposed in UI |
| `calendar_start_day` | `'sunday'` | CalendarScreen header |
| `show_rpe` | `0` (false) | WorkoutSettingsMenu |
| `show_rir` | `0` (false) | WorkoutSettingsMenu |
| `show_plate_calc` | `1` (true) | WorkoutSettingsMenu |
| `default_warmup_sets` | `2` | WorkoutSettingsMenu |
| `show_previous` | `1` (true) | WorkoutSettingsMenu |

Several settings already have database columns — they just need UI rows wired up in the Settings screen. Others will need new columns via a migration.

---

## Screen Architecture

### Top-Level Layout

```
┌──────────────────────────────────────┐
│ ← Settings                           │   ← Stack header (react-navigation)
├──────────────────────────────────────┤
│                                      │
│        ScrollView                    │
│                                      │
│  ┌─ GENERAL ─────────────────────┐   │
│  │ Theme Mode                    │   │
│  │ Weight Unit                   │   │
│  │ Distance Unit                 │   │
│  │ Body Measurement Unit         │   │
│  │ Calendar Start Day            │   │
│  │ Keep Awake During Workout     │   │
│  │ Warm-Up Calculator            │   │
│  │ Show Exercise Media           │   │
│  │ Show Exercise Instructions    │   │
│  └───────────────────────────────┘   │
│                                      │
│  ┌─ DATA MANAGEMENT ─────────────┐   │
│  │ Export Data                    │   │   ← Moved from current position
│  │ Import Data                   │   │
│  │ Cloud Backup                  │   │
│  └───────────────────────────────┘   │
│                                      │
│  ┌─ SUPPORT ─────────────────────┐   │
│  │ Rate App                      │   │
│  │ Support the Dev               │   │
│  │ Send Feedback                 │   │
│  └───────────────────────────────┘   │
│                                      │
│  ┌─ ABOUT ───────────────────────┐   │
│  │ Changelog                     │   │
│  │ Privacy Policy                │   │
│  │ About                         │   │
│  └───────────────────────────────┘   │
│                                      │
│  ┌─ 🛠️ DEV TOOLS ────────────────┐   │   ← Only in __DEV__ mode
│  │ Clear All Data                │   │
│  │ Generate Mock Data            │   │
│  └───────────────────────────────┘   │
│                                      │
│  ┌─ App Version ─────────────────┐   │
│  │       v0.1.0 (build 1)       │   │   ← Footer version badge
│  └───────────────────────────────┘   │
│                                      │
└──────────────────────────────────────┘
```

### Row Interaction Patterns

Settings rows follow four standard patterns. Each row type has a distinct, consistent UI:

| Pattern | Visual | Use Case |
|---------|--------|----------|
| **Toggle** | Switch on right | Binary on/off settings (e.g., Keep Awake) |
| **Selector** | Current value in muted text + chevron | Two or more options, opens an inline picker or action sheet (e.g., Weight Unit: "lbs") |
| **Stepper** | `−` / value / `+` buttons on right | Numeric settings with a small range (e.g., Default Sets: 3) |
| **Navigation** | Chevron on right, no value | Links to external URLs or sub-screens (e.g., Privacy Policy) |

> [!IMPORTANT]
> The selector pattern should use an **inline segmented control** or pill-based toggle for binary choices (e.g., lbs/kg, mi/km, Sun/Mon) to avoid unnecessary modals. For multi-option selectors, use React Native's `Alert.alert` with radio-style buttons to keep the UX lightweight.

---

## Setting Catalog

### Section 1: General

#### 1.1 Theme Mode (Selector — Placeholder)

- **Setting key:** `theme`
- **Options:** `dark` | `light`
- **Default:** `dark`
- **DB column:** `theme TEXT DEFAULT 'dark'` (already exists)
- **Behavior:** Displays a toggle between "Dark" and "Light". Selecting `light` should show an alert: *"Light theme coming soon! We're working on it."* and revert to dark. The toggle should visually reflect `dark` as the only functional option.
- **Why placeholder:** The light theme requires a full color palette audit. Shipping the toggle now lets us wire it up later without touching Settings again.
- **Icon:** `brightness-6` (MaterialIcons)

#### 1.2 Weight Unit (Selector)

- **Setting key:** `weightUnit`
- **Options:** `lbs` | `kg`
- **Default:** `lbs`
- **DB column:** `weight_unit TEXT DEFAULT 'lbs'` (already exists)
- **Behavior:** Inline segmented toggle. Changes the display unit across the entire app — workout logging, analytics charts, records tables, plate calculator, etc. Does **NOT** retroactively convert stored data (weights are always stored in the unit chosen at time of entry).
- **Icon:** `fitness-center`

> [!WARNING]
> Unit conversion is a display-layer concern. The database always stores raw numeric values. When the user switches units, all *future* entries use the new unit. Historical data displays the original unit. This is the standard approach used by Hevy, Strong, and Fitnotes — retroactive conversion is error-prone and out of scope.

#### 1.3 Distance Unit (Selector)

- **Setting key:** `distanceUnit`
- **Options:** `mi` | `km`
- **Default:** `mi`
- **DB column:** `distance_unit TEXT DEFAULT 'mi'` (already exists)
- **Behavior:** Inline segmented toggle. Affects cardio exercise distance display. Same no-retroactive-conversion rule as weight unit.
- **Icon:** `straighten`

#### 1.4 Body Measurement Unit (Selector — New)

- **Setting key:** `measurementUnit`
- **Options:** `in` | `cm`
- **Default:** `in`
- **DB column:** **NEW** — `measurement_unit TEXT DEFAULT 'in'` (requires migration)
- **Behavior:** Inline segmented toggle. Controls which unit label displays in the Measurements screen for body metrics (waist, chest, bicep, etc.). Bodyweight follows `weightUnit`, not this setting. Body fat % is unitless and unaffected.
- **Icon:** `square-foot`

#### 1.5 Calendar Start Day (Selector)

- **Setting key:** `calendarStartDay`
- **Options:** `sunday` | `monday`
- **Default:** `sunday`
- **DB column:** `calendar_start_day TEXT DEFAULT 'sunday'` (already exists)
- **Behavior:** Inline segmented toggle. Controls whether the calendar grid and weekly tracker start on Sunday or Monday. This setting is currently duplicated as a segmented control in the `CalendarScreen` header — the Calendar header control should be **removed** in favor of this single canonical location in Settings.
- **Icon:** `calendar-today`

> [!TIP]
> Removing the calendar header control declutters the Calendar screen and establishes Settings as the single source of truth for user preferences. The CalendarScreen already reads this value from `getSettings()`, so no additional wiring is needed — just remove the inline toggle.

#### 1.6 Keep Awake During Workout (Toggle — New)

- **Setting key:** `keepAwakeDuringWorkout`
- **Options:** `true` | `false`
- **Default:** `true`
- **DB column:** **NEW** — `keep_awake INTEGER DEFAULT 1` (requires migration)
- **Behavior:** When enabled, activates `expo-keep-awake`'s `useKeepAwake()` hook while a workout is active. Prevents the screen from auto-locking during rest periods. De-activates when the workout is saved/discarded.
- **Dependency:** `expo-keep-awake` (needs to be installed)
- **Icon:** `phone-android`

#### 1.7 Warm-Up Calculator (Navigation — Placeholder)

- **Setting key:** N/A (placeholder, no DB column needed yet)
- **Behavior:** Displays a row with subtitle text *"Advanced warm-up weight calculator"* and a `chevron-right` icon. Tapping shows an alert: *"Warm-up calculator coming in a future update! This will help you calculate optimal warm-up weights based on your working weight."*
- **Why placeholder:** The warm-up calculator is a stretch goal that requires significant UX design (percentage-based ramps, user-defined steps, plate rounding). Reserving the slot now establishes intent.
- **Icon:** `local-fire-department`

#### 1.8 Show Exercise Media (Toggle — New)

- **Setting key:** `showExerciseMedia`
- **Options:** `true` | `false`
- **Default:** `true`
- **DB column:** **NEW** — `show_exercise_media INTEGER DEFAULT 1` (requires migration)
- **Behavior:** When disabled, hides exercise category icons/images from the **ExercisePicker** (the add-exercise list). Does **NOT** affect the exercise logging cards (`ExerciseCard.tsx`) — those remain unchanged. Useful for users who want a cleaner, more compact exercise selector. Only affects `ExercisePicker.tsx`.
- **Subtitle:** "Show icons in exercise list"
- **Icon:** `image`

> [!NOTE]
> This setting only controls visibility of icons in the ExercisePicker / add-exercise screen. The workout logging cards (`ExerciseCard`) are unaffected — their layout is already optimized for the active workout flow.

#### 1.9 Show Exercise Instructions (Toggle — New)

- **Setting key:** `showExerciseInstructions`
- **Options:** `true` | `false`
- **Default:** `true`
- **DB column:** **NEW** — `show_exercise_instructions INTEGER DEFAULT 1` (requires migration)
- **Behavior:** When disabled, hides the instructions section on the Exercise Details screen's About tab. Useful for experienced users who don't need form reminders. The instructions content is still mostly placeholder ("Coming soon") — this setting future-proofs the visibility toggle for when instructions are populated.
- **Subtitle:** "Show form instructions on exercise details"
- **Icon:** `description`

---

### Section 2: Workout Settings (WorkoutSettingsMenu Expansion)

Workout settings do **NOT** live on the Settings screen. They live in the **WorkoutSettingsMenu** — the existing bottom-sheet accessed via the `⋮` icon in the active workout header. This keeps workout-specific configuration contextual and zero-friction: users change behavior mid-session without leaving the workout flow.

#### Current WorkoutSettingsMenu Content (unchanged)

These settings already exist and remain as-is:

| Setting | Row Type | Description |
|---------|----------|-------------|
| Add Workout Note | Action row | Opens inline note TextInput |
| Show Previous | Toggle (max-2 column) | Display last workout's data |
| Track RPE | Toggle (max-2 column) | Rate of Perceived Exertion column |
| Track RIR | Toggle (max-2 column) | Reps in Reserve column |
| Plate Calculator | Toggle | Show 🏋️ icon in keyboard |
| Warm-up Sets | Stepper (1–5) | Default warm-up sets added per exercise |

#### New WorkoutSettingsMenu Settings

The following settings are **added** to the WorkoutSettingsMenu, placed in a new **DEFAULTS** section below the existing TOOLS section:

##### 2.1 Default Sets Per Exercise (Stepper)

- **Setting key:** `defaultSetsPerExercise`
- **Options:** `1–10` (stepper)
- **Default:** `3`
- **DB column:** `default_sets_per_exercise INTEGER DEFAULT 3` (already exists)
- **Behavior:** Controls how many working sets are added when a new exercise is inserted into a workout. Uses the same stepper UI pattern as Warm-up Sets.
- **Sub-label:** "Working sets per new exercise"

##### 2.2 Default Weight Increment (Stepper — New)

- **Setting key:** `defaultWeightIncrement`
- **Options:** `0.5–25` in 0.5-step increments (stepper)
- **Default:** `5`
- **DB column:** **NEW** — `default_weight_increment REAL DEFAULT 5` (requires migration)
- **Behavior:** Controls the step size when using the `+`/`−` buttons on the weight input in the custom `WorkoutKeyboard`. Currently hardcoded to 5. This setting makes it configurable for lifters who prefer 2.5 lb jumps, 1 kg jumps, or fractional plate increments.
- **Sub-label:** "Weight +/− button step size"

> [!TIP]
> This is especially valuable for users in kg mode (where 2.5 kg is a common increment) and for advanced lifters who use fractional plates (0.5 lb / 0.25 kg). The stepper displays the value with the current weight unit suffix (e.g., "5 lbs" or "2.5 kg").

##### 2.3 Remember Last Weight (Toggle)

- **Setting key:** `showPrevious`
- **Behavior:** This toggle **already exists** in the VISUAL COLUMNS section. No change needed — listed here for completeness of the workout settings catalog.

##### 2.4 Smart Suggestions (Toggle — Placeholder)

- **Setting key:** `smartSuggestions`
- **Options:** `true` | `false`
- **Default:** `false`
- **DB column:** **NEW** — `smart_suggestions INTEGER DEFAULT 0` (requires migration)
- **Behavior:** Placeholder for the on-device ML prediction system (Phase 7 roadmap). The toggle is **disabled (greyed out)** with a subtitle indicating it's coming soon. Tapping shows an alert: *"Smart suggestions are coming in a future update! This feature will use on-device ML to predict your next weight and rep targets based on your training history."*
- **Sub-label:** "AI-powered predictions (coming soon)"

> [!NOTE]
> This placeholder signals intent without cluttering the menu. The disabled toggle with "coming soon" sub-label is low-profile but sets user expectations.

##### 2.5 Automatic Timer Start (Toggle)

- **Setting key:** `autoStartRestTimer`
- **Options:** `true` | `false`
- **Default:** `true`
- **DB column:** `auto_start_rest_timer INTEGER DEFAULT 1` (already exists)
- **Behavior:** When enabled, the rest timer automatically starts when a set is completed. When disabled, users must manually start the timer.
- **Sub-label:** "Start timer on set completion"

##### 2.6 Default Timer Duration (Stepper)

- **Setting key:** `defaultRestTime`
- **Options:** `30–300` seconds, in 15-second increments
- **Default:** `90` seconds
- **DB column:** `default_rest_time INTEGER DEFAULT 90` (already exists)
- **Behavior:** A stepper that displays the current value formatted as `M:SS` (e.g., "1:30"). Step buttons adjust by 15 seconds. Min 30s, max 5:00.
- **Sub-label:** "Rest period between sets"

#### Revised WorkoutSettingsMenu Layout

```
┌──────────────────────────────────────┐
│         Workout Settings             │
├──────────────────────────────────────┤
│ Add Workout Note                 📝 │
├──────────────────────────────────────┤
│ VISUAL COLUMNS (MAX 2)               │
│ Show Previous           [  toggle  ] │
│ Track RPE               [  toggle  ] │
│ Track RIR               [  toggle  ] │
├──────────────────────────────────────┤
│ TOOLS                                │
│ Plate Calculator        [  toggle  ] │
│ Warm-up Sets            [ − 2 + ]   │
├──────────────────────────────────────┤
│ DEFAULTS                             │    ← NEW SECTION
│ Default Sets            [ − 3 + ]   │
│ Weight Increment        [ − 5 + ]   │
│ Auto Timer Start        [  toggle  ] │
│ Timer Duration          [− 1:30 +]  │
│ Smart Suggestions 🔒   [  toggle  ] │    ← disabled, greyed
├──────────────────────────────────────┤
│              Close                   │
└──────────────────────────────────────┘
```

---

### Section 3: Data Management (Existing — Relocated)

The existing Data Management section moves here unchanged. The three rows (Export, Import, Cloud Backup) retain their current handlers.

---

### Section 4: Support

#### 4.1 Rate App (Navigation)

- **Behavior:** Opens the platform's app store page for rating. Uses `expo-linking` to open the Play Store / App Store URL. During development (pre-release), tapping shows an alert: *"Rating will be available once the app is published to the store."*
- **Icon:** `star-outline`
- **Icon color:** `colors.accent.warning` (amber)

#### 4.2 Support the Dev (Navigation)

- **Behavior:** Currently a placeholder. Will eventually link to a "buy me a coffee" or similar donation page. For now, shows an alert: *"Thank you for your interest in supporting the project! Donation options are coming soon."*
- **Icon:** `favorite`
- **Icon color:** `colors.accent.error` (red, matching current style)

#### 4.3 Send Feedback (Navigation)

- **Behavior:** Opens the device's email client with a pre-filled "to" address and subject line using `expo-linking`: `mailto:feedback@example.com?subject=Workout App Feedback`. During development, the email address can be a placeholder.
- **Icon:** `feedback`
- **Icon color:** `colors.accent.primary` (purple)

---

### Section 5: About

#### 5.1 Changelog (Navigation)

- **Behavior:** Opens a URL to the GitHub releases page or in-app changelog. For now, shows an alert with the current version notes or navigates to a simple modal with mock changelog entries.
- **Icon:** `new-releases`

#### 5.2 Privacy Policy (Navigation)

- **Behavior:** Opens a URL to the privacy policy page using `expo-linking`. For now, shows an alert: *"Privacy policy will be available at [URL] before the app launches."*
- **Subtitle:** Conveys the app's privacy-first stance: *"Your data stays on your device"*
- **Icon:** `shield`

#### 5.3 About (Navigation)

- **Behavior:** Shows an alert or navigates to a simple About modal showing: app name, version, build number, "Made with 💜" tagline, and link to GitHub repo.
- **Icon:** `info-outline`

---

### Section 6: Dev Tools (Existing — Conditional)

The existing Dev Tools section remains unchanged but should be wrapped in `__DEV__` conditional rendering so it does not appear in production builds.

---

## Data Model Changes

### New Columns on `user_settings`

The following columns need to be added via a **single new migration** (v13):

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `measurement_unit` | `TEXT` | `'in'` | Body measurement unit (in/cm) |
| `keep_awake` | `INTEGER` | `1` | Keep screen awake during workout |
| `show_exercise_media` | `INTEGER` | `1` | Show exercise icons in exercise picker |
| `show_exercise_instructions` | `INTEGER` | `1` | Show instructions on exercise details |
| `smart_suggestions` | `INTEGER` | `0` | ML predictions placeholder (disabled) |
| `default_weight_increment` | `REAL` | `5` | Weight +/− button step size |

### Migration v13: Settings Expansion

```sql
-- measurement_unit: in (inches) or cm (centimeters) for body measurements
ALTER TABLE user_settings ADD COLUMN measurement_unit TEXT DEFAULT 'in';

-- keep_awake: prevent screen lock during active workout
ALTER TABLE user_settings ADD COLUMN keep_awake INTEGER DEFAULT 1;

-- show_exercise_media: toggle exercise icons in ExercisePicker
ALTER TABLE user_settings ADD COLUMN show_exercise_media INTEGER DEFAULT 1;

-- show_exercise_instructions: toggle instructions on Exercise Details About tab
ALTER TABLE user_settings ADD COLUMN show_exercise_instructions INTEGER DEFAULT 1;

-- smart_suggestions: ML prediction toggle (future, default disabled)
ALTER TABLE user_settings ADD COLUMN smart_suggestions INTEGER DEFAULT 0;

-- default_weight_increment: step size for weight +/− buttons in keyboard
ALTER TABLE user_settings ADD COLUMN default_weight_increment REAL DEFAULT 5;
```

> [!IMPORTANT]
> Each `ALTER TABLE` must be guarded with `columnExists()` checks per the existing migration pattern (see v4, v9, v10 for examples). This ensures idempotency on devices that may hit the migration from different code paths.

### Model Updates

**`src/models/preferences.ts`** — Add to `UserSettings`:

```typescript
export interface UserSettings {
    // ... existing fields ...
    measurementUnit: string;           // 'in' | 'cm'
    keepAwakeDuringWorkout: boolean;
    showExerciseMedia: boolean;
    showExerciseInstructions: boolean;
    smartSuggestions: boolean;
    defaultWeightIncrement: number;    // step size for +/− buttons (default: 5)
}
```

**`src/services/preferencesService.ts`** — Add to:
1. `UserSettingsRow` — new snake_case fields
2. `DEFAULTS` — new default values
3. `getSettings()` — new field mapping
4. `updateSettings()` column map — new entries

---

## Interaction Between Settings Screen and WorkoutSettingsMenu

### Clear Separation of Concerns

The two settings surfaces have **zero overlap**. Each setting lives in exactly one place:

| Setting | Location | Rationale |
|---------|----------|----------|
| Theme, Units, Calendar Day | Settings Screen | App-wide preferences, rarely changed |
| Keep Awake, Exercise Media, Instructions | Settings Screen | Display preferences, not workout-specific |
| Warm-Up Calculator | Settings Screen | Advanced tool configuration |
| Show Previous, RPE, RIR | WorkoutSettingsMenu | Visual column toggles, changed mid-session |
| Plate Calculator | WorkoutSettingsMenu | Workout tool, contextual |
| Warm-up Sets, Default Sets | WorkoutSettingsMenu | Set defaults, relevant during workout |
| Weight Increment | WorkoutSettingsMenu | Keyboard behavior, relevant during workout |
| Auto Timer, Timer Duration | WorkoutSettingsMenu | Timer behavior, relevant during workout |
| Smart Suggestions | WorkoutSettingsMenu | Will affect logging behavior when implemented |

**Design decision:** All workout-specific settings live **exclusively** in the `WorkoutSettingsMenu`. The Settings screen handles app-wide preferences only. No duplication between the two surfaces.

### CalendarScreen Inline Controls

The Calendar screen currently has a **Sun/Mon segmented control** inline for `calendarStartDay`. Once this setting is in Settings, the inline control should be removed to avoid dual-source confusion. The Calendar will simply read the setting from `getSettings()`.

---

## Dependencies

### New Packages Required

| Package | Purpose | Phase |
|---------|---------|-------|
| `expo-keep-awake` | Keep screen awake during workouts | Phase 1 |

### Existing Packages Used

| Package | Purpose |
|---------|---------|
| `expo-linking` | Opening URLs (rate app, feedback email, privacy policy) |
| `@expo/vector-icons` (MaterialIcons) | Setting row icons |

---

## Implementation Phases

### Phase 1: Foundation — Settings Screen Restructure + General Settings

1. **Reorganize `SettingsScreen.tsx`** — Create the five-section layout (General, Data Management, Support, About, Dev Tools) with section headers. Remove the old "Workout" section concept — workout settings live in `WorkoutSettingsMenu`.
2. **Wire existing DB settings** into new General UI rows:
   - Weight Unit (segmented `lbs`/`kg`)
   - Distance Unit (segmented `mi`/`km`)
   - Calendar Start Day (segmented `Sun`/`Mon`)
   - Theme Mode (segmented `Dark`/`Light` with "coming soon" guard)
3. **Create reusable row components** — Extract `SettingToggleRow`, `SettingSegmentedRow`, `SettingStepperRow`, and `SettingNavigationRow` into `src/components/settings/` for consistent styling.
4. **Add version footer** — Display app version at the bottom of the scroll view.
5. **Wrap Dev Tools** in `__DEV__` conditional.

### Phase 2: New Settings + Migration

6. **DB migration v13** — Add 6 new columns to `user_settings`.
7. **Update `UserSettings` model** — Add new fields to interface.
8. **Update `preferencesService`** — Wire new columns through row type, defaults, read, and write.
9. **Wire new Settings Screen toggle rows:**
   - Keep Awake During Workout
   - Show Exercise Media
   - Show Exercise Instructions
   - Body Measurement Unit (`in`/`cm` segmented toggle)
10. **Expand `WorkoutSettingsMenu.tsx`** — Add new DEFAULTS section with:
    - Default Sets Per Exercise (stepper)
    - Default Weight Increment (stepper)
    - Auto Timer Start (toggle)
    - Timer Duration (time stepper with M:SS display)
    - Smart Suggestions (disabled placeholder toggle)
11. **Install `expo-keep-awake`** and wire `useKeepAwake()` into `WorkoutScreen.tsx` gated by the setting.
12. **Wire weight increment** — Update `WorkoutKeyboard.tsx` to read `defaultWeightIncrement` from settings instead of using a hardcoded `5`.

### Phase 3: Support + About Sections

13. **Rate App** — `expo-linking` to store URL (or placeholder alert).
14. **Support the Dev** — Placeholder alert.
15. **Send Feedback** — `expo-linking` mailto.
16. **Changelog** — Simple alert or modal with version notes.
17. **Privacy Policy** — `expo-linking` to URL (or placeholder alert).
18. **About** — Alert/modal with app info.

### Phase 4: Cleanup + Integration

19. **Remove Calendar start day inline control** from `CalendarScreen.tsx`.
20. **Connect Show Exercise Media** — Gate exercise icons in `ExercisePicker.tsx` behind this setting.
21. **Connect Show Exercise Instructions** — Gate instructions section in `ExerciseDetailsScreen.tsx` About tab.
22. **Connect Keep Awake** — Wire `useKeepAwake()` in active workout view.
23. **Warm-Up Calculator placeholder row** — "Coming soon" alert.

---

## Design Constraints

- **Section headers** follow the existing `SettingsScreen` pattern: uppercase, `typography.size.sm`, `colors.text.secondary`, `letterSpacing: 1`.
- **Row styling** matches the existing `menuItem` pattern: `colors.background.secondary` background, `borderRadius.md`, `padding: spacing.md`, icon in `colors.background.tertiary` 32×32 circle.
- **Segmented controls** should use the same visual style as the `CalendarScreen` sun/mon toggle: pill-shaped, `colors.background.tertiary` track, `colors.accent.primary` active pill.
- **Switches** use the app-standard `trackColor: { false: colors.background.tertiary, true: colors.accent.primary }` matching `WorkoutSettingsMenu`.
- **Maximum 600 lines** per component (Guardrail #1, enforced post-completion). The Settings screen will likely need extraction into sub-components — the reusable row components in Phase 1 will help keep the main file lean. The `WorkoutSettingsMenu` is currently 290 lines and will grow with the new DEFAULTS section — monitor for extraction needs.
- **No modals for binary choices** — Use inline segmented toggles (lbs/kg, mi/km, in/cm, Sun/Mon) rather than modals or action sheets for UX speed.
- **All settings read/write via `getSettings()`/`updateSettings()`** — No direct DB access from the screen or menu component. Respect the service layer boundary.
- **WorkoutSettingsMenu new section styling** must match existing section patterns (section header, setting rows with label + sub-label + control). The new DEFAULTS section should be visually consistent with the existing VISUAL COLUMNS and TOOLS sections.

---

## Out of Scope (Future)

- **Light theme implementation** — Only the toggle placeholder ships now. The actual light color palette is a separate design task.
- **Warm-up calculator** — Full percentage-based warm-up ramp calculator (advanced feature, stretch goal).
- **Smart suggestions / ML predictions** — Phase 7 roadmap. Only the disabled toggle ships now.
- **Notification preferences** — Will be added when push notifications are implemented.
- **Cloud backup settings** — Will be fleshed out when cloud sync is built.
- **Per-exercise rest timer defaults** — Part of ML/Personalization phase.
- **Unit conversion for historical data** — Deliberately out of scope (see Warning note under Weight Unit).
- **Onboarding screen** — The settings here could inform an optional onboarding flow, but that's a separate feature.

---

## Resolved Design Decisions

1. **Measurement unit scope:** `measurementUnit` controls body tape measurements only (waist, chest, bicep, etc.). `distanceUnit` controls cardio distance. `weightUnit` controls bodyweight + exercise weights. Three separate concerns, three separate settings.

2. **Warm-Up Calculator design:** When implemented, it will live as a **sub-screen** navigated from the Settings row. The complexity (work weight input, percentage steps, plate rounding options) warrants its own dedicated screen.

3. **Calendar start day migration:** No toast needed for the inline toggle removal. The setting moves to Settings without user notification.

---

## Last Updated
- Date: 2026-04-12
- Session Context: Revised PRD — workout settings moved to WorkoutSettingsMenu expansion, added weight increment setting, corrected exercise media scope, resolved open questions
