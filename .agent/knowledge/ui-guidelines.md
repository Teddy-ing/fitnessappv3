---
description: Visual design system, interaction patterns, and UX principles based on competitor analysis
---

# UI Design Guidelines

## Design Philosophy: The Frankenstein Method

Combine the best elements from the gold-standard apps:

| Inspiration Source | What to Steal | Why |
|--------------------|---------------|-----|
| **Hevy** | Visual design, dark mode, colors | Cleanest dark mode UI on market |
| **Strong** | Interaction patterns, checkmark flow | "Low click king" — 1 click = 3 actions |
| **Caliber** | Onboarding wizard, equipment selector | Doesn't dump users into empty spreadsheet |

---

## Visual Design (Steal from Hevy)

### Color Palette

**Dark Mode Primary (Default):**
- Background: Deep dark gray (not pure black)
- Cards: Slightly lighter gray
- Primary accent: Blue (for sets, interactive elements)
- Success/Completion: Green
- Text: White/off-white
- Secondary text: Gray

**Why these colors:**
- High contrast for visibility with sweat in eyes
- Distinct colors for different states
- Professional, modern feel

### Card-Based Layout

- Each exercise is a card
- Cards contain: exercise name, sets list, notes
- Clear visual hierarchy
- Swipe actions on cards (delete, reorder)

### Typography

- Large, readable fonts for weight/reps
- Clear at arm's length (phone on bench)
- High contrast

---

## Interaction Patterns (Steal from Strong)

### The Checkmark Flow

When user finishes a set and taps the checkbox:
1. ✅ Row fades/crosses out (visual confirmation)
2. ✅ Rest timer starts automatically
3. ✅ Cursor moves to next set
4. ✅ Next set pre-populated with suggested values

**Result: 1 click = 4 actions**

### Input Efficiency

- Tap weight → numpad appears
- Tap reps → numpad appears
- Large touch targets
- +/- buttons for quick adjustments
- Swipe to add set

---

## The Thumb Zone Rule 👍

> **90% of buttons must be in the bottom 30% of the screen.**

**Rationale:** Users should be able to log a set while holding a water bottle in the other hand.

### Layout Implications

- Navigation bar at bottom
- Primary action buttons at bottom
- Exercise cards scroll in middle area
- Only read-only info at top (workout title, timer)

### Primary Actions (Always Bottom)

- "Add Set" button
- "Complete Set" checkbox
- "Add Exercise" button
- Rest timer controls
- Submit/save actions

---

## Onboarding (Steal from Caliber)

### Equipment Selector Wizard

Don't dump users into an empty app. Ask:

1. **What are you here to track?**
   - Strength training
   - Stretching/mobility
   - Both

2. **Experience level?**
   - New to gym → Show guidance, suggest starter template
   - Intermediate → Balance of guidance and freedom
   - Veteran → Skip tutorials, show advanced features

3. **What equipment do you have?**
   - Full commercial gym
   - Home gym → Select specific equipment
   - Bodyweight only

4. **Build first workout** based on answers

### Skip Option

- Always allow "Skip" → sensible defaults
- Never block access to the app
- Can revisit settings later

---

## Exercise Cards

### Anatomy of an Exercise Card

```
┌─────────────────────────────────────────┐
│ 📋 Barbell Bench Press            [···] │  ← Header (name, menu)
├─────────────────────────────────────────┤
│  Set   Weight    Reps    ✓              │  ← Column headers
│   1    135 lbs    10    [✓]             │  ← Completed set (faded)
│   2    155 lbs    8     [✓]             │  ← Completed set
│   3    155 lbs    6     [ ]             │  ← Current set
│   4    ---        ---   [ ]             │  ← Empty set
├─────────────────────────────────────────┤
│  [+ Add Set]                            │  ← Bottom action
└─────────────────────────────────────────┘
```

### Set Row States

| State | Visual Treatment |
|-------|-----------------|
| Upcoming | Normal, full opacity |
| Current | Highlighted, cursor ready |
| Completed | Faded, checkmark filled, strikethrough optional |
| Warmup | Different color indicator (yellow?) |
| Failed | Red indicator |

---

## Rest Timer

### Behavior

- Starts automatically when set is completed
- Shows prominently but doesn't block interaction
- Vibrate/sound notification when timer ends
- Quick adjust buttons (+30s, -30s)
- Tap to dismiss early

### Visual

- Floating overlay or bottom sheet
- Large countdown numbers
- Visible from arm's length

---

## Screenshots Reference

> **Note for future sessions:** Attach screenshots of Hevy and Strong to this document for visual reference. Current knowledge is based on research, not direct visual inspection.

### To capture:
- [ ] Hevy: Main workout logging screen
- [ ] Hevy: Exercise card expanded
- [ ] Hevy: Dark mode color palette
- [ ] Strong: Checkmark flow
- [ ] Strong: Rest timer UI
- [ ] Caliber: Equipment selector wizard

---

## Accessibility Considerations

- Minimum touch target: 44x44 pts
- Color is never the only indicator (use icons too)
- Support system font scaling
- High contrast mode support
- Screen reader labels for all interactive elements

---

## Last Updated
- Date: 2026-01-04
- Session Context: Created from Frankenstein Method analysis and thumb zone rule
