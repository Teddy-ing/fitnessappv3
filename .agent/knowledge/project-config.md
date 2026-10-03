---
description: Current technical stack, data boundaries, native configuration, and build commands
---

# Project Configuration

## Current configuration — 2026-10-02

This snapshot supersedes the initial January 2026 placeholders. The original reasons for choosing React Native and Expo still apply: one mobile codebase, a familiar TypeScript ecosystem, and manageable maintenance for a solo developer. Android development works on Windows; local iOS builds require macOS and Xcode.

The app is named **IronJot**. The existing technical identifiers remain `workout-app` (package name and Expo slug), `com.workoutapp.app` (Android package and iOS bundle ID), and `workout_app.db` (database). These are compatibility identifiers, not unfinished display branding. Decide any identity change before store registration and account for existing installations and backups.

The configured version is `0.1.0`. `LICENSE` contains GPLv3 and package metadata says MIT; the owner must resolve the mismatch before publication.

## Technology stack

Versions below are declared in `package.json`; `package-lock.json` is the reproducible dependency record.

| Layer | Current choice |
| --- | --- |
| Mobile framework | Expo `~54.0.30`, React Native `0.81.5`, React `19.1.0` |
| Language | TypeScript `~5.9.2`, strict app typechecking |
| State | Zustand `^5.0.9` |
| Local database | `expo-sqlite` `~16.0.10` |
| Navigation | React Navigation 7; Workout and Profile tabs with nested stacks |
| UI and animation | Reanimated 4, Gesture Handler, Gorhom Bottom Sheet, React Native SVG |
| Charts | `react-native-gifted-charts` |
| Files and transfer | Expo file system, document picker, sharing, Papa Parse, SheetJS |
| Optional cloud backup | Native Google sign-in and Google Drive REST API |
| Tests | Jest 30, ts-jest, React Native Testing Library |

Personalization currently uses local statistics in `smartSuggestionsService.ts`, `exerciseSuggestionService.ts`, and `strengthProfileService.ts`. The early TensorFlow/ONNX and cloud-chatbot ideas did not become dependencies. There is no app backend or live multi-device synchronization.

## Data boundaries

- `src/services/database.ts` opens `workout_app.db`, enables WAL and foreign keys, and runs the versioned migrations in `src/services/migrations.ts`. The current schema is **v21**. Read the registry for the next version; never edit a shipped migration.
- Services perform data access independently of Zustand stores. Reuse `hydration.ts`, formulas, batching helpers, and `withWriteLock` where applicable.
- Weight is stored in pounds; use `src/utils/unitConversion.ts` at UI and import/export boundaries. Preserve the existing conventions for other measurements.
- `src/stores/workoutPersistence.ts` persists an unfinished workout separately from completed database history.
- `dataTransferService.ts` exports database tables as JSON and restores snapshots. Its `EXPORT_TABLES` list also defines the Drive backup payload. Keep new persisted fields and tables compatible with restore, imports, and clearing.
- `exportService.ts` creates an `.xlsx` workbook for workouts, measurements, goals, and personal records. Competitor import uses separate parsers for supported FitNotes, Strong, and Hevy files.
- Progress photos are local files with database records. The current JSON/Drive payload preserves their paths, not their image bytes; portable photo restoration remains a release gap.
- `cloudBackupService.ts` keeps one latest JSON backup in Google's hidden app-data folder. It is an optional backup/replace-restore flow. Device-specific cloud connection settings are excluded from the snapshot.

## Native development and commands

Use Node.js **20.19.4 or newer**, matching the installed React Native package's engine requirement. Use a native development build because Google sign-in and other native integrations are not fully available in Expo Go. The generated `android/` and `ios/` folders are ignored by Git.

```sh
npm ci
npm run android
# On macOS with Xcode:
npm run ios
# For an installed development build:
npm start -- --dev-client
```

```sh
npm run typecheck
npm test -- --runInBand
npm run assets:branding
node scripts/exercise-art.cjs verify --require-complete
```

The `web` script exists as a development convenience; it does not establish support for native storage, notifications, or sign-in in a browser. The lint script currently has no declared ESLint dependency or repository configuration. Do not report lint as a completed check until its tooling is configured.

See [setup-project](../workflows/setup-project.md) for first builds and [release-checklist](../workflows/release-checklist.md) for production preparation. Current local Android `release` uses debug signing; creating a release-mode build alone does not make it a store-ready build. There is no checked-in EAS build configuration.

## Branding and startup

IronJot's icon uses the barbell-and-pen mark. `assets/branding/ironjot.geometry.json` is the shared editable geometry for exported assets and the animated React Native mark. Run `npm run assets:branding` after changing it.

The startup sequence lasts 2.5 seconds in a fresh app runtime. The mark assembles over the first 1,000 ms, the title reveals between 850 and 1,750 ms, and the finished design holds until initialization is ready. It does not replay on screen remounts or app resume within the same runtime. Reduced motion uses a static title and mark.

Native display name, icons, splash, plugins, or permission changes require a native rebuild. If a native folder already exists, refresh it first:

```sh
npx expo prebuild --platform android --no-install
# On macOS, for iOS:
npx expo prebuild --platform ios --no-install
```

Preserve and review any local native customization when regenerating. Verify the installed splash in a release-mode build; the development launcher does not reproduce it reliably. An emulator-only APK architecture is not a phone distribution build.

## Rest timer delivery

JavaScript can pause in the background. A native notification scheduled for the absolute timer deadline owns the alert; the foreground interval updates the display and haptics.

- `App.tsx` mounts `useRestTimerLifecycle` once, independently of screen navigation.
- Starting or changing the timer replaces the alarm. Skip, discard, and successful workout save cancel it. Resume synchronizes the clock without a second alert.
- `restTimerNotificationController` guards asynchronous scheduling against stale requests.
- Android creates the audible `rest-timer` channel before requesting notification permission. Expo configuration declares `SCHEDULE_EXACT_ALARM` and the notifications plugin.
- Settings → **Rest Timer Alerts** opens the relevant system settings. On Android versions that require exact-alarm access, check both **Alarms & reminders** and notification/sound access for IronJot. Without exact-alarm access, the installed native implementation may deliver late.
- Verify screen-off, background, permission-denied, and resume behavior on a device. Do not replace native delivery with a background JavaScript interval or an immediate notification on resume.

## Source map

| Location | Responsibility |
| --- | --- |
| `App.tsx`, `src/components/startup/` | App initialization and launch branding |
| `src/screens/`, `src/components/`, `src/hooks/` | Screens, controls, and interaction logic |
| `src/navigation/` | Two-tab navigation and nested screen stacks |
| `src/services/`, `src/stores/` | Persistence/domain operations and client state |
| `src/models/`, `src/data/`, `src/utils/` | Shared models, built-in content, and helpers |
| `src/theme/` | Purple and IronJot dark palettes and runtime styling |
| `assets/branding/`, `assets/exercises/`, `scripts/` | Artwork sources, packaged assets, and generation utilities |
| `.agent/knowledge/`, `.agent/workflows/` | Product context, dated project records, and reusable development procedures |

Historical initial stack explorations are settled by the choices above. Product direction belongs in [app vision](app-vision.md); implementation outcomes and unresolved work belong in [current progress](current-progress.md).
