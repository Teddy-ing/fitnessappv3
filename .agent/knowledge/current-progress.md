---
description: Current app status, release priorities, and dated development history
---

# Current Progress

**Updated: 2026-10-02**

## Current state

IronJot is nearing its first public release. Core features are implemented;
remaining work is focused on release preparation, data portability and device
verification. The app is free to use, works locally without an account, and offers
optional Google Drive backup. The assistant and paid cloud AI tier were retired.

| Area | Current implementation |
| --- | --- |
| Workout logging | Sets, exercise types, supersets, notes, rest timer, RPE/RIR, plate calculator, completion summary and history editing |
| Routines | Custom templates and splits, rest days, template cycling and ten built-in starting plans |
| Progress | Workout/exercise analytics, records, calendar and journal, measurements, progress photos, goals and seven Profile widgets |
| Personalization | Local history-based weight/rep suggestions, exercise suggestions, rest defaults and progression nudges |
| Getting started | Optional setup, starting-plan suggestions and a replayable quick-start tutorial |
| Appearance | IronJot name and icon, animated startup, default charcoal/coral/cream theme, Classic Purple option and 114 exercise illustrations |
| Data | SQLite migrations through v21, JSON database backup/restore, XLSX exports, competitor imports and optional Google Drive backup |

The latest recorded code verification, on October 2, passed TypeScript and
**46 Jest suites / 622 tests**. Android emulator release checks covered branding,
themes and retained history. These are recorded results from that implementation,
not tests rerun during the documentation refresh. iOS verification remains open.

## Release follow-up — 2026-10-02

This is the current working list. Older phase roadmaps are archived below.

1. **Finish public-facing Settings.** Replace the feedback address and About/
   changelog/privacy placeholders; remove unfinished release entries such as the
   warm-up calculator. Confirm Dev Tools are hidden in production and provide a
   deliberate user-facing data-deletion flow.
2. **Verify data portability.** JSON and Drive backups currently include progress
   photo records and file paths, but not image files. Address photo restoration
   before describing backups as complete. Verify export/restore, upgrades and
   Google Drive sign-in/restore in the production build.
3. **Prepare distribution.** Set up production signing, versioning, store records,
   website/privacy/support information and store assets. Resolve the GPLv3 LICENSE
   versus MIT package metadata mismatch before distribution.
4. **Complete device and beta checks.** Exercise full logging/recovery, rest alerts,
   imports, permissions, both themes and larger text on physical phones. Verify
   iOS if included in the launch. Use the [release checklist](../workflows/release-checklist.md).
5. **Add ratings and decide optional support.** Plan a native review request after
   established use and a manual store link. Developer tips are desired but not
   implemented; the payment approach still needs a decision.

### Reports to recheck

- **Superset unlink (BUG-001):** an older report says unlinking hides the first
  exercise. Current store tests cover unlinking, but the reported screen behavior
  has not been reproduced or closed by this refresh.
- **Android rest alerts:** the Samsung follow-up improved after exact-alarm access
  was enabled. Repeated screen-off reliability still needs a device check.
- **Database lifecycle:** a September emulator session logged a released SQLite
  shared-object warning after activity recreation. Its cause remains unconfirmed.

## Development log

Entries describe the result and relevant verification. Build instructions belong
in [Project Configuration](project-config.md); release tasks stay in the list above.

### 2026-10-02: Documentation refresh

**Focus:** Bring project documentation up to date and make the history easier to use.

**What changed:**
- Rebuilt the README around the current app and development setup.
- Reorganized this file into current status, release follow-up and a dated log.
  Moved earlier entries and planning snapshots into linked archives.
- Removed implementation logs from App Vision and added dated current-state
  updates to product, technical and reference documents.
- Updated development workflows to follow the current working agreement.

**Verification:** Source and independent reviews completed. Local links, Markdown
structure, chronological order and preservation of earlier entries were checked.
No application code changed.

### 2026-10-02: IronJot identity and themes

**Focus:** Establish the app's final name and visual identity.

**What changed:**
- IronJot was chosen as the final name, and a barbell-pen icon was created.
- Added platform icons and an animated startup with the IronJot title. Startup
  runs on a fresh launch, respects reduced motion and waits for local data to load.
- Applied the charcoal, coral and cream palette throughout the app. The original
  appearance remains available as Classic Purple in Settings.
- Theme changes persist and update open screens without losing drafts or active
  workouts. Backup restore and data reset refresh the selected theme.

