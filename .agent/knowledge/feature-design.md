---
description: Feature specifications, on-device ML concepts, and UX decisions
---

# Feature Design

## Navigation ownership and return paths — 2026-10-01

- Workout and Profile each own a native stack. Register shared ExerciseDetails, Settings and ExerciseMapping screens in both stacks and navigate within the caller's stack. Normal Back pops that screen. Switching tabs to simulate Back left stale Profile routes and caused the reported exercise-information trap.
- Keep WorkoutHome mounted when opening information so workout state and input context survive. Tab visibility follows the selected stack and active workout state. Screen-specific Back handlers, including the custom workout keyboard, must only run while their screen is focused.
- Use `navigateToWorkoutHome()` for explicit start/edit-workout actions. It returns to the existing WorkoutHome route without resetting Profile, preserving Calendar or analytics context for the eventual return. Ordinary tab selection preserves each tab's location.
- Nested editors handle Android Back in the same order as visible Back controls: dismiss the inner picker/detail first, then the editor. Photo viewers expose native modal close handlers. Import review uses a stable original queue and blocks leaving while saving; file picking/parsing also blocks dismissal to prevent a late result from navigating unexpectedly.
- Route types live in `src/navigation/types.ts`; regression coverage in `src/navigation/__tests__/routing.test.tsx` uses the actual navigator registrations and installed routers. Keep shared screen registration and entry-point tests together when adding routes.

## Exercise illustration library — 2026-10-01

- The owner approved the original grey humanoid and coral muscle treatment in the bench/squat/curl pilot, then requested expansion to every built-in exercise. Coverage is tracked in `assets/exercises/library-manifest.json`; the target is all 114 current seed IDs.
- Use the original curl image as the fixed model/style reference. The pilot prompts live in `assets/exercises/generation-spec.json`; each production image has its exact prompt, corrections, hash and review in `assets/exercises/records/<id>.json`. The reusable process is in `../workflows/exercise-illustrations.md`. Each new pose needs independent visual review because image generation can drift or produce plausible mechanical errors.
- Render reviewed assets in exercise information's shared About tab as a responsive square card capped at 380 layout units. Static assets keyed by stable built-in exercise ID support existing installations and offline builds without schema changes. Explicit image URLs take precedence; custom or unknown exercises retain their supplied image or category icon.
- Preserve full-size source PNGs for future work and bundle quality-90 JPEG copies at the same dimensions. This substantially reduces the offline library size. `scripts/exercise-art.cjs` creates the registry and verifies exact ID coverage and source/output hashes; package only independently reviewed records.
- Coral denotes visible primary target muscles, not measured activation. For stretches it marks target regions. Deep or clothing-covered muscles remain uncolored. These are representative stills with descriptions naming the visible phase; motion demonstrations would need additional reviewed poses or a rig.

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

**Current decision (2026-09-30):** The owner approved the flow. Completion now applies preferences and can choose a starting plan. This supersedes the collection-only first release.

**Flow:** Welcome → units → experience → training phase → primary goal → routine → review.

- Units: weight, distance, body measurements, each independently selectable.
- Experience: beginner, intermediate, advanced.
- Phase: bulk, cut, maintain, recovery, or unsure.
- Goal: strength, muscle, general fitness, or endurance.
- Routine: training days per week and gym/home/both. Home and both reveal an equipment checklist; bodyweight-only is an explicit answer and differs from unanswered.
- Every answer is optional. Empty answers remain unanswered, never inferred as user choices.
- Explain local storage, account-free use, and optional Google Drive backup. No sign-in, paywall, personal identifiers, or body measurements are requested.
- New installs see setup; skip suppresses automatic reopening, drafts resume, and review allows correction before completion. There is no onboarding entry in Settings, per the owner's request.
- Completion applies selected weight/distance/measurement units and a specified training phase; blank answers and unsure phase preserve current values. Weight records stay canonical pounds; this changes input/display preferences, not stored workout numbers.
- Version 2 of the profile retains experience, goal, frequency, location and equipment for plan selection. An application timestamp prevents repeat application after relaunch or backup restore. Version 1 profiles still load, and completed collection-only profiles are applied once on startup. Drafts/skips never apply.
- Create a personal copy of the accepted plan in the same transaction as preference application and completion. Preserve any active split already selected. Failure rolls back all plan and preference writes, and repeated completion cannot duplicate a routine.
- Include the profile in full JSON and optional cloud backups; preserve compatibility with older backups and clear it with user data.

