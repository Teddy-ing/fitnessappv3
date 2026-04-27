---
description: Measurements feature spec — 3-tab architecture for body metrics tracking, trends visualization, and progress photo gallery
---

# Measurements Feature

> **Architecture note:** This spec aligns with the post-audit codebase (March 2026).
> See `conventions.md` for guardrails: 600-line component cap, typed DB rows, versioned migrations, hook extraction.

Profile-accessible measurement system with three tabs: Track (input), Trends (visualization), and Gallery (progress photos). Accessed via a Measurements button on the Profile screen, opens as a full-screen view within the Profile tab's navigation stack.

---

## Navigation & Layout

### Entry Point
Button on `ProfileScreen` → pushes `MeasurementsScreen` onto the Profile stack navigator.

### Top-Level Layout
```
MeasurementsScreen
  ├─ SegmentedControl (pill-shaped: Track | Trends | Gallery)
  └─ Tab Content (swappable view based on selected segment)
```

The segmented control is a custom pill-shaped component (not a tab navigator) — all three views share the same screen. Use `useState` to switch between them. Consider animating transitions with horizontal slide.

---

## Tab 1: Track (Input Screen)

The primary data entry surface. Must be fast and frictionless.

### Layout (top to bottom)

1. **Date selector** — current date displayed, tappable to pick a different date
2. **Add Progress Picture hero button** — large, prominent: `📸 Add Progress Picture`
   - Opens device camera or photo picker
   - Saved to local filesystem (no cloud)
   - Stored with date metadata for Gallery tab correlation
3. **Metric input list** — vertical list of visible measurement fields
4. **Manage Measurements button** — at the bottom

### Metric Input Fields

Each row displays:
- Metric name (e.g., "Bodyweight")
- Current/last value as placeholder hint
- Tappable → activates numerical input immediately (inline, no extra popup)

**Input method:** Reuse the existing `WorkoutKeyboard` component with a custom hook similar to `useWorkoutKeyboard.ts` (extracted pattern: focus state + keyboard value + dismiss logic). Tapping a metric row should focus that field and show the keyboard.

**Default metrics catalog:**

| Metric | Unit | Category |
|--------|------|----------|
| Bodyweight | lbs/kg | Core |
| Body Fat % | % | Core |
| Waist | in/cm | Torso |
| Chest | in/cm | Torso |
| Shoulders | in/cm | Torso |
| Hips | in/cm | Torso |
| Left Bicep | in/cm | Arms |
| Right Bicep | in/cm | Arms |
| Left Forearm | in/cm | Arms |
| Right Forearm | in/cm | Arms |
| Left Thigh | in/cm | Legs |
| Right Thigh | in/cm | Legs |
| Left Calf | in/cm | Legs |
| Right Calf | in/cm | Legs |
| Neck | in/cm | Other |

### Manage Measurements (Visibility Toggle)

"Manage Measurements" button opens a modal where users toggle on/off which metrics appear in the Track list. Each metric has an eye icon toggle.

- Visibility state stored in `user_settings.visible_measurements` column (TEXT, JSON array of type IDs)
- Read/write via `preferencesService.ts` (`getSettings()` / `updateSettings()`)
- Parse with `safeJsonParse()` from `hydration.ts` to protect against corrupt data
- If a user only cares about bodyweight and waist, they configure this once and never scroll past irrelevant fields

---

## Tab 2: Trends (Visualization Screen)

Solves the "hidden data" problem — users should see trends at a glance without tapping into individual metrics.

### Default View: Sparkline List

On load, displays a vertical list of all **visible** (toggled-on) metrics. Each row shows:

```
┌──────────────────────────────────────────┐
│  Bodyweight          ~~~~~~~~~~~~  183.2 │
│  Body Fat %          ~~~~~~~~~~~~   14.1 │
│  Waist               ~~~~~~~~~~~~   32.5 │
│  Chest               ~~~~~~~~~~~~   42.0 │
└──────────────────────────────────────────┘
```

- Left: metric name
- Center: sparkline (miniature line graph, last 90 days of data)
- Right: most recent logged value