**Verification:** TypeScript and the full Jest suite passed (46 suites / 622 tests).
Android release checks covered startup, theme switching, cold restarts and history
preservation. iOS remains part of release verification.

### 2026-10-01: Exercise information and Back navigation

**Focus:** Keep navigation predictable while logging and reviewing workouts.

**What changed:**
- Exercise information opened from a workout now returns to that workout. Profile
  keeps its own navigation history, and Settings returns to its originating tab.
- Corrected Android Back behavior in photo viewers, template forms, widget picking
  and measurement trends. The workout keyboard only handles Back while focused.
- Fixed import review skipping entries, summary rendering and dismissal/save races.

**Verification:** TypeScript and 34 Jest suites / 552 tests passed. Android emulator
checks covered workout details, completion, Profile navigation and Settings returns.

### 2026-10-01: Exercise illustration library

**Focus:** Provide consistent exercise artwork throughout the app.

**What changed:**
- Completed illustrations for all 114 built-in exercises, covering strength,
  cardio, bodyweight and mobility movements.
- Added larger exercise-info cards, offline image assets, custom-image support
  and loading fallbacks. Original artwork and asset records are retained.

**Verification:** Artwork and asset coverage were reviewed. TypeScript, 28 Jest
suites / 524 tests and Android asset export passed. Representative cards were
checked in the Android emulator.

### 2026-09-30: Optional tutorial and starting routines

**Focus:** Help new users get started while keeping setup optional.

**What changed:**
- Added a dismissible three-page quick-start guide with optional tips during
  logging and replay from Settings. Experienced lifters can go straight to
  creating their own split.
- Completed setup now applies selected units and training phase once. Drafts and
  skipped setup leave current settings alone.
- Expanded the starting library to ten plans with 35 workouts. Suggestions use
  experience, goals, schedule, location and available equipment. Beginners can
  accept or decline a suggested plan; experienced lifters receive no assigned plan.
- Preserved active routines and older data through setup, tutorial and backup
  changes. Removed the temporary onboarding shortcut from Settings.

**Verification:** TypeScript, SQLite migration/restore tests and the relevant full
Jest runs passed. Android checks covered setup, accepted plans, tutorial replay,
guided logging, larger text and cold restarts.

### 2026-09-29: Optional onboarding and simpler navigation

**Focus:** Keep the app centered on workout logging.

**What changed:**
- Retired the assistant tab and cloud AI tier. Workout and Profile are the two
  main tabs; local workout-history suggestions remain available.
- Added skippable setup with optional answers and saved drafts. No account or
  sign-in is required for setup or core logging.
- Preserved existing users' data during upgrade. Applying preferences and the
  optional tutorial were completed in the September 30 work above.

**Verification:** TypeScript, 21 Jest suites / 362 tests and the Android development
bundle passed, including fresh/upgrade and backup round-trip coverage.

### 2026-09-29: Android editing, rest alerts and workout completion

**Focus:** Improve the workout flow on Android.

**What changed:**
- Fixed template-editor safe areas and exercise-info navigation while preserving
  draft sets, ordering and picker state.
- Added native rest notifications with coordinated scheduling/cancellation and
  Android permission guidance. Fixed a cancellation race near timer expiry.
- Added a saved-workout summary with duration, exercises, sets and preferred-unit
  volume. Failed saves preserve the workout, and repeated finishes are guarded.

**Verification:** TypeScript and 18 Jest suites / 328 tests passed. Android emulator
checks covered editing, completion and a rest notification during deep idle.
Follow-up on the Samsung phone confirmed exact-alarm access was enabled and alerts
appeared improved; repeated screen-off reliability remains open.

### 2026-09-29: Project review and working agreement

- Reviewed implemented features after the development break and identified drift
  in setup, release and product documentation.
- Established the current working agreement in [AGENTS.md](../../AGENTS.md): the
  main chat coordinates delivery, with scoped implementation and independent
  review. Checks are proportional to the change and protect workout history.

## Historical records

- [Development history — January–May 2026](progress-archive/2026-01-to-05-development.md):
  earlier dated entries, preserved and sorted newest first.
- [Planning artifacts — captured October 2, 2026](progress-archive/2026-10-02-planning-snapshot.md):
  the old completed checklist, phase roadmap, open questions and RPE/RIR proposal.
  Original snapshot dates were not recorded, so the capture date is explicit.
- [Conventions snapshot — April 13, 2026](progress-archive/2026-04-13-conventions.md):
  earlier development rules and their rationale, superseded by the current working agreement.

Historical plans and test results describe their own period. The current state
and release follow-up at the top of this file take precedence.
