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

## Visual Design (Premium Dark Theme)

### Color Palette

**Background Colors (Zinc Scale):**

| Token | Value | Usage |
|-------|-------|-------|
| `background.primary` | `#09090b` (zinc-950) | Main background - deepest black |
| `background.secondary` | `#18181b` (zinc-900) | Card backgrounds |
| `background.tertiary` | `#27272a` (zinc-800) | Elevated surfaces, inputs |

**Text Colors (Zinc + White):**

| Token | Value | Usage |
|-------|-------|-------|
| `text.primary` | `#ffffff` | Headings, primary text |
| `text.secondary` | `#a1a1aa` (zinc-400) | Body text, descriptions |
| `text.disabled` | `#52525b` (zinc-600) | Disabled/placeholder text |

**Accent Colors (Violet-Purple Gradient):**

| Token | Value | Usage |
|-------|-------|-------|
| `accent.primary` | `#a855f7` (violet-500) | Primary brand color, CTAs |
| `accent.secondary` | `#9333ea` (purple-600) | Gradient end, pressed states |
| `accent.tertiary` | `#c084fc` (violet-400) | Hover states, highlights |
| `accent.success` | `#22c55e` | Completion, PRs |
| `accent.warning` | `#f59e0b` | Warmup sets |
| `accent.error` | `#ef4444` | Failed sets, errors |

**Gradient Configuration:**

```typescript
gradient: {
    primary: ['#a855f7', '#9333ea'], // Left-to-right gradient for buttons
    glow: 'rgba(168, 85, 247, 0.3)', // Purple glow for shadows
}
```

**Glassmorphism / Surface Colors:**

```typescript
glass: {
    background: 'rgba(24, 24, 27, 0.6)',   // Semi-transparent zinc-900
    border: 'rgba(255, 255, 255, 0.1)',    // Subtle white border
    borderLight: 'rgba(255, 255, 255, 0.05)', // Very subtle border
}
```

**Decorative Blur Orb Colors:**

```typescript
decorative: {
    purpleOrb: 'rgba(168, 85, 247, 0.2)', // Purple ambient glow
    blueOrb: 'rgba(59, 130, 246, 0.1)',   // Blue accent glow
}
```

### Typography (Premium Weights)

- **Font Inspiration:** Plus Jakarta Sans (web reference)
- **Weights:** Prefer bold (700) for headings, semibold (600) for emphasis
- **Tracking:** Negative letter-spacing (-0.5) for large titles
- **Line Height:** Tight (1.2) for headings, relaxed for body text
- Large, readable fonts for weight/reps
- Clear at arm's length (phone on bench)
- High contrast

### Border Radius Scale

| Token | Value | Usage |
|-------|-------|-------|
| `sm` | 4px | Small elements, badges |
| `md` | 8px | Inputs, small buttons |
| `lg` | 12px | Cards, standard elements |
| `xl` | 16px | Large cards |
| `2xl` | 20px | **Premium:** Primary buttons, glass cards |
| `3xl` | 24px | **Premium:** Hero elements |
| `full` | 9999px | Pills, circular buttons |

---

## Component Patterns

### Gradient Primary Button

The main CTA uses a horizontal gradient with a glow effect:

```tsx
<TouchableOpacity style={styles.gradientButtonContainer}>
    <LinearGradient
        colors={colors.gradient.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradientButton}
    >
        <Text style={styles.primaryButtonText}>Start Empty Workout</Text>
    </LinearGradient>
</TouchableOpacity>
```

**Styling requirements:**
- `borderRadius: 20` (2xl)
- `overflow: 'hidden'` on container
- Shadow with `shadowColor: colors.accent.primary`
- `shadowOpacity: 0.3`, `shadowRadius: 12`
- Subtle white border: `borderColor: colors.glass.borderLight`

### Glassmorphism Cards

Semi-transparent cards with subtle borders for premium feel:

```tsx
glassCard: {
    backgroundColor: colors.glass.background,  // rgba(24, 24, 27, 0.6)
    borderRadius: borderRadius['2xl'],         // 20px
    borderWidth: 1,
    borderColor: colors.glass.border,          // rgba(255, 255, 255, 0.1)
    padding: spacing.md + 4,
}
```

**Glass card labels:** Uppercase, 10px font, letter-spacing: 1.5, bold weight. Use purple (`#a855f7`) for Template labels and blue (`#3b82f6`) for Split labels.

### Date/Status Badges

Small pill-shaped badges for metadata:

```tsx
historyDateBadge: {
    backgroundColor: colors.glass.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
}
historyDateText: {
    color: colors.text.secondary,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
}
```

### Bottom Navigation Bar

Custom tab bar with raised center icon:
- **Background:** Match main background (`colors.background.primary`)
- **Separator:** Purple gradient line at top (`#a855f7` → `#4c1d95` → `#a855f7`)
- **Center button:** Raised purple oval with shadow
- **Icons:** Emoji for now, to be replaced with icon library

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

## Device-Specific Considerations

### Bottom Navigation Overlap

Different devices have different system navigation styles. The app must handle:

| Navigation Type | Description | Handling |
|-----------------|-------------|----------|
| **Gesture Navigation** | Swipe-up bar at bottom | Use `useSafeAreaInsets()` |
| **3-Button Navigation** | Always-visible Home/Back/Recent | Add bottom padding |
| **Physical Buttons** | Older devices with hardware buttons | Minimal padding needed |

**Implementation:** Use `react-native-safe-area-context` to dynamically calculate bottom padding.

### Platform Differences

| Platform | Considerations |
|----------|----------------|
| **Android** | Various manufacturers, screen sizes, navigation styles |
| **iOS** | Home indicator on newer iPhones, notch handling |

**Testing needed:**
- [ ] Test on Android with gesture navigation (S25 confirmed)
- [ ] Test on Android with 3-button navigation
- [ ] Test on iPhone with home indicator
- [ ] Test on older iPhone with home button

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

> Screenshots of Hevy and Strong have been added to `.agent/reference/` for visual reference.

### Available:
- [x] Hevy: Multiple screens (homescreen, workout, exercise detail, statistics, profile)
- [x] Strong: Template and workout screens

### Still needed:
- [ ] Caliber: Equipment selector wizard
- [ ] iOS device screenshots for comparison

---

## TODO: Custom Navigation Icons

> **Priority:** Medium (polish item)

Replace emoji icons in bottom navigation with custom icons:
- Consider `react-native-vector-icons` (large library, many icon sets)
- Or custom SVG icons for unique brand identity
- Icons should be simple, recognizable at small sizes
- Match the dark theme color scheme

**Icon requirements:**
- Assistant: Robot/AI chat icon
- Workout: Dumbbell or flexed arm
- Profile: User silhouette

---

## Accessibility Considerations

- Minimum touch target: 44x44 pts
- Color is never the only indicator (use icons too)
- Support system font scaling
- High contrast mode support
- Screen reader labels for all interactive elements

---

## Last Updated
- Date: 2026-01-13
- Session Context: Major visual upgrade - integrated Google Stitch premium design with glassmorphism cards, gradient buttons, decorative blur orbs, and comprehensive color system documentation
