---
description: Feature specifications, on-device ML concepts, and UX decisions
---

# Feature Design

## Workout Type Support (Beyond Weightlifting)

**Problem:** Most apps are weight-lifting focused. Users want to track:
- Strength/resistance training ✅ (core focus)
- **Warmups/stretching** (gap in market!)
- Mobility work
- Cardio (optional/secondary)
- Flexibility routines

### Warmup & Stretching Feature

**Why this matters:**
- No app does this well
- Critical for injury prevention
- Veterans and beginners both benefit
- Differentiator in the market

**Possible Implementation:**
- Warmup section at start of workout
- Stretching section at end (cooldown)
- Timed stretches (hold for 30s)
- Mobility exercises with rep tracking
- Optional—never forced

**UX Considerations:**
- Don't clutter the main logging flow
- Quick-add common warmups
- Maybe: suggest warmups based on today's workout muscles

---

## Onboarding Personalization

**Goal:** Tailor the app experience to what the user actually needs.

**Onboarding Questions (Optional):**
1. What are you here to track?
   - [ ] Strength/weight training
   - [ ] Stretching/mobility
   - [ ] Cardio
   - [ ] All of the above

2. How experienced are you?
   - [ ] New to the gym (show guidance)
   - [ ] Intermediate (some guidance)
   - [ ] Veteran (just let me track)

3. What equipment do you have access to?
   - [ ] Full gym
   - [ ] Home gym (select equipment)
   - [ ] Bodyweight only

**Result:** Adjust UI defaults, show/hide features, customize exercise suggestions.

**Critical:** Must be skippable with sensible defaults. Never block access.

---

## On-Device ML Features

**Core Philosophy:** Learn from user behavior to reduce friction, but NEVER feel intrusive or creepy.

### Autocomplete for Reps/Weight

**What it does:**
- Learns typical rep ranges for each exercise at each weight
- After entering weight, suggests likely rep counts
- Example: User enters 90lbs Bench Press → suggests 8, 10, 12 based on history

**UX Requirements:**
- \u2705 Extremely easy to accept (single tap)
- \u2705 Extremely easy to reject (tap elsewhere, type different number)
- \u2705 Easy to revert accidental accepts (undo or quick edit)
- \u2705 Option to start from 0 and increment if preferred
- \u2705 Non-blocking — suggestions don't slow down manual entry

**Implementation Notes:**
- Simple statistical model (not deep learning)
- Per-exercise, per-weight range buckets
- Confidence threshold before showing suggestions
- Recency weighting (recent patterns matter more)

---

### Workout Day Suggestions

**What it does:**
- Learns recurring patterns (e.g., "Monday is usually chest day with these exercises")
- On workout start, suggests the predicted workout
- User can accept, edit, or dismiss

**UX Requirements:**
- \u2705 Easy to accept (one tap, start workout)
- \u2705 Easy to decline (dismiss, choose different)
- \u2705 Easy to edit (accept but modify)
- \u2705 "Don't show this again" option for changed routines
- \u2705 Only suggest when confidence is high

**Edge Cases:**
- User completely changes routine → "Don't suggest this anymore"
- User on vacation / traveling → suggestions may not apply
- User doing different workout than predicted → no nagging

---

### Privacy & Control

**Critical Requirements:**
- \ud83d\udd12 **Explicit messaging**: "This data never leaves your device"
- \ud83d\udd12 **Toggle to disable**: Full on/off control for all ML features
- \ud83d\udd12 **Transparency**: Explain what is learned and how
- \ud83d\udd12 **No cloud dependency**: Works entirely offline
- \ud83d\udd12 **User owns their data**: ML models exportable with user data

---

## Cloud AI Features (Paid Tier)

### AI Chatbot Assistant

**Interface:**
- Dedicated chat page in app
- Preformatted query buttons for common requests
- Free-form text input for custom questions

**Preformatted Queries:**
- "Detect my weak points" — Analyze workout history for imbalances
- "Give me optimizations" — Suggest improvements to current routine
- "Create a template for [goal]" — Generate workout templates
- "Build me a 4-week plan" — Create periodized training plan

**Implementation Considerations:**
- Use cost-effective model (GPT-3.5, Claude Haiku, Llama, etc.)
- Rate limiting per user
- Caching common queries
- Context: Send workout history summary, not full raw data

---

## Splits & Template Cycling (Implemented)

### Splits System