**Sparkline rendering:** Use a lightweight SVG path or a charting library (e.g., `react-native-svg` for custom sparklines, or `victory-native` for full charts). Sparklines should be simple, no axes, just the trend line in `colors.accent.primary`.

### Deep Dive: Full Chart View

Tapping a sparkline row expands into a **full-screen detailed graph**:

- Full-width line chart with purple aesthetic (`colors.accent.primary` line, gradient fill under curve)
- X-axis: dates, Y-axis: values
- Time range selector: 1M / 3M / 6M / 1Y / All
- Data points as tappable dots showing exact value and date
- Pinch-to-zoom on the x-axis for date range exploration

### Relative Strength Overlay (Unique Feature)

On the **Bodyweight chart only**, include a toggle: `"Overlay 1RM"`.

When active:
- Overlays a second line showing the user's estimated 1RM for a selected lift (default: Bench Press, configurable)
- Both lines share the time axis but have dual y-axes (left: bodyweight, right: 1RM)
- **Insight:** If bodyweight goes down but 1RM stays flat or rises → relative strength gain
- Lift selector: dropdown to switch between exercises that have sufficient history

**1RM calculation:** Epley formula: `1RM = weight × (1 + reps / 30)`. Computed from the heaviest working set per exercise per workout from `workout_sets`.

**Data source:** Join `workouts` → `workout_exercises` → `workout_sets`, filter by exercise, compute max estimated 1RM per workout date.

---

## Tab 3: Gallery (Progress Photos)

Local-only photo storage — zero cloud cost, a differentiator over competitors.

### Photo Grid

Chronological grid layout (3 or 4 columns, similar to native Photos app):
- Each photo shows a small overlay badge in the corner with:
  - **Date** (e.g., "Mar 1")
  - **Bodyweight** on that date (from measurements data)
- Tapping a photo opens it full-screen with swipe navigation

### Compare Feature

When the user **selects two photos** (long-press to enter selection mode, tap to select second):
- App displays them in a **side-by-side split view**
- Both photos are vertically aligned, same height
- Date and bodyweight displayed below each photo
- Enables visual comparison of progress across months

### Photo Storage

Photos are stored on the local filesystem under the app's document directory:
- Path: `${FileSystem.documentDirectory}progress_photos/`
- Filename convention: `{YYYY-MM-DD}_{timestamp}.jpg`
- Metadata (date, associated measurement ID) stored in the `progress_photos` DB table

---

## Schema Impact

### New tables

```sql
-- Measurement definitions (catalog of available metrics)
CREATE TABLE IF NOT EXISTS measurement_types (
    id TEXT PRIMARY KEY,          -- e.g., 'bodyweight', 'chest', 'left_bicep'
    name TEXT NOT NULL,           -- Display name: 'Bodyweight', 'Chest'
    category TEXT NOT NULL,       -- 'core', 'torso', 'arms', 'legs', 'other'
    unit_imperial TEXT NOT NULL,  -- 'lbs', 'in', '%'
    unit_metric TEXT NOT NULL,    -- 'kg', 'cm', '%'
    default_visible INTEGER DEFAULT 0,  -- Whether shown by default
    order_index INTEGER NOT NULL  -- Sort order in the Track list
);

-- Measurement log entries (user-recorded values)
CREATE TABLE IF NOT EXISTS measurements (
    id TEXT PRIMARY KEY,
    measurement_type_id TEXT NOT NULL,
    value REAL NOT NULL,
    recorded_at TEXT NOT NULL,    -- ISO date string
    note TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (measurement_type_id) REFERENCES measurement_types(id)
);

-- Progress photos
CREATE TABLE IF NOT EXISTS progress_photos (
    id TEXT PRIMARY KEY,
    file_path TEXT NOT NULL,      -- Relative path under documentDirectory
    recorded_at TEXT NOT NULL,    -- Date the photo represents
    bodyweight REAL,             -- Snapshot of bodyweight on that date (denormalized for overlay)
    note TEXT,
    created_at TEXT NOT NULL
);
```

### Indexes

```sql
CREATE INDEX idx_measurements_type_date ON measurements(measurement_type_id, recorded_at);
CREATE INDEX idx_measurements_recorded_at ON measurements(recorded_at);
CREATE INDEX idx_progress_photos_recorded_at ON progress_photos(recorded_at);
```

