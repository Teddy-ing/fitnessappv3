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

### 2026-10-21: Progression suggestions use the latest sessions

- Fixed reversed chronology in both single and batch progression-nudge queries: older repeated 50-pound sessions could produce "try 55" despite a newer 60-pound session. Both paths now examine the latest consecutive sessions and pair weight/reps from an actual top-weight working set. Distinct workouts with identical timestamps remain separate. No schema or history writes.
- Guarded previous-set/suggestion responses by workout lifecycle and exercise request, merged valid batch results, cleared stale edit/restore caches, and prevented delayed restore from replacing a newly started workout. Entered/completed sets are preserved. Banner and set-row weights now share the preferred display unit.
- Verification: TypeScript and all Jest tests passed (52 suites / 704 tests). Added 35 regressions across real-SQLite suggestion queries, deferred store responses and banner rendering. Independent review passed 51 focused tests and found no actionable issues. Updated the routing test's unit-hook mock for the new component dependency.
- On the Samsung phone, restored the development connection through the existing USB localhost route, confirmed the reported October 16 history (60 × 10/7/4), and verified that a temporary unsaved Preacher Curl workout no longer shows the old plateau banner. Discarded the test workout and returned to Workout home; saved history and split position are unchanged. Screenshots/logs are under ignored `.expo/suggestions-*`. iOS remains unverified.
- The separate per-set prediction still shows 55 for this history; it is produced by the existing weighted-regression formula, not the progression banner. This fix preserves that formula. A future product decision could make the latest working weight a lower bound outside Recovery. Changes remain uncommitted on `NewCodexChanges`.

### 2026-10-20: Consistent split day counter and progression

- Fixed a home-load race that read the old schedule index while date-based advancement ran, then loaded the new workout. The card, badge and picker now publish one consistent snapshot; queued refreshes and manual selections cannot overwrite newer choices. Home data refreshes on app resume and local midnight.
- The badge now says "SPLIT DAY X OF Y" to distinguish schedule position from weekday. Keep unfinished workouts across calendar weeks; advance once after a completed workout on the next local date, skip rest entries, and wrap after the final template. Manual position/split selection clears stale pending advancement. Settings updates are serialized and the position/completion marker change in one write; no schema or history changes.
- Verification: TypeScript passed; full Jest suite passed (50 suites / 669 tests), including 44 new service/hook/UI regressions. Independent review found no actionable issues and reran those three focused suites. On the connected Samsung phone, confirmed matching card/picker position, readable labels, Cancel dismissal and stable state after background/resume. Also fixed the picker's clipped Cancel label. Screenshots/logs are in ignored `.expo/split-counter-*`.
- Date rollover and concurrent progression were verified through automated tests; no phone clock or workout-history changes were made for testing. iOS remains unverified. Changes are uncommitted on `NewCodexChanges`; next useful check is the next normal workout/local-day rollover on the phone.

### 2026-10-20: Miniature artwork in Analytics

- Replaced Analytics → Exercises placeholder icons with 48×48 rounded thumbnails from the existing illustration registry. Full poses fit inside each thumbnail. Unknown/custom IDs and image-load failures retain an icon; matching uses stable IDs rather than names. Other screens, assets, services and stored data are unchanged.
- Verification: TypeScript passed; three focused Jest suites / 15 tests passed, including three new Analytics regressions for ID matching, fallbacks, search and chart navigation. Independent review found no concrete defects and reran the new tests successfully. Scoped source diff check passed; the progress document already had an unrelated trailing blank line from the earlier desktop chat-recovery entry.
- Verified on the connected Samsung phone after reloading the development app: multiple distinct thumbnails, custom fallback, Chest filtering, opening Charts and returning to the list. Left the app on Recent exercises. Screenshots are under ignored `.expo/analytics-thumbnails-*`. iOS remains unverified. Changes are uncommitted on `NewCodexChanges`.

### 2026-10-20: Missing exercise images on the phone

- Confirmed GitHub `main` at `5f95dff` merged `NewCodexChanges` through PR #6, including artwork commit `ade63e4`. The selected `NewCodexChanges` checkout at `5feb1c7` has the same file tree as remote main. Fetched remote metadata; did not switch or merge branches. Local `main` remains at its older commit.
- Reproduced the missing Machine Chest Press illustration on the connected phone. Its development URL was `http://localhost:8081`, but the ADB reverse connection was absent and USB debugging was unauthorized when inspected. The local server served the JPEG successfully. After the owner approved USB debugging, restored port 8081 forwarding and remounted About; the full illustration appeared immediately on the phone.
- All 114 illustration records, hashes and runtime assets passed strict verification; four focused Jest suites / 18 tests passed. No app source or workout data changed. List thumbnails remain the existing shared placeholder; the original artwork feature is in exercise information's About tab.
- Added USB connection recovery steps to `project-config.md`. Before/after screenshots are in ignored `.expo/image-investigation-*.png`. No image regeneration or rebuild was required.

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

### 2026-10-20: Desktop project chat recovery

- Found the existing fitnessappv3 project and ten earlier top-level chats in the local index. Reconnected all ten using supported app tools; restored one archived chat (Add onboarding and remove assistant).
- App tools confirmed each move, and a fresh sidebar listing verified the six recent historical chat associations. The original project-refresh history was readable.
- Cause of missing associations and persistence after restarting remain unverified. Next step: confirm the recovered chats appear when expanding fitnessappv3 in the sidebar. No app code changed.

