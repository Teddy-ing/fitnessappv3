---
description: Phase 7 Smart Personalization — Product Requirements Document
---

# Phase 7: Smart Personalization PRD

## Overview

Build a statistical personalization engine that learns from the user's workout history to provide intelligent defaults across the app. All processing on-device, no cloud dependency, no ML framework — pure SQL queries and lightweight JS statistics.

## Core Philosophy

> "The more you use it, the more it adapts to you — while staying 100% private."

The system should feel invisible: suggestions appear naturally as ghost text, rest timers auto-calibrate, exercise counts match the user's habits. Users shouldn't need to think about it — they just notice over time that the app "knows them."

---

## Features

### Tier 1: High Impact

#### 1. Weight & Rep Autocomplete
- **Trigger:** User adds exercise to workout (or starts from template)
- **Display:** Ghost placeholder text in weight/reps input fields (dimmed, per-set-position)
- **Accept:** Tap ✓ to complete set auto-fills from suggestion; typing any value replaces silently
- **Algorithm:** Exponential-decay weighted linear regression on exercise history
  - Weight: extrapolate trend from last 20 sessions
  - Reps: weighted average at predicted weight (±5% range)
  - Safeguards: cap at 1 weight increment above best recent; R² < 0.3 falls back to repeat-last
  - Training phase aware: 'cut'/'recovery' suppresses progression suggestions
- **Confidence:** Only show after ≥ 3 sessions of direct history for this exercise
- **Coexists with Previous column** (Previous shows literal last session; suggestion shows predicted next)

#### 2. Smart Rest Timers
- **Trigger:** User completes a set
- **Behavior:** Rest timer starts with exercise-specific learned duration instead of global default
- **Algorithm:** Average of rest_duration from last 50 sets, filtering out < 30s and > 600s outliers
- **Fallback:** Global `defaultRestTime` when < 5 data points
- **Rounding:** Nearest 15 seconds

### Tier 2: Medium Impact

#### 3. Exercise Suggestions
- **Trigger:** User taps "Replace Exercise" or "Add Exercise"
- **Display:** "Suggested" section at top of ExercisePicker (before favorites)
- **Signals:**
  - Co-occurrence: exercises commonly done in same workout
  - Muscle group + personal frequency: same primary muscle, ranked by user's usage
- **Context-aware:** 'replace' prioritizes co-occurrence; 'add' prioritizes frequency

#### 4. Set Count Prediction
- **Trigger:** User adds exercise to active workout
- **Behavior:** Creates the number of working + warmup sets they typically do (instead of global default)
- **Algorithm:** Mode of set counts from last 5 sessions
- **Fallback:** User's `defaultSetsPerExercise` setting

#### 5. Progressive Overload Nudges
- **Trigger:** Exercise has been at same weight × same-or-higher reps for 3+ consecutive sessions
- **Display:** Small banner above exercise card: "You've hit 185×8 for 3 sessions — ready for 190?"
- **Action:** Tap to auto-fill all working sets with suggested weight
- **Setting:** Off by default (`showProgressionNudges`), can be enabled in settings. On by default for beginner users when onboarding is implemented.

### Tier 3: Low Priority (End of Phase)

#### 6. Warmup Weight Ladder
- **Trigger:** Exercise has warmup sets and a working weight suggestion
- **Behavior:** Suggest progressive warmup weights (e.g., 60%, 80% of working weight)
- **Algorithm:** Default percentages [0.50, 0.70, 0.85], or learned from user's actual warmup patterns

---

## Cross-Exercise Intelligence

### Strength Profile
Computed from all workout history, stored as JSON on `user_settings`:
- Per-muscle-group estimated strength level (normalized 1RM)
- Per-muscle-group growth rate (lbs/week from regression)
- Plateau detection per exercise

### Exercise Relationship Ratios
Static lookup table (~15 compound pairs to start):
- Maps biomechanical relationships (e.g., barbell bench ≈ 1.43× dumbbell bench pair)
- Used to bootstrap predictions for new exercises

### Bootstrap Algorithm
When user tries a new exercise with < 3 sessions of history:
- Look up primary muscle group → get strength profile
- Estimate starting weight from muscle group strength + exercise ratio
- **Display as Option C:** info badge/tooltip ("~225 lbs estimated from your chest pressing history"), NOT ghost text
- After 3 sessions of direct data: fade out cross-exercise estimate, use direct history only

---

## Settings

| Setting | Location | Default |
|---------|----------|---------|
| Smart Suggestions (master toggle) | Workout Settings | OFF |
| Show Progression Nudges | Workout Settings | OFF |
| Training Phase | General Settings | Maintain |

### Training Phase
Segmented control: Bulk / Cut / Maintain / Recovery
- Affects prediction behavior:
  - **Bulk:** Allow progressive weight suggestions
  - **Cut:** Suppress weight increases, allow rep maintenance
  - **Maintain:** Repeat-last bias, minimal progression
  - **Recovery:** Lower confidence, conservative suggestions

---

## Data Architecture

### No New Tables
All predictions computed from existing `workout_sets`, `workout_exercises`, `workouts` tables.

### New Columns (v17 migration)
- `user_settings.training_phase TEXT DEFAULT 'maintain'`
- `user_settings.strength_profile TEXT` (JSON blob)

### New Column (v18 migration)
- `user_settings.show_progression_nudges INTEGER DEFAULT 0`

### New Service Files
- `smartSuggestionsService.ts` — prediction engine
- `strengthProfileService.ts` — profile computation + caching
- `exerciseRelationships.ts` — static ratio table

### Suggestion Caching
- Computed once when exercise is added to workout (or on template start)
- Stored in Zustand workoutStore (runtime only, not persisted)
- Not recomputed on every keystroke

---

## Privacy & Control

- 🔒 All processing on-device (SQL queries against local SQLite)
- 🔒 Master toggle to disable all suggestions
- 🔒 Data never leaves device
- 🔒 Strength profile included in JSON export (user owns their data)
- 🔒 Training phase set by user, not inferred

---

## AI Chatbot Bridge (Phase 8)

The Strength Profile computed here becomes context for the Phase 8 AI chatbot:
- Chatbot reads profile for conversation context
- Chatbot can present profile in human-readable narrative
- User annotations from chatbot (subjective assessments) can feed back into profile
- **The AI chatbot never writes data that drives free-tier suggestions**

---

## Last Updated
- Date: 2026-05-19
- Session Context: Phase 7 brainstorming and planning session