**Research (official product guides, reviewed 2026-09-29):**

- [Fitbod getting started](https://help.fitbod.me/hc/en-us/articles/30721771750039-Getting-Started-with-Fitbod-A-New-User-s-Guide): first-use questions cover experience, goals, and equipment; skipped preferences can be set later. This informed optional questions. The owner subsequently removed this app's onboarding shortcut from Settings.
- [Hevy Trainer overview](https://www.hevyapp.com/announcing-hevy-trainer/): onboarding collects goals, experience, equipment, frequency, and time constraints to create a program. This informed the training and routine questions; the current release adapts a curated starting plan from these answers.
- Product choice for this app: keep a short questionnaire with visible progress, back/skip controls, and a review step. Home equipment is now collected because the initial plan needs it; session duration remains deferred. These are design decisions, not claims that competing apps use the same flow.

### Starter-plan selection (2026-09-30)

| Answers | Starting plan |
|---|---|
| Experienced lifter | No automatic plan; create or choose a routine independently |
| Beginner | Suggest a plan by default; review allows opting out |
| Intermediate | Preview a suggestion; use only after opting in |
| Missing experience, goal, days, location, or required home equipment | Save chosen preferences; do not guess a plan |
| Strength/muscle, 1–3 days | Full body, with both upper and lower body each session |
| Beginner choosing 4–7 days | At most three lifting sessions, plus easier cardio/mobility sessions |
| Intermediate, 4 days | Upper/lower twice |
| Intermediate, 5 days | Upper/lower plus push/pull/legs; legs are retained twice |
| Intermediate, 6 days | PPL for strength; Arnold-style for muscle |
| Intermediate, 7 days | Six lifting sessions plus gentle mobility |
| General fitness | Full body plus cardio, with easy sessions for higher frequency |
| Endurance | Cardio emphasis; no heavy lifting added |
| Recovery phase | Easy movement and mobility, not an injury rehabilitation prescription |

- Bulk/maintain do not determine a split alone; goal, consistency and available days matter more. Cut retains resistance work and manageable effort. There is no calorie prescription.
- Every generated schedule has seven positions with exactly the selected number of sessions. It is a suggested weekly sequence, not an enforced calendar: existing “Up next” behavior advances through workout entries and allows users to move their training days.
- Gym assumes full gym access. Home and both use only confirmed home equipment. Bench means adjustable bench, rack includes safeties, cable means an adjustable station, and machines means a full upper/lower collection. Substitutions require every necessary item; duplicate substitutions are consolidated. Bodyweight pulling limitations are explained rather than claiming a prone raise replaces a row.
- The library includes PPL, Arnold, Full Body Foundations, Upper/Lower, Five-Day Muscle Builder, Home Dumbbell Full Body, Calisthenics Foundations, Strength + Cardio, Aerobic Base, and Stretch & Move. Programs include working sets, rep/time guidance, progression notes and rest positions.
- Seeding adds missing programs independently and updates recognizable untouched legacy PPL/Arnold content in place. It retains parent identities, favorites, usage counts, history and user modifications. Shared write coordination and a transaction protect startup and completion from partial writes.

### Training research and rationale

- [ACSM's 2026 resistance-training update](https://acsm.org/resistance-training-guidelines-update-2026/) emphasizes regular participation and individual goals, with all major muscle groups trained repeatedly. Its findings support moderate starting volumes, gradual progression and practical home equipment. It does not establish one named split as best for everyone.
- [2024 split versus full-body meta-analysis](https://pubmed.ncbi.nlm.nih.gov/38595233/) found comparable strength and muscle outcomes when volume was matched. We therefore use available days and equipment to choose structure. The exact schedules and substitution rules above are app design decisions.
- [WHO physical-activity guidance](https://www.who.int/news-room/fact-sheets/detail/physical-activity) informs the aerobic and mixed options. Starting sessions build gradually; a short starter plan is not advertised as already meeting the full recommended weekly activity target.
- [ACSM flexibility guidance](https://pubmed.ncbi.nlm.nih.gov/21694556/) supports regular flexibility work and gradual individual progression. Stretch templates use short comfortable holds, repeated across the week, rather than maximal or painful stretching.

### Optional quick-start tutorial (2026-09-30)

The tutorial teaches the first workout in three short pages: start, log a set, finish and find history. It is separate from setup and never blocks logging.

- Fresh installs get a compact, dismissible Quick start card on Workout home after completing or skipping setup. Existing installs are marked skipped on upgrade. Profile → Settings → Quick start tutorial reopens it at any time.
- Skip and Back to app are always available. Done closes the guide without starting anything. The sample set is an illustration in the selected weight unit; viewing the guide never creates exercises, sessions, splits, or history.
- Experienced lifters see a split-building explanation first, with an immediate Create my split action. A template is a reusable workout; a split orders workouts and rest days. The action opens the existing builder. Creating a split does not activate it: the guide explicitly asks the user to select it from the list after saving.
- Start guided workout starts the current planned workout or an empty session when no current template exists. If a workout or history edit is already open, it is preserved. Contextual tips appear only after this explicit choice, follow actual exercise/set state, and can be skipped. They are hidden during keyboard entry, exercise picking, settings, and historical edits. No spotlight overlays or forced practice sets.
- Completing a saved workout ends guidance. Failed saves retain the workout and guidance. The existing swipe hint is suppressed while the tutorial is available or active to avoid competing instructions.
- Version 1 tutorial progress has available/active/skipped/completed states, stored separately in `user_settings.tutorial_progress` through migration v21. Writes use the existing database lock. Full local/cloud backups preserve progress, pre-v21 restores suppress the invitation, malformed values fail closed, and Clear All Data resets it. Preferences, routine selection, and workout history remain owned by their existing flows.
- On iOS, navigation or opening the split builder waits for the guide's native dismissal. Android dispatches immediately. Repeated action taps are guarded.

**Research (official public guides, reviewed 2026-09-30):**

- [Strong: first workout](https://help.strongapp.io/article/229-my-first-workout) organizes instruction around starting empty or from a template, logging/checking sets, then finishing. This informed the tutorial's short task sequence.
- [Hevy: workouts versus routines](https://help.hevyapp.com/hc/en-us/articles/33703513582871-Workouts-vs-Routines-in-Hevy-What-They-Mean-and-How-to-Use-Them) distinguishes saved plans from live sessions and offers both planned and empty starts. This informed the brief template/split definitions and keeping both starting paths available.
- [Hevy: logging guide](https://www.hevyapp.com/features/track-workouts/) documents adding exercises, entering values, marking sets complete, and optional advanced controls. This supports deferring advanced features until the user needs them.
- [Fitbod: new-user guide](https://help.fitbod.me/hc/en-us/articles/30721771750039-Getting-Started-with-Fitbod-A-New-User-s-Guide) starts with personalized setup and offers exercise instructions when needed. This app already has optional preference setup; the tutorial focuses on using its interface.

These sources document supported workflows and help content. They do not establish whether every current app/platform version presents an in-app tutorial. The optional invitation, three-page design, and opt-in live tips are this app's product decisions.

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

## Retired AI Assistant

The owner removed this feature from the product on 2026-09-29. The assistant tab, placeholder screen, and in-app AI promotional copy are removed. The former cloud chatbot, generated-plan, and paid AI tier proposals are no longer planned. Existing local statistical suggestions are retained.

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
