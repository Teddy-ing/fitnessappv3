---
description: Product requirements document for Phase 6 — Import, Export, and Cloud Backup features covering data portability, competitor migration, and cloud-based data protection
---

# Import, Export & Backup PRD

## Overview

Phase 6 delivers three pillars of data management: getting data **out** (Export), getting data **in** (Import), and keeping it **safe** (Cloud Backup). These features live in the existing **Settings** screen under the **Data Management** section, which currently has placeholder rows for Export, Import, and Cloud Backup.

**Design philosophy:** Data portability is a trust signal. Users who know they can leave will stay. Zero lock-in, zero friction, zero data anxiety. A veteran lifter migrating from Hevy should be logging within 60 seconds of installing the app. A user who loses their phone should never lose a single workout.

---

## Resolved Open Questions

1. **Competitor CSV Samples:** Each competitor parser requires real sample CSV exports. The user will supply samples from Hevy, Strong, FitNotes, GymWP, and Fitbod. Each parser section below has a placeholder for column mapping that will be filled in once samples are provided. Parsers can be built incrementally — start with Hevy, add others as samples arrive.

2. **Cloud Backup File Format:** **Decided: JSON.** Reuses the existing `ExportPayload` format from `dataTransferService.ts`. Same schema version checks, same table ordering, same validation. If performance becomes an issue with very large datasets (unlikely — even 3+ years of daily workouts is <10MB JSON), we can migrate to raw `.db` upload later.

3. **Google Drive Storage Location:** **Decided: Hidden App Data folder.** Uses the `drive.appdata` scope so the app can only access its own hidden folder. Users see backup status via the "Last backed up" timestamp in Settings, not by browsing Drive. Auto-deleted if the app is uninstalled from Play Store.

---

## Current State

### What Exists Today

The **Data Management** section in `SettingsScreen.tsx` (lines 312–336) has three navigation rows:

| Row | Current Behavior |
|-----|-----------------|
| Export Data | Calls `exportAllData()` — dumps all tables to JSON, opens share sheet |
| Import Data | Calls `importAllData()` — picks JSON file, validates, destructive restore |
| Cloud Backup | Placeholder alert: "Coming soon" |

### Existing `dataTransferService.ts` (221 lines)

The MVP export/import is already functional:

- **`exportAllData()`** — Reads 13 tables in FK order, writes `ExportPayload` JSON to cache dir, opens native share sheet via `expo-sharing`.
- **`importAllData()`** — Opens `expo-document-picker`, validates JSON structure + platform + schema version, clears all tables in reverse FK order, inserts all rows in a single transaction.
- **`EXPORT_TABLES`** — Ordered list of 13 tables (parents before children).
- **`ExportPayload`** — `{ meta: { appVersion, schemaVersion, exportedAt, platform }, tables: Record<string, Row[]> }`.

This MVP is solid and will be **kept as-is** for the native JSON backup path. Phase 6 adds the formatted spreadsheet export, competitor import parsers, and cloud backup on top of this foundation.

---

## Feature Architecture

### Feature 1: Export

Two distinct export paths — one for humans, one for machines.

#### 1.1 Formatted Spreadsheet (.xlsx) — "The Premium Export"

> **Purpose:** A beautifully formatted Excel file meant for human reading, sharing with coaches, or archival.

**Library:** `xlsx` (SheetJS) — lightweight, zero-native-dependency XLSX generation that works in React Native.

**Workbook Structure (4 sheets):**

| Sheet | Content | Sort Order |
|-------|---------|-----------|
| **Workouts** | Every workout with exercises, sets, weights, reps | `completed_at DESC` |
| **Measurements** | Bodyweight + body measurement history | `recorded_at DESC` |
| **Goals** | Active and completed goals with progress | Active first, then completed |
| **Personal Records** | All-time bests per exercise per rep count | Alphabetical by exercise |

**Workouts Sheet Columns:**

```
Date | Workout Name | Exercise | Set # | Set Type | Weight | Reps | RPE | Notes
```

- One row per set, grouped visually by workout date and exercise.
- Warmup sets marked with "W" prefix in Set Type column.
- Weight displayed in user's current unit preference with unit suffix.

**Measurements Sheet Columns:**

```
Date | Metric | Value | Unit
```

**Goals Sheet Columns:**

```
Goal | Type | Target | Current | Progress % | Status | Deadline
```

**Personal Records Sheet Columns:**

```
Exercise | Reps | Best Weight | Est. 1RM | Date Achieved
```

- Rows 1–12 RM per exercise.
- Highest Est. 1RM row bold.

**File naming:** `workout-export-YYYY-MM-DD.xlsx`

**Output:** Written to cache directory, opened via native share sheet (same pattern as JSON export).

#### 1.2 Native App Backup (.json) — "The Data Backup"

**No changes needed.** The existing `exportAllData()` in `dataTransferService.ts` already handles this perfectly:
- Dumps all 13 tables to a structured JSON payload
- Includes schema version for forward-compatibility checks
- Opens the native share sheet for saving to Files, emailing, etc.

