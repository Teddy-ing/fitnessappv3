---
description: Prioritized list of app improvements and feature requests from user testing
---

# App Improvement Backlog

## Priority Categories
- **P0 (Critical)**: Bugs affecting core functionality
- **P1 (High)**: Essential UX improvements for MVP
- **P2 (Medium)**: Important features that enhance experience
- **P3 (Low)**: Nice-to-haves, future considerations

---

## P0: Critical Bugs ✅ FIXED

### 1. ~~Timer only updates on actions~~ ✅
- **Fixed**: Added elapsedTime state with 1-second interval
- Timer now updates independently in real-time

### 2. ~~Cannot remove sets~~ ✅
- **Fixed**: Implemented swipe-to-delete using react-native-gesture-handler
- Swipe left on any set to reveal delete button

---

## P1: High Priority UX ✅ FIXED

### 3. ~~Color theme: Purple instead of blue~~ ✅
- **Fixed**: Changed accent from #3b82f6 (blue) to #a855f7 (purple)
- Added secondary purple #c084fc for hover states

### 4. ~~Rest timer notification~~ ✅
- **Fixed**: Added expo-notifications with local notification on timer complete
- Works when app is in background
- Permission request on app startup

### 5. ~~Custom numeric keyboard~~ ✅
- **Fixed**: Created `WorkoutKeyboard.tsx` component
- Tap weight/reps fields to open keyboard
- +5/-5 (or +1/-1 for reps) adjustment buttons
- "Next" button: weight → reps → complete set
- Purple accent on focused fields

---

## P2: Medium Priority Features

### 6. ~~Rename "Templates" → "Splits"~~ ✅
- **Fixed**: Implemented full Splits feature
- Browse Splits modal with create/delete
- Split = ordered list of templates
- Active split determines home screen templates
- Current Template card shows "next" workout

### 6b. ~~Template cycling in splits~~ ✅
- **Fixed**: Manual position switching via picker modal
- Date-based auto-advance (advances next day, not immediately)
- "Change" button on Current Template card

### 7. ~~Rest days in split creation~~ ✅
- **Fixed**: Added splits_schedule table for rest days
- "Add Rest Day" button in split creation
- Schedule preview shows templates + rest days
- Split cards show "X workouts · Y rest days"

### 8. Exercise management ✅ COMPLETE
- [x] Add custom exercises (full add/edit/delete flow)
- [x] Hide/unhide exercises (long-press menu, Hidden tab)
- [x] Filter by category (Strength/Cardio/Stretching tabs)
- [x] Favorites sort to top of list
- [x] Exercise images with placeholder

### 9. Set Variations UI ✅ COMPLETE
- [x] Set type selector (tap badge → action sheet)
- [x] Visual badges for set types (W/D/F/A with colors)
- [x] Row background colors per set type

### 10. Cardio & Stretching Support ✅ COMPLETE
- [x] Category tabs in exercise picker (All/Strength/Cardio/Stretch)
- [x] 14 cardio exercises added to seed data
- [x] 8 new equipment types for cardio machines

### 11. Improved rest timer UX (Strong-style)
- More specific details TBD
- Visual changes while keeping core functionality

---

## P3: Future Considerations

### 10. ML considerations for templates/splits
- **Question**: If user has templates, does ML still predict next workout?
- **Options**:
  - "I want to make templates" vs "go on the fly"
  - ML learns from template patterns
- **Decision needed before deep implementation**

### 11. On-the-fly split creation flow
- After workout: "Save to split?"
- If no split exists: "Create a split?"
- Small explanation of what splits mean

### 12. Cardio/mobility/warmup integration
- **Question**: Where does this fit in?
- Separate section? Same screen? Pre-workout?
- Needs brainstorming

### 13. ML: Sets per exercise
- Remember number of sets per specific workout
- Auto-suggest set count based on history

### 14. Remove "Recent Workouts" from home?
- User feedback: may not be necessary
- Revisit after template/split system is in place

---

## 🐛 Known Bugs

### BUG-001: Superset Unlink Causes Exercise to Disappear
- **Priority:** P1 (High)
- **Status:** Open
- **Symptom:** When unlinking a superset (clicking "🔗 Unlink" button), the first exercise in the superset visually disappears from the workout screen
- **Location:** 
  - `src/stores/workoutStore.ts` - `toggleSuperset` function
  - `src/screens/WorkoutScreen.tsx` - ExerciseCard rendering
  - `src/components/ExerciseCard.tsx` - superset styling (`cardInSuperset`)
- **Attempted Fixes:**
  - Improved immutability using `.map()` instead of array spread + index assignment
  - Did not resolve the issue
- **Investigation Notes:**
  - The toggleSuperset logic appears correct
  - May be a React key/rendering issue
  - May be related to the `cardInSuperset` styling removing margins incorrectly
  - Visible in user screenshot: large gray empty area where exercise should be
- **Next Steps:**
  - Add console.log debugging to trace state updates
  - Check if it's a styling issue vs actual data issue
  - Test if exercise still exists in state but just not rendering

---

## Suggested Order of Implementation (Updated 8-Phase Roadmap)

### ~~Phase 1-3: Foundation~~ ✅ COMPLETE
- ✅ Bug fixes (timer, set removal)
- ✅ Quick wins (purple theme, rest timer notification)
- ✅ Core UX improvements (custom keyboard, splits)
- ✅ Exercise management, set variations, cardio/stretching

### Phase 1: Visual Refactor 🔜
- App-wide UI/UX overhaul
- Modernize typography, spacing, colors, animations
- Polish navigation, cards, modals, interactive elements

### Phase 2: Widgets System
- Home screen widgets (current split, next workout, stats)
- Platform-specific widget implementations

### Phase 3: Analytics Functions & Profile Scoping
- Audit analytics data availability
- Design data aggregation layer
- Scope Profile vs dedicated analytics screens

### Phase 4: Profile Screen Refactor + Analytics Screens
- Redesign Profile screen with summary cards
- Progress charts, PR log, volume trends, muscle balance

### Phase 5: Settings
- User preferences (units, theme, timer, notifications)
- App configuration, privacy controls, ML toggles

### Phase 6: Import & Export
- Export (CSV, JSON, PDF)
- Import from Hevy, Strong, Fitnotes
- Backup/restore

### Phase 7: ML & Personalization
- Rep/weight autocomplete, workout day suggestions
- Smart rest timer, set count suggestions
- On-device only, privacy-first

### Phase 8: LLM Chatbot
- AI assistant in dedicated tab
- Preformatted + free-form queries with workout context
- Premium/paid tier feature

---

## Last Updated
- Date: 2026-02-20
- Session: Restructured roadmap with new 8-phase feature plan after month-long break