**What it does:**
- Group multiple templates into a "split" (e.g., PPL, Upper/Lower)
- Active split determines which templates appear on home screen
- Each position in split can be a template or rest day

**Data Model:**
```typescript
type SplitScheduleItem = 
    | { type: 'template'; templateId: string }
    | { type: 'rest' };

interface Split {
    id: string;
    name: string;
    schedule: SplitScheduleItem[];
    // ...
}
```

### Template Cycling

**Current Template Tracking:**
- `currentTemplateIndex` stored in user preferences
- Shows "Current Template" card on home screen
- Tap to start that workout

**Manual Position Switching:**
- "Change" button opens picker modal
- User can jump to any position in split
- Useful for: starting mid-week, making up missed days

**Date-Based Auto-Advance:**
- When workout finishes → record today's date
- Next time app opens on a **different day** → advance to next template
- Skips rest days automatically
- Does NOT advance immediately after finishing (per user request)

---

## Data & Sync Features

### Export Capabilities

Multiple formats for maximum portability:
- CSV (Fitnotes-compatible)
- JSON (full fidelity)
- PDF (printable workout logs)

### Cloud Backup (Optional)

**Supported Providers:**
- Google Drive (Android-native)
- iCloud (iOS-native)
- Manual export/import as fallback

**Sync Approach:**
- User-initiated backup (not auto-sync initially)
- Clear UI showing last backup date
- Restore from backup on new device

---

## Feature Prioritization (Updated Roadmap)

### Phase 1: Visual Refactor
- App-wide UI/UX overhaul of all existing screens and components
- Modernize typography, spacing, color palette, and animations
- Polish navigation bar, cards, modals, and interactive elements
- Address UI debt accumulated during rapid feature development

### Phase 2: Widgets System
- **Home screen widgets** for quick workout access and at-a-glance info
- Current split / next workout widget
- Weekly volume or streak summary widget
- Quick-start workout widget
- Platform-specific implementations (Android widget API, iOS WidgetKit)

### Phase 3: Analytics Functions & Profile Screen Scoping
- Audit what analytics data is already available from existing workout/set tables
- Define key metrics: total volume, PR tracking, workout frequency, muscle group distribution
- Design the data aggregation layer (queries, caching strategy)
- Scope what belongs on the Profile screen vs dedicated analytics screens

### Phase 4: Profile Screen Visual Refactor + Analytics Screens
- Redesign Profile screen with summary analytics cards
- Create dedicated analytics screens:
  - Progress charts (weight/volume over time per exercise)
  - Personal records log
  - Volume trends (weekly, monthly)
  - Muscle group balance/heatmap
- Consistent design language with Phase 1 visual refactor

### Phase 5: Settings
- **User Preferences:**
  - Units (kg/lbs, km/miles)
  - Default rest timer duration
  - Theme customization
  - Notification preferences
- **App Configuration:**
  - Data management (clear data, database info)
  - About screen (version, licenses)
  - Privacy controls
- **ML Controls:**
  - Toggle on-device ML features
  - Clear ML data
  - Transparency about what is learned

### Phase 6: Import & Export
- **Export formats:**
  - CSV (Fitnotes-compatible for easy migration)
  - JSON (full fidelity, includes templates/splits/preferences)
  - PDF (printable workout logs)
- **Import from competitors:**
  - Hevy CSV/JSON import
  - Strong CSV import
  - Fitnotes CSV import
  - Generic CSV mapping tool
- **Backup/Restore:**
  - Manual export/import as primary mechanism
  - Optional cloud backup (Google Drive / iCloud) as stretch goal

### Phase 7: ML & Personalization *(see "On-Device ML Features" section above for full spec)*
- Implement rep/weight autocomplete based on exercise history
- Workout day suggestions from recurring patterns
- Smart rest timer defaults per exercise type
- Set count suggestions based on history
- All processing on-device, privacy-first

### Phase 8: LLM Chatbot Feature *(see "Cloud AI Features" section above for full spec)*
- AI chatbot assistant in dedicated tab
- Preformatted queries: weak points, optimizations, template generation, periodization
- Free-form conversation with workout history context
- Cost-effective model selection (Haiku, GPT-4o-mini, Llama, etc.)
- Rate limiting and response caching
- Premium/paid tier feature

---

## Last Updated
- Date: 2026-02-20
- Session Context: Restructured feature prioritization with new 8-phase roadmap after month-long break