The only enhancement: update `EXPORT_TABLES` to include `exercise_notes` (added in v11 migration for Exercise Details, currently missing from the list) and `cloud_backup_config` (added by this phase's migration). The updated table list:

```typescript
const EXPORT_TABLES = [
    'user_settings',
    'exercises',
    'templates',
    'template_exercises',
    'splits',
    'splits_templates',
    'splits_schedule',
    'workouts',
    'workout_exercises',
    'workout_sets',
    'personal_records',
    'measurements',
    'progress_photos',
    'goals',
    'exercise_notes',          // v11 — Exercise Details
    // NOTE: cloud_backup_config deliberately excluded — it's device-specific
] as const;
```

> [!NOTE]
> `cloud_backup_config` is intentionally excluded from `EXPORT_TABLES`. Cloud backup settings are device/account-specific and should not transfer between devices via JSON backup. A user restoring on a new phone needs to re-authenticate with their cloud provider regardless.

---

### Feature 2: Import

#### 2.1 Native App Restore (Local JSON)

**No changes needed.** The existing `importAllData()` handles this. User picks a `.json` backup from their device, app validates and restores.

#### 2.2 Competitor App Import

A seamless migration path for users coming from other fitness apps.

**Supported Apps:**

| App | Export Format | Files | Priority |
|-----|-------------|-------|----------|
| Hevy | CSV (comma-delimited) | `workout_data.csv` + `measurement_data.csv` (separate) | High (largest competitor) |
| Strong | CSV (semicolon-delimited) | Single CSV file | High |
| FitNotes | CSV (comma-delimited, must export as spreadsheet) | `FitNotes_Export.csv` + `FitNotes_BodyTracker_Export.csv` (separate) | Medium (Android-focused) |

> [!WARNING]
> **FitNotes export quirk:** FitNotes' default export produces a `.fitnotes` proprietary file, which is unusable. Users must explicitly select **"Export as Spreadsheet"** to get the CSV format. The import UI should include a brief instruction: *"In FitNotes, use Export → Spreadsheet (.csv) — not the default .fitnotes format."*

> [!NOTE]
> **GymWP and Fitbod removed.** Both require a paid subscription to export data, making them impractical for testing and low-priority for users migrating away from paid apps (those users have already committed financially). If demand emerges, parsers can be added later without architectural changes.

**Import Architecture:**

Each competitor gets a dedicated parser module in `src/services/importParsers/`:

```
src/services/importParsers/
├── index.ts              // Barrel exports + CompetitorSource type
├── types.ts              // Shared types (ParsedWorkout, ParsedSet, ParsedMeasurement, etc.)
├── exerciseMapper.ts     // Exercise name matching + custom exercise creation
├── hevyParser.ts         // Hevy CSV → ParsedWorkout[] + ParsedMeasurement[]
├── strongParser.ts       // Strong CSV → ParsedWorkout[]
└── fitnotesParser.ts     // FitNotes CSV → ParsedWorkout[] + ParsedMeasurement[]
```

**Shared Types:**

```typescript
type CompetitorSource = 'hevy' | 'strong' | 'fitnotes';

interface ParsedSet {
    setNumber: number;
    weight: number | null;       // Always stored in canonical lbs
    reps: number | null;
    duration: number | null;     // seconds, for timed exercises
    type: 'working' | 'warmup'; // Best-effort mapping
    rpe: number | null;
}

interface ParsedExercise {
    originalName: string;        // Name as it appears in the CSV
    mappedExerciseId: string | null;  // Matched to our exercise DB
    sets: ParsedSet[];
}

interface ParsedWorkout {
    date: string;                // ISO date
    name: string;                // Workout name (if available)
    duration: number | null;     // seconds
    exercises: ParsedExercise[];
    notes: string | null;
}

/** For Hevy and FitNotes measurement file imports */
interface ParsedMeasurement {
    date: string;                // ISO date
    type: string;                // 'bodyweight' | 'body_fat' | 'neck' | 'waist' | etc.
    value: number;
    unit: string;                // 'lbs' | '%' | 'in' | etc.
}

interface ImportSummary {
    source: CompetitorSource;
    totalWorkouts: number;
    totalSets: number;
    totalMeasurements: number;   // From measurement file (Hevy/FitNotes only)
    exerciseMapping: ExerciseMapping[];
    warnings: string[];          // Non-fatal issues (skipped rows, etc.)
}

interface ExerciseMapping {
    originalName: string;
    suggestedMatch: { id: string; name: string } | null;  // Fuzzy match
    action: 'map' | 'create' | 'skip';  // User decides
}
```

**Import Flow (4 steps):**

1. **Select Source** — User picks the competitor app from a bottom sheet.
2. **Pick File(s)** — Native document picker opens for CSV selection. For Hevy and FitNotes, the picker allows selecting **multiple files** (workout data + optional measurement data). The parser detects file type from headers.
3. **Parse & Map** — The parser reads the CSV(s), identifies exercises, and fuzzy-matches them to the app's exercise database. Unknown exercises are presented to the user for mapping.
4. **Review & Confirm** — A summary screen shows "Found 140 workouts, 1,200 sets, 3 measurements, 3 unknown exercises" with a Confirm button.

**Exercise Mapping Strategy:**

The `exerciseMapper.ts` module handles matching competitor exercise names to the app's exercise database:

1. **Exact match** — Case-insensitive string comparison against `exercise.name`.
2. **Fuzzy match** — Levenshtein distance or normalized substring matching. If confidence > 80%, auto-suggest the match.
3. **No match** — Present to user with options:
   - **Map to existing** — User picks from exercise list (reuse `ExercisePickerView`).
   - **Create as custom** — Auto-create a new custom exercise with the original name.
   - **Skip** — Ignore all sets for this exercise.

> [!NOTE]
> Competitor imports are **additive** — they do NOT clear existing data. Imported workouts are added alongside existing workouts. This is the opposite of the native JSON restore (which is destructive). The user should be clearly informed of this distinction.

**Unit Handling:**

- Competitor CSVs may use kg or lbs. Each parser detects the unit from file headers or metadata columns.
- All imported weights are converted to canonical lbs (the app's internal storage unit) using `toCanonicalWeight()` from `unitConversion.ts`.
- If a CSV has no unit indicator, the parser falls back to the user's current `weightUnit` setting and prompts for confirmation.

**CSV Parsing Library:** `papaparse` — battle-tested CSV parser that works in React Native with streaming support for large files.

---

### Competitor CSV Format Specifications

Each parser maps competitor-specific CSV columns to the shared `ParsedWorkout` / `ParsedSet` types. All column mappings below are confirmed from real export samples.

#### Hevy CSV Format

**Status:** ✅ Sample analyzed — [workout_data.csv](file:///c:/Users/teddy/projects/workout-app/.agent/knowledge/Import%20examples/hevy/workout_data.csv), [measurement_data.csv](file:///c:/Users/teddy/projects/workout-app/.agent/knowledge/Import%20examples/hevy/measurement_data.csv)
**Priority:** High — largest competitor, most migration traffic expected.
**Delimiter:** Comma (`,`)
**Files:** Two separate CSVs — workout data and measurement data.

**Workout file (`workout_data.csv`) columns:**

| CSV Column | Type | Maps To | Notes |
|------------|------|---------|-------|
| `title` | string | `ParsedWorkout.name` | e.g., "Push", "Afternoon workout 💪" — may contain emoji |
| `start_time` | string | `ParsedWorkout.date` | Format: `"23 Apr 2026, 17:22"` — needs custom date parsing |
| `end_time` | string | Duration calc | `end_time - start_time` = `ParsedWorkout.duration` |
| `description` | string | `ParsedWorkout.notes` | Workout-level notes (e.g., "Poop") |
| `exercise_title` | string | `ParsedExercise.originalName` | Includes equipment suffix: "Bench Press (Barbell)" |
| `superset_id` | number\|null | *Ignored v1* | Superset grouping — could reconstruct in future |
| `exercise_notes` | string | *Ignored v1* | Per-exercise notes |
| `set_index` | number | `ParsedSet.setNumber` | **0-indexed** — must add 1 for our 1-indexed system |
| `set_type` | string | `ParsedSet.type` | Values: `"normal"` → working, `"warmup"` → warmup |
| `weight_lbs` | number\|null | `ParsedSet.weight` | **Already in lbs** — no conversion needed |
| `reps` | number\|null | `ParsedSet.reps` | |
| `distance_miles` | number\|null | *Ignored v1* | Cardio distance |
| `duration_seconds` | number\|null | `ParsedSet.duration` | For timed exercises (e.g., "Warm Up" at 300s = 5min) |
| `rpe` | number\|null | `ParsedSet.rpe` | Direct mapping |

**Grouping logic:** Rows are grouped into workouts by `title` + `start_time` combination. Multiple rows share the same workout identity.

**Measurement file (`measurement_data.csv`) columns:**

| CSV Column | Type | Maps To | Notes |
|------------|------|---------|-------|
| `date` | string | `ParsedMeasurement.date` | Format: `"23 Apr 2026, 00:00"` |
| `weight_lbs` | number\|null | Bodyweight measurement | |
| `fat_percent` | number\|null | Body fat % measurement | |
| `neck_in` | number\|null | Neck measurement (inches) | |
| `shoulder_in` | number\|null | Shoulder measurement | |
| `chest_in` | number\|null | Chest measurement | |
| `left_bicep_in` | number\|null | Left bicep measurement | Hevy tracks L/R separately — we average or take one |
| `right_bicep_in` | number\|null | Right bicep measurement | |
| `left_forearm_in` | number\|null | Left forearm measurement | |
| `right_forearm_in` | number\|null | Right forearm measurement | |
| `abdomen_in` | number\|null | Abdomen measurement | |
| `waist_in` | number\|null | Waist measurement | |
| `hips_in` | number\|null | Hips measurement | |
| `left_thigh_in` | number\|null | Left thigh measurement | |
| `right_thigh_in` | number\|null | Right thigh measurement | |
| `left_calf_in` | number\|null | Left calf measurement | |
| `right_calf_in` | number\|null | Right calf measurement | |

**Measurement mapping:** Each non-null column in a measurement row becomes a separate `ParsedMeasurement`. The column-per-metric format means one CSV row can produce 0–17 measurements. All measurement units are hardcoded in the column name (`_lbs`, `_in`, `_percent`) — no unit detection needed.

**Hevy-specific parsing notes:**
- Date format is `"DD Mon YYYY, HH:MM"` — use a custom parser, not `new Date()`.
- Weight column is `weight_lbs` — always in lbs, no conversion needed.
- `set_index` is 0-based — add 1.
- `superset_id` is present but we ignore it in v1 (reconstructing supersets is complex and low-value for import).
- Custom exercises (like "Test Abs" in sample) will have no match in our DB — triggers the exercise mapping flow.
- Timed exercises (like "Warm Up" with `duration_seconds: 300`) map to cardio/stretch category.

---

#### Strong CSV Format

**Status:** ✅ Sample analyzed — [strong CSV](file:///c:/Users/teddy/projects/workout-app/.agent/knowledge/Import%20examples/strong7829848025505501631.csv)
**Priority:** High.
**Delimiter:** Semicolon (`;`) — NOT comma. All values are double-quoted.
**Files:** Single CSV containing all workout data. No separate measurement file.

**Columns:**

| CSV Column | Type | Maps To | Notes |
|------------|------|---------|-------|
| `Workout #` | number | Grouping key | Groups rows into workouts — same number = same workout |
| `Date` | string | `ParsedWorkout.date` | Format: `"2026-01-06 14:19:10"` — standard ISO-ish, parseable |
| `Workout Name` | string | `ParsedWorkout.name` | e.g., "Afternoon Workout", "Evening Workout" |
| `Duration (sec)` | number | `ParsedWorkout.duration` | In seconds (e.g., `82343` = ~22.9 hours — possibly a bug in sample, but parse as-is) |
| `Exercise Name` | string | `ParsedExercise.originalName` | Includes equipment: "Arnold Press (Dumbbell)" |
| `Set Order` | string | `ParsedSet.setNumber` / filter | **"Rest Timer" rows must be filtered out** — they are not real sets |
| `Weight (kg)` | number\|null | `ParsedSet.weight` | **Always in kg** — must convert to canonical lbs via `toCanonicalWeight()` |
| `Reps` | number\|null | `ParsedSet.reps` | |
| `RPE` | number\|null | `ParsedSet.rpe` | |
| `Distance (meters)` | number\|null | *Ignored v1* | Cardio distance |
| `Seconds` | number\|null | `ParsedSet.duration` | For timed exercises and rest timer rows |
| `Notes` | string | *Per-set notes* | |
| `Workout Notes` | string | `ParsedWorkout.notes` | |

**Strong-specific parsing notes:**
- **Semicolon delimiter is critical** — `papaparse` must be configured with `delimiter: ';'`.
- **"Rest Timer" rows must be skipped.** When `Set Order` = `"Rest Timer"`, the row represents a rest period, not a set. Filter these out during parsing.
- **Weight is always in kg** regardless of user settings in Strong. The column header explicitly says `Weight (kg)`. Convert to lbs at parse time.
- **Grouping:** `Workout #` is the workout grouping key. All rows with the same number belong to the same workout session.
- No measurement data — Strong does not export body measurements.
- No set type info — Strong doesn't distinguish warmup from working sets. All sets import as `'working'`.

---

#### FitNotes CSV Format

**Status:** ✅ Sample analyzed — [FitNotes_Export.csv](file:///c:/Users/teddy/projects/workout-app/.agent/knowledge/Import%20examples/FitNotes_Export.csv), [FitNotes_BodyTracker_Export.csv](file:///c:/Users/teddy/projects/workout-app/.agent/knowledge/Import%20examples/FitNotes_BodyTracker_Export.csv)
**Priority:** Medium — Android-focused user base.
**Delimiter:** Comma (`,`)
**Files:** Two separate CSVs — workout data and body tracker data. User must export each separately.

> [!WARNING]
> FitNotes' **default export is a proprietary `.fitnotes` file** that we cannot parse. Users MUST select **"Export as Spreadsheet"** to get the CSV. The import UI should display a help message for FitNotes users.

**Workout file (`FitNotes_Export.csv`) columns:**

| CSV Column | Type | Maps To | Notes |
|------------|------|---------|-------|
| `Date` | string | `ParsedWorkout.date` | Format: `"2025-07-22"` — clean ISO date, trivially parseable |
| `Exercise` | string | `ParsedExercise.originalName` | e.g., "Flat Barbell Bench Press", "Hack Squat" |
| `Category` | string | Muscle group hint | e.g., "Chest", "Back", "Legs", "Biceps", "Triceps", "Shoulders", "Abs" — useful for fuzzy matching |
| `Weight` | number\|null | `ParsedSet.weight` | |
| `Weight Unit` | string | Unit detection | Per-row unit: `"lbs"` or `"kg"` — convert to canonical lbs if `"kg"` |
| `Reps` | number\|null | `ParsedSet.reps` | |
| `Distance` | number\|null | *Ignored v1* | Cardio distance |
| `Distance Unit` | string\|null | *Ignored v1* | |
| `Time` | string\|null | `ParsedSet.duration` | Format: `"0:00:00"` (H:MM:SS) — for timed exercises like "Side Plank" |

**Body tracker file (`FitNotes_BodyTracker_Export.csv`) columns:**

| CSV Column | Type | Maps To | Notes |
|------------|------|---------|-------|
| `Date` | string | `ParsedMeasurement.date` | Format: `"2026-04-23"` — clean ISO |
| `Time` | string | *Ignored* | e.g., `"17:40:16"` |
| `Measurement` | string | `ParsedMeasurement.type` | e.g., `"Bodyweight"`, `"Body Fat"`, `"Neck"` |
| `Value` | number | `ParsedMeasurement.value` | |
| `Unit` | string | `ParsedMeasurement.unit` | `"lbs"`, `"%"`, `"in"` |

**FitNotes-specific parsing notes:**
- **No workout names.** FitNotes does not group exercises into named workouts. Workouts are synthesized by grouping consecutive rows with the same `Date`. Workout name defaults to the date (e.g., `"Jul 22, 2025"`).
- **No workout duration.** FitNotes tracks only what exercises/sets were done, not session timing. `ParsedWorkout.duration` = `null`.
- **No RPE.** FitNotes does not track RPE. `ParsedSet.rpe` = `null` for all sets.
- **No set type.** FitNotes does not distinguish warmup from working sets. All import as `'working'`.
- **Per-row weight unit.** Unlike Strong (always kg) or Hevy (always lbs), FitNotes includes a `Weight Unit` column on every row. This is robust but means the parser must check per-row.
- **Category field is a bonus.** The `Category` column ("Chest", "Back", etc.) can inform fuzzy matching confidence — if our DB has a "Flat Barbell Bench Press" and the category is "Chest", that's a strong signal.
- **Timed exercises** use the `Time` column in `H:MM:SS` format (e.g., "Side Plank" with `Time: 0:00:00` — likely a default/placeholder). Parse to seconds.
- **Supersets are implicit.** FitNotes interleaves exercises for supersets (e.g., Long Head Cable Curl → Overhead Tricep Extension → Long Head Cable Curl). The parser does not attempt to reconstruct superset groupings — exercises are imported in the order they appear.

**Measurement type mapping (FitNotes → our measurement_types):**

| FitNotes `Measurement` | Our `measurement_types` | Unit |
|------------------------|------------------------|------|
| `Bodyweight` | `bodyweight` | lbs |
| `Body Fat` | `body_fat` | % |
| `Neck` | `neck` | in |
| `Waist` | `waist` | in |
| *Others as they appear* | Fuzzy match to seeded types | varies |

---

### Feature 3: Cloud Backup & Restore

Automatic cloud-based data protection so users never lose data.

#### 3.1 Google Drive Integration (Android + iOS)

- **Library:** `@react-native-google-signin/google-signin` + Google Drive REST API via `fetch`.
- **Scope:** `https://www.googleapis.com/auth/drive.appdata` — access only to the hidden App Data folder. The app cannot see or modify any other files on the user's Drive.
- **Storage location:** Hidden App Data folder (invisible in Drive UI, auto-deleted if app is uninstalled from Play Store).

#### 3.2 iCloud Integration (iOS only)

- **Library:** `react-native-icloudstore` or direct `NSUbiquitousKeyValueStore` bridge.
- **Storage location:** App's iCloud container, managed by the OS.
- **Availability:** Automatic on iOS when the user is signed into iCloud. No explicit sign-in flow needed.

#### 3.3 Backup File Format

Reuses the existing `ExportPayload` JSON format from `dataTransferService.ts`. The cloud backup is functionally identical to the local JSON export — same schema version checks, same table ordering, same validation.

**File naming in cloud:** `workout-backup-latest.json` (single file, overwritten on each backup). No versioning — the cloud backup is always the most recent snapshot.

#### 3.4 Cloud Backup Features

| Feature | Description |
|---------|-------------|
| **Auto-Backup** | Toggle to automatically back up after every workout save. Runs in the background after `saveWorkout()` completes. |
| **Last Sync Status** | Displays timestamp of last successful backup: "Last backed up: Today at 2:00 PM" |
| **Back Up Now** | Manual trigger button. Shows spinner during upload, success/failure feedback. |
| **Restore from Cloud** | Downloads latest backup and performs destructive restore (same as local JSON import). Strong confirmation dialog required. |

#### 3.5 Auto-Backup Integration Point

Auto-backup hooks into the workout save flow without blocking the UI:

```typescript
// In WorkoutScreen.tsx (or wherever saveWorkout is called):
async function handleFinishWorkout() {
    // 1. Save workout (existing flow — blocks UI with spinner)
    const result = await saveWorkout(...);

    // 2. Navigate away immediately (user sees success)
    navigateToHome();

    // 3. Fire-and-forget cloud backup (non-blocking)
    triggerAutoBackupIfEnabled();  // checks toggle, uploads in background
}
```

- `triggerAutoBackupIfEnabled()` reads `cloud_backup_config.auto_backup_enabled`, and if true, calls `backupToCloud()` in a fire-and-forget pattern (no `await`).
- On success, updates `last_backup_at` and `last_backup_status = 'success'`.
- On failure, updates `last_backup_status = 'failed'`. No user-facing error — the "Last backed up" timestamp in Settings will be stale, signaling the issue.
- A persistent failure badge (small red dot on the Cloud Backup row in Settings) appears when `last_backup_status === 'failed'` to gently alert the user.

#### 3.6 Restore Confirmation Flow

Cloud restore is destructive and requires a two-step confirmation:

```
Step 1: Alert.alert(
    'Restore from Cloud?',
    'This will REPLACE all your current data with the cloud backup from [timestamp].\n\nYour existing workouts, templates, and measurements will be deleted.\n\nThis cannot be undone!',
    [{ text: 'Cancel' }, { text: 'Restore', style: 'destructive', onPress: step2 }]
)

Step 2: Alert.alert(
    'Are you sure?',
    'Type RESTORE to confirm.',
    // ... or simply a second destructive confirmation button
)
```

---

## Navigation Routing

### Import Flow Navigation

The import flow requires multi-screen navigation for the exercise mapping step. Rather than adding routes to `ProfileStackParamList` (which would clutter the profile nav with transient import screens), the import flow uses a **modal stack**:

- `ImportBottomSheet` — Source selector (presented as a bottom sheet from Settings)
- `ExerciseMappingScreen` — Full-screen modal for step-through exercise mapping
- `ImportSummaryModal` — Confirmation modal before executing import

**Implementation:** Use `react-navigation`'s modal presentation via a nested stack navigator or a sequence of modals. The mapping screen needs `presentationStyle: 'fullScreenModal'` (same pattern as `WorkoutSettingsMenu`).

### Settings Screen Data Management Section

The three existing rows (`Export Data`, `Import Data`, `Cloud Backup`) remain as the entry points. Their `onPress` handlers change from direct function calls to opening bottom sheets / navigating to the cloud backup section.

---

## User Interface Design

All UI lives in the existing **Settings** screen's **Data Management** section. The current three placeholder rows are expanded.

### Export UI Flow

```
Settings → "Export Data" tap
    → Bottom sheet opens:
        ┌────────────────────────────────┐
        │        Export Data             │
        ├────────────────────────────────┤
        │  📊  Spreadsheet (.xlsx)       │
        │  Human-readable, for sharing   │
        ├────────────────────────────────┤
        │  💾  App Backup (.json)        │
        │  Full backup, for restoring    │
        ├────────────────────────────────┤
        │          Cancel                │
        └────────────────────────────────┘
    → Selection triggers export + native share sheet
```

### Import UI Flow

```
Settings → "Import Data" tap
    → Bottom sheet opens:
        ┌────────────────────────────────┐
        │        Import Data             │
        ├────────────────────────────────┤
        │  📱  This App (.json)          │
        │  Restore from backup file      │
        ├────────────────────────────────┤
        │  ── FROM OTHER APPS ────────── │
        │  🟢  Hevy                      │
        │      Select workout + body     │
        │      measurement CSV files     │
        │  💪  Strong                    │
        │      Select CSV export file    │
        │  📝  FitNotes                  │
        │      Select workout + body     │
        │      tracker CSV files         │
        │      ⓘ Use "Export as          │
        │        Spreadsheet" in FitNotes│
        ├────────────────────────────────┤
        │          Cancel                │
        └────────────────────────────────┘
    → "This App" triggers existing importAllData() flow
    → Competitor: file picker (multi-select for Hevy/FitNotes)
      → exercise mapping screen → summary → confirm
```

### Exercise Mapping Screen

When competitor import finds unknown exercises, a full-screen modal shows:

```
┌──────────────────────────────────────┐
│ ← Map Exercises              3 of 3 │
├──────────────────────────────────────┤
│                                      │
│  "Incline DB Press" from Hevy        │
│                                      │
│  ┌─ SUGGESTED MATCH ─────────────┐   │
│  │ ✓ Incline Dumbbell Press      │   │ ← auto-suggested, tappable
│  └───────────────────────────────┘   │
│                                      │
│  [ Choose Different Exercise ]       │ ← opens ExercisePickerView
│  [ Create as Custom Exercise ]       │
│  [ Skip This Exercise ]             │
│                                      │
│          ┌──────────────┐            │
│          │    Next →    │            │
│          └──────────────┘            │
└──────────────────────────────────────┘
```

### Import Summary Screen

After mapping, before final confirmation:

```
┌──────────────────────────────────────┐
│         Import Summary               │
├──────────────────────────────────────┤
│                                      │
│  Source: Hevy                        │
│                                      │
│  ┌───────────────────────────────┐   │
│  │  📋  140 workouts             │   │
│  │  🏋️  1,200 sets               │   │
│  │  💪  32 exercises             │   │
│  │  ⚠️  2 skipped exercises      │   │
│  └───────────────────────────────┘   │
│                                      │
│  ⓘ Imported workouts will be added   │
│    alongside your existing data.     │
│                                      │
│          ┌──────────────┐            │
│          │   Import     │            │
│          └──────────────┘            │
│          [ Cancel ]                  │
└──────────────────────────────────────┘
```

### Cloud Backup UI

The Cloud Backup row in Settings expands into a dedicated card/section when connected:

**Disconnected state:**

```
┌─ CLOUD BACKUP ──────────────────────┐
│  ☁️  Connect to Google Drive     →  │
│  ☁️  Connect to iCloud           →  │  ← iOS only
└─────────────────────────────────────┘
```

**Connected state (e.g., Google Drive):**

```
┌─ CLOUD BACKUP ──────────────────────┐
│  ✓ Connected to Google Drive        │
│    user@gmail.com                   │
│                                     │
│  Auto-Backup          [ toggle ]    │
│  Last backed up: Today at 2:00 PM   │
│                                     │
│  [ Back Up Now ]                    │
│  [ Restore from Cloud ]            │  ← red text, danger action
│  [ Disconnect ]                     │
└─────────────────────────────────────┘
```

---

## Data Model Changes

### New: `cloud_backup_config` Table

```sql
CREATE TABLE IF NOT EXISTS cloud_backup_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    provider TEXT,                          -- 'google_drive' | 'icloud' | null
    account_identifier TEXT,               -- email or Apple ID display name
    auto_backup_enabled INTEGER DEFAULT 0,
    last_backup_at TEXT,                   -- ISO timestamp
    last_backup_status TEXT DEFAULT 'none' -- 'success' | 'failed' | 'none'
);
```

> [!NOTE]
> Separate table (not columns on `user_settings`) because cloud backup config is conceptually distinct from user preferences and may need multiple rows in the future (e.g., backup to both Google Drive and iCloud simultaneously).

### Migration (next available version)

```sql
-- Cloud backup configuration
CREATE TABLE IF NOT EXISTS cloud_backup_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    provider TEXT,
    account_identifier TEXT,
    auto_backup_enabled INTEGER DEFAULT 0,
    last_backup_at TEXT,
    last_backup_status TEXT DEFAULT 'none'
);
```

- Add `cloud_backup_config` to `clearAllData()` per Guardrail #11.
- `cloud_backup_config` is deliberately **excluded** from `EXPORT_TABLES` (device-specific, see resolved decision in Feature 1.2).

### Existing Table Updates

- **`EXPORT_TABLES` in `dataTransferService.ts`:** Add `exercise_notes` (missing since v11 migration). See Feature 1.2 for the complete updated list.
- No schema changes needed for workout/exercise/set tables — the competitor parsers produce standard rows using existing insert functions from `workoutService.ts`.

### Competitor Import Data Flow

Competitor imports write to existing tables using existing service functions:

| Parsed Data | Target Table | Insert Via |
|-------------|-------------|------------|
| `ParsedWorkout` | `workouts` | Batch INSERT (new function) |
| `ParsedExercise` | `workout_exercises` | Batch INSERT (new function) |
| `ParsedSet` | `workout_sets` | Batch INSERT (new function) |
| Unmapped exercise ("Create") | `exercises` | `addCustomExercise()` |

> [!IMPORTANT]
> Per Guardrail #13, competitor imports must use batch INSERT queries — not per-row loops. A user importing 3 years of Hevy data could have 500+ workouts and 5,000+ sets. A new `batchInsertWorkouts()` function in `workoutService.ts` (or a dedicated `importInsertService.ts`) handles this with chunked `INSERT INTO ... VALUES (...)` statements, batched at 500 rows per statement per Guardrail #8.

---

## Service Layer

### New Services

#### `src/services/exportService.ts`

```typescript
/** Generate a formatted .xlsx spreadsheet export */
generateSpreadsheetExport(): Promise<string>  // Returns file URI

/** Get all data needed for the Workouts sheet */
getWorkoutExportData(): Promise<WorkoutExportRow[]>

/** Get all data needed for the Measurements sheet */
getMeasurementExportData(): Promise<MeasurementExportRow[]>

/** Get all data needed for the Goals sheet */
getGoalExportData(): Promise<GoalExportRow[]>

/** Get all data needed for the Personal Records sheet */
getRecordExportData(): Promise<RecordExportRow[]>
```

#### `src/services/competitorImportService.ts`

```typescript
/** Parse a competitor CSV file into standardized workout data */
parseCompetitorFile(source: CompetitorSource, fileUri: string): Promise<ParsedWorkout[]>

/** Generate exercise mappings with fuzzy matching */
generateExerciseMappings(parsedWorkouts: ParsedWorkout[]): Promise<ExerciseMapping[]>

/** Execute the import with resolved mappings */
executeCompetitorImport(
    parsedWorkouts: ParsedWorkout[],
    resolvedMappings: ExerciseMapping[],
): Promise<ImportResult>

/** Get a summary of what will be imported (for the confirmation screen) */
getImportSummary(parsedWorkouts: ParsedWorkout[], mappings: ExerciseMapping[]): ImportSummary
```

#### `src/services/cloudBackupService.ts`

```typescript
/** Authenticate with Google Drive */
connectGoogleDrive(): Promise<{ email: string }>

/** Authenticate with iCloud (iOS only) */
connectICloud(): Promise<{ displayName: string }>

/** Disconnect the current cloud provider */
disconnect(): Promise<void>

/** Upload current data to cloud */
backupToCloud(): Promise<{ timestamp: string }>

/** Download and restore from cloud backup */
restoreFromCloud(): Promise<boolean>

/** Get current cloud backup configuration */
getCloudBackupConfig(): Promise<CloudBackupConfig | null>

/** Update auto-backup setting */
setAutoBackup(enabled: boolean): Promise<void>
```

### Modified Services

#### `src/services/dataTransferService.ts`

- Update `EXPORT_TABLES` to add `exercise_notes` (see updated list in Feature 1.2).
- No other changes — the existing export/import functions remain the JSON backup path.

#### `src/services/workoutService.ts`

- Add `batchInsertWorkouts(workouts, exercises, sets)` — chunked batch INSERT for competitor imports per Guardrail #13.

#### `src/screens/SettingsScreen.tsx`

- Replace direct `exportAllData()` call with bottom sheet presentation.
- Replace direct `importAllData()` call with bottom sheet presentation.
- Replace placeholder Cloud Backup alert with `CloudBackupSection` component.

#### `src/screens/WorkoutScreen.tsx`

- Add `triggerAutoBackupIfEnabled()` call after `saveWorkout()` completes (fire-and-forget, non-blocking).

---

## Data Sourcing Summary

| Feature | Service | Function(s) | New? |
|---------|---------|-------------|------|
| Export — Spreadsheet | `exportService` | `generateSpreadsheetExport()` | **Yes** |
| Export — JSON | `dataTransferService` | `exportAllData()` | No |
| Import — JSON Restore | `dataTransferService` | `importAllData()` | No |
| Import — Competitor | `competitorImportService` | `parseCompetitorFile()`, `executeCompetitorImport()` | **Yes** |
| Import — Exercise Mapping | `importParsers/exerciseMapper` | `generateExerciseMappings()` | **Yes** |
| Cloud — Google Drive | `cloudBackupService` | `connectGoogleDrive()`, `backupToCloud()` | **Yes** |
| Cloud — iCloud | `cloudBackupService` | `connectICloud()`, `backupToCloud()` | **Yes** |
| Cloud — Config | `cloudBackupService` | `getCloudBackupConfig()` | **Yes** |

---

## Implementation Phases

### Phase 1: Export Enhancement — Spreadsheet (.xlsx)

1. **Install `xlsx` package** (SheetJS).
2. **Create `exportService.ts`** with 4 data query functions + spreadsheet generation.
3. **Create `ExportBottomSheet` component** — two-option picker (Spreadsheet / JSON Backup).
4. **Update Settings screen** — "Export Data" row opens the bottom sheet instead of directly calling `exportAllData()`.
5. **Wire share sheet** — both paths output to cache dir and open native share sheet.

### Phase 2: Competitor Import — Parser Infrastructure

6. **Install `papaparse`** for CSV parsing.
7. **Create `src/services/importParsers/types.ts`** — shared parsed types.
8. **Create `exerciseMapper.ts`** — fuzzy matching engine against exercise database.
9. **Create first parser** — `hevyParser.ts` (highest priority, most users migrating from Hevy).
10. **Create `competitorImportService.ts`** — orchestrator for parse → map → import flow.

### Phase 3: Competitor Import — UI Flow

11. **Create `ImportBottomSheet` component** — source selector (This App + 5 competitors).
12. **Create `ExerciseMappingScreen`** — step-through unknown exercise resolution.
13. **Create `ImportSummaryModal`** — review totals before confirming.
14. **Wire into Settings** — "Import Data" row opens the bottom sheet.
15. **Add remaining parsers** — `strongParser.ts`, `fitnotesParser.ts`, `gymwpParser.ts`, `fitbodParser.ts`.

### Phase 4: Cloud Backup — Google Drive

16. **Install `@react-native-google-signin/google-signin`**.
17. **DB migration** — Create `cloud_backup_config` table. Add to `clearAllData()`.
18. **Create `cloudBackupService.ts`** — Google Drive auth + upload/download via REST API.
19. **Create `CloudBackupSection` component** — connected/disconnected states, auto-backup toggle, last backup timestamp, manual backup/restore buttons.
20. **Wire auto-backup** — Hook into `saveWorkout()` completion to trigger background backup when enabled.

### Phase 5: Cloud Backup — iCloud (iOS)

21. **Install iCloud bridge library** or create native module.
22. **Extend `cloudBackupService.ts`** with iCloud-specific auth and storage.
23. **Platform-conditional UI** — Show iCloud option only on iOS.

### Phase 6: Polish & Edge Cases

24. **Large file handling** — Progress indicators for imports with 500+ workouts.
25. **Error recovery** — Partial import rollback on failure (wrap in transaction).
26. **Concurrent invocation guards** — `useRef(false)` on all export/import/backup buttons per Guardrail #14.
27. **Update `EXPORT_TABLES`** — Ensure new tables from this phase are included.
28. **Batch insert optimization** — Competitor imports must use batch queries per Guardrail #13.

---

## Dependencies

### New Packages Required

| Package | Purpose | Phase |
|---------|---------|-------|
| `xlsx` (SheetJS) | Spreadsheet generation | Phase 1 |
| `papaparse` | CSV parsing for competitor imports | Phase 2 |
| `@react-native-google-signin/google-signin` | Google Drive authentication | Phase 4 |
| iCloud bridge (TBD) | iCloud storage access | Phase 5 |

### Existing Packages Used

| Package | Purpose |
|---------|---------|
| `expo-sharing` | Share sheet for export files |
| `expo-document-picker` | File selection for imports |
| `expo-file-system` | File I/O for cache directory |

---

## Design Constraints

- **Bottom sheets** for export/import source selection must use the same modal pattern as `WorkoutSettingsMenu` (full-screen presentation on Android, sheet on iOS).
- **Exercise mapping UI** should reuse `ExercisePickerView` from `src/components/widgets/ExercisePickerView.tsx` for the "choose different exercise" flow.
- **All import operations must be wrapped in a single SQLite transaction** — if any insert fails, the entire import rolls back cleanly.
- **Competitor imports are additive** (append to existing data). Native JSON restore is destructive (replaces all data). This distinction must be visually clear in the UI.
- **Weight conversion at import boundary** — All competitor weights are converted to canonical lbs via `toCanonicalWeight()` at parse time, consistent with the app's canonical storage architecture.
- **Maximum 600 lines** per component file (Guardrail #1, enforced post-completion). The import flow will likely need multiple screen components.
- **Batch inserts per Guardrail #13** — Competitor imports with hundreds of workouts must not use row-by-row insert loops. Use chunked batch inserts.
- **Double-tap guards per Guardrail #14** — Export, import, backup, and restore buttons must all be protected against concurrent invocation.
- **Cloud backup runs on a background thread** — Auto-backup after workout save must not block the UI or delay navigation away from the workout screen.
- **`EXPORT_TABLES` must stay in sync** — Any new table added by this phase's migration must be added to the ordered table list in `dataTransferService.ts`.

---

## Out of Scope (Future)

- **Backup versioning / history** — Only the latest cloud backup is stored. Version history is a future enhancement.
- **Cross-device sync** — This is backup/restore, not real-time sync. No conflict resolution needed.
- **PDF export** — Cut in favor of .xlsx which is more versatile and machine-readable.
- **Generic CSV mapping tool** — Users cannot define custom column mappings. Only the 5 supported competitor formats are parsed.
- **Selective import** — Users cannot cherry-pick which workouts to import. It's all-or-nothing per file.
- **Background auto-export to local storage** — Auto-backup only applies to cloud. Local exports are always user-initiated.
- **Multi-provider simultaneous backup** — V1 supports one cloud provider at a time.

---

## Resolved Design Decisions

1. **Two export formats, not three.** PDF was cut — .xlsx covers the "human-readable" need better (sortable, filterable, formattable) and JSON covers the "machine-readable" backup need. PDF adds complexity for minimal value.

2. **Competitor imports are additive, not destructive.** Users migrating from another app likely have some data already in this app. Wiping it to import would be hostile. Duplicate detection (same date + same exercises) is a future enhancement if needed.

3. **Single cloud backup file, not incremental.** The full JSON payload for even a heavy user (3+ years of daily workouts) is under 10MB. Incremental/delta sync adds enormous complexity for negligible bandwidth savings.

4. **Exercise mapping is semi-automatic.** Fully automatic mapping would silently create wrong associations. Fully manual mapping is tedious for 50+ exercises. The fuzzy-match-with-user-confirmation approach balances accuracy and speed.

5. **Cloud backup config is a separate table.** Not columns on `user_settings` because: (a) it's conceptually distinct, (b) it may need multiple rows for multi-provider support later, (c) `user_settings` is already wide with 25+ columns.

6. **Cloud backup uses JSON, not raw `.db`.** Reuses existing `ExportPayload` infrastructure, same validation and schema version checks as local backup. Simpler, more portable, and the payload size (<10MB even for power users) makes binary optimization unnecessary.

7. **Google Drive uses hidden App Data folder.** The `drive.appdata` scope restricts access to a hidden, app-specific folder. Users don't need to manage backup files — the "Last backed up" timestamp in Settings communicates status. The folder is auto-cleaned if the app is uninstalled.

8. **`cloud_backup_config` excluded from `EXPORT_TABLES`.** Cloud backup settings are device/account-specific. A user restoring a JSON backup on a new phone needs to re-authenticate with their cloud provider regardless.

9. **`exercise_notes` added to `EXPORT_TABLES`.** The v11 migration added this table but it was never added to the export list — this is a bug fix, not a new feature.

---

## Last Updated
- Date: 2026-04-23
- Session Context: Revised PRD — analyzed real CSV samples from Hevy, Strong, and FitNotes; mapped all columns to ParsedWorkout/ParsedSet/ParsedMeasurement types; removed GymWP and Fitbod (paid export); added measurement import support for Hevy and FitNotes; documented FitNotes .fitnotes export quirk; updated import UI for multi-file selection
