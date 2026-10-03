---
description: User personas, audience prioritization, and feature needs by user type
---

# Target Users

## Current update — 2026-10-02

The audience order below still guides IronJot: experienced lifters first, intermediates second, and beginners through optional support.

- Experienced lifters can skip setup and the tutorial, start an empty workout, or build their own templates and split. Setup does not assign them a starter plan.
- Intermediates can opt into a suggested routine. Beginners receive a suggested starting plan by default and can decline it. Both can edit their own training afterward.
- The optional quick-start tutorial covers starting, logging, and finding completed workouts; its experienced-lifter path starts with creating a split.
- Exercise details include offline illustrations and instructions. These are still images, not exercise videos.
- Local logging needs no account or payment. Optional Google Drive backup is a separate choice.

The personas and priorities below are retained from **2026-01-04**. They describe intended users and design goals, not measured user research or acceptance-test results. The two named modes near the end remain an early concept; the implemented app uses optional setup and tutorial flows instead of a mode switch.

## Audience Prioritization

**Primary → Secondary → Tertiary**

1. **Veterans** (Primary) — Build for them first
2. **Intermediates** (Secondary) — They benefit from veteran-first design
3. **Beginners** (Tertiary) — Layer guidance on top, never at expense of core UX

### Rationale

Veterans are:
- Hardest to please → if we satisfy them, others follow
- Most vocal advocates → organic growth through recommendations
- Clearest about what they need → less guesswork in design
- Most likely to switch from Fitnotes → direct market capture

## User Personas

### 1. The Veteran ("Just Let Me Lift")

**Profile:**
- 3+ years of consistent training
- Knows their program, exercises, and progression
- Has used multiple apps, frustrated with all of them
- Currently on Fitnotes or spreadsheets

**Primary Needs:**
- Absolute minimum friction logging
- Deep customization
- Comprehensive analytics
- Export/import capabilities

**Pain Points:**
- Forced onboarding and tutorials
- AI trying to "help" when not asked
- Slow UI with unnecessary animations
- Subscription costs for basic features

**Success Metric:** "This is faster than my spreadsheet"

---

### 2. The Intermediate ("Show Me I'm Progressing")

**Profile:**
- 6 months - 2 years of training
- Has a routine but tweaks it
- Wants validation that they're improving
- May follow a program (5/3/1, PPL, etc.)

**Primary Needs:**
- Template management
- Progressive overload tracking
- Clear progress visualization
- Flexibility to modify on the fly

**Pain Points:**
- Apps that are too rigid
- Unclear if they're actually improving
- Complicated template editors

**Success Metric:** "I can see I'm getting stronger"

---

### 3. The Beginner ("What Should I Do?")

**Profile:**
- New to the gym (< 6 months)
- Learning exercises and form
- May not have a program yet
- Intimidated by complexity

**Primary Needs:**
- Guidance without judgment
- Pre-built starter templates
- Exercise instructions/videos
- Simple, encouraging interface

**Pain Points:**
- Overwhelming options
- Assumed knowledge
- No clear "start here" path

**Success Metric:** "I completed a workout and know what to do next time"

---

## Feature Mapping by User Type

| Feature                       | Veteran    | Intermediate | Beginner |
|-------------------------------|------------|--------------|----------|
| Quick logging (no friction)   | ⭐ Critical| Important    | Nice |
| Custom templates              | ⭐ Critical| ⭐ Critical | Later |
| Pre-built templates           | Nice       | Important    | ⭐ Critical |
| Progressive overload tracking | ⭐ Critical| ⭐ Critical | Later |
| Analytics/graphs              | ⭐ Critical| Important   | Nice |
| Exercise instructions         | Rarely     | Sometimes    | ⭐ Critical |
| Rest timer                    | Important  | Important    | Important |
| Import/export                 | ⭐ Critical| Important    | Rarely |
| Beginner guidance mode        | Never      | Rarely       | ⭐ Critical |

---

## Original mode concept — 2026-01-04

Consider offering two entry points:

**"Just Let Me Lift" Mode:**
- Skip all onboarding
- Drop straight into logging
- Assume user knows what they're doing
- All features available, no handrails

**"Help Me Start" Mode:**
- Guided onboarding
- Starter template suggestions
- Tooltips and explanations
- Gradual feature revelation

User can switch between modes at any time.

---

## Document history

- **2026-01-04:** Original personas and audience priorities.
- **2026-10-02:** Current setup, tutorial, and exercise-guidance behavior documented.