### New `user_settings` columns (via migration)

| Column | Type | Default |
|--------|------|---------|
| `visible_measurements` | `TEXT` | `'["bodyweight","body_fat","waist","chest"]'` |
| `relative_strength_exercise` | `TEXT` | `NULL` |

Unit system already exists: `user_settings.weight_unit` and `user_settings.distance_unit`.

Add columns in a new versioned migration in `migrations.ts`. Extend `UserSettings` interface and `DEFAULTS` in `preferencesService.ts`.

---

## Component Architecture

```
ProfileScreen
  └─ MeasurementsScreen (stack navigation push)
       ├─ SegmentedControl (Track | Trends | Gallery)
       │
       ├─ TrackTab
       │    ├─ DateSelector
       │    ├─ AddPhotoHero → camera/picker
       │    ├─ ErrorBoundary (wraps input list)
       │    │    └─ MetricInputList
       │    │         └─ MetricInputRow (per visible metric)
       │    └─ ManageMeasurementsButton → ManageMeasurementsModal
       │
       ├─ TrendsTab
       │    ├─ ErrorBoundary (wraps chart list)
       │    │    └─ SparklineList
       │    │         └─ SparklineRow (metric name + sparkline + current value)
       │    └─ DetailChartView (full-screen expanded chart)
       │         └─ RelativeStrengthOverlay (bodyweight chart only)
       │
       └─ GalleryTab
            ├─ PhotoGrid
            │    └─ PhotoCell (thumbnail + date/weight badge)
            ├─ PhotoViewer (full-screen with swipe)
            └─ CompareView (side-by-side split)
```

### Hooks (convention: extract when 3+ useState for one concern)
- `useMeasurementInput(date)` — manages keyboard focus state, current metric, value entry
- `useSparklineData()` — fetches and caches sparkline data for visible metrics
- `usePhotoGallery()` — manages photo loading, selection mode, comparison pair

---

## Service Layer

New service file: `src/services/measurementService.ts`

**Required functions:**
- `getMeasurementTypes()` → returns all measurement type definitions
- `getVisibleMeasurementTypes()` → filtered by user's visibility settings (reads `user_settings.visible_measurements` via `preferencesService`)
- `logMeasurement(typeId, value, date)` → inserts a new measurement entry
- `getMeasurementHistory(typeId, startDate?, endDate?)` → returns time-series data for charts
- `getLatestMeasurements()` → returns most recent value per visible metric
- `getSparklineData(typeId, days?)` → returns simplified data points for sparkline rendering (default 90 days)
- `getEstimated1RM(exerciseId, startDate?, endDate?)` → computes 1RM time-series from workout history

**Data layer conventions:**
- Define typed row interfaces for all query results (e.g., `MeasurementRow`, `MeasurementTypeRow`). Never use `any`.
- Use `safeJsonParse()` from `hydration.ts` for any JSON columns.

New service file: `src/services/photoService.ts`

**Required functions:**
- `saveProgressPhoto(imageUri, date)` → copies photo to app storage, creates DB entry
- `getProgressPhotos(startDate?, endDate?)` → returns photo metadata for grid
- `deleteProgressPhoto(photoId)` → removes from filesystem and DB
- `getPhotoWithBodyweight(photoId)` → returns photo metadata with associated bodyweight value

---

## Dependencies

| Package | Purpose | Notes |
|---------|---------|-------|
| `react-native-svg` | Sparklines and custom chart rendering | Lightweight, already common in RN ecosystem |
| `victory-native` or `react-native-chart-kit` | Full detailed charts | Evaluate bundle size vs features |
| `expo-image-picker` | Camera/photo picker for progress photos | Already available in Expo |
| `expo-file-system` | Local photo storage management | Already available in Expo |

---

## Cross-Feature Dependencies

- **Calendar feature:** Measurement dates could be shown as secondary indicators on the calendar heatmap (e.g., small dot when a measurement was logged that day)
- **Widget system:** "Body Weight" widget on home screen will pull from `measurements` table once this feature exists
- **Profile screen:** Summary stats (current weight, weight change) will source from measurement history
