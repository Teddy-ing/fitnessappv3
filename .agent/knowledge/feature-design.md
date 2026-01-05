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

## Feature Prioritization

### MVP (v1.0)
- [ ] Core workout logging
- [ ] Exercise database
- [ ] Template system
- [ ] Basic analytics
- [ ] Export (CSV, JSON)

### v1.1 (Post-Launch)
- [ ] On-device ML autocomplete
- [ ] Workout day suggestions
- [ ] Import from competitors

### v1.2+
- [ ] Cloud backup (Google/iCloud)
- [ ] AI chatbot (paid tier)
- [ ] Advanced analytics

---

## Last Updated
- Date: 2026-01-04
- Session Context: Captured on-device ML concepts and AI tier features from brainstorming
