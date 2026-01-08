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

### 8. Exercise management
- Add custom exercises
- Hide/unhide exercises
- Filter by equipment (home gym, bodyweight, etc.)
- "Show all" to view hidden exercises

### 9. Exercise images
- Placeholder images for now
- Show in exercise picker
- Show in workout view
- TBD: actual image source

### 10. Improved rest timer UX (Strong-style)
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

## Suggested Order of Implementation

### Phase 1: Bug Fixes (Do First)
1. ✅ Fix workout timer not updating
2. ✅ Add ability to remove sets

### Phase 2: Quick Wins
3. ✅ Change color theme to purple
4. ✅ Rest timer notification

### Phase 3: Core UX Improvements
5. Custom numeric keyboard
6. Rename templates → splits (terminology + basic restructure)

### Phase 4: Content & Features
7. Exercise management (add/hide)
8. Exercise images (placeholders)

### Phase 5: Design Decisions
9. ML + template strategy decision
10. Split flow design
11. Cardio/mobility brainstorm

---

## Reference Materials Needed
- [ ] Screenshot of Strong keyboard
- [ ] Screenshot of Samsung base keyboard
- [ ] Current color values to change

---

## Last Updated
- Date: 2026-01-06
- Session: User testing feedback consolidation
