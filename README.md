# IronJot

IronJot is a workout journal for lifters who want to log quickly, follow their own training plan, and keep ownership of their history. Core logging works offline without an account. Optional setup, starter plans, and a contextual guide help newer lifters get started.

**Status as of October 2, 2026:** the main app features are implemented; release preparation and final device verification remain. The configured app version is `0.1.0`.

## What it does

- **Log workouts:** weight, reps, timed sets, set types, RPE/RIR, supersets, notes, rest timers, and recovery of an unfinished workout.
- **Plan training:** reusable templates, splits, schedules, and optional starter plans.
- **Browse exercises:** 114 built-in exercises with offline illustrations, plus custom exercises, favorites, and exercise history, records, and charts.
- **Track progress:** workout analytics and calendar, personal records, goals, body measurements, and progress photos.
- **Customize the app:** two dark themes, metric/imperial display, logging preferences, and seven configurable Profile widgets.
- **Use past performance:** local statistical suggestions help prefill sets and suggest exercises from training history.
- **Bring and keep your data:** imports from supported FitNotes, Strong, and Hevy exports; JSON backup/restore; spreadsheet export; optional Google Drive backup.

## Data and privacy

Workouts and settings live in an on-device SQLite database. Progress-photo files live in the app's local storage. Basic logging needs no account or network connection. Google sign-in is used only when connecting the optional Drive backup, which uploads a JSON snapshot to the app's private Drive folder.

**Current backup limitation:** JSON and Drive backups include progress-photo records and local paths, but do not package the image files. They cannot restore those photos onto another device yet. Restore replaces the current app data; spreadsheet export is for reading and analysis, not full restoration.

## Development

The app uses Expo SDK 54, React Native 0.81, React 19, TypeScript, Zustand, and `expo-sqlite`. Android and iOS are the intended native targets; iOS release verification remains outstanding.

### Run locally

Use Node.js **20.19.4 or newer** and npm. Android development needs Android Studio, its SDK tools, and a compatible JDK. Local iOS builds need macOS and Xcode. Use a native development build: Expo Go does not include all of this app's native dependencies.

```sh
npm ci
npm run android
```

For an already installed development build, start Metro with `npm start -- --dev-client`. On macOS, use `npm run ios` for the iOS development build. See the [setup guide](.agent/workflows/setup-project.md) for native configuration, Google sign-in, and troubleshooting.

### Checks

```sh
npm run typecheck
npm test -- --runInBand
```

Use focused Jest tests during development and the full suite for shared behavior or release preparation. The repository has a lint script, but does not currently declare ESLint or provide its configuration. Native interactions also need device or emulator checks.

### Project layout

```text
src/
  components/   Reusable UI, workout controls, widgets, and startup branding
  screens/      Workout, Profile, and their supporting screens
  services/     SQLite persistence, analytics, imports, exports, and backup
  stores/       Zustand state and unfinished-workout persistence
  models/       Shared TypeScript models
  data/         Built-in exercises, illustrations, and starter plans
  hooks/        Screen and interaction logic
  navigation/   Workout and Profile tabs with nested stacks
  theme/        Theme palettes and runtime styling
  utils/        Formulas, units, dates, and database helpers
assets/         Branding and exercise artwork
scripts/        Branding generation and exercise-art packaging
.agent/         Product notes, project history, and development guides
```

## Project documentation

- [Current progress](.agent/knowledge/current-progress.md): current status, recent outcomes, and historical records.
- [App vision](.agent/knowledge/app-vision.md) and [target users](.agent/knowledge/target-users.md): product direction.
- [Project configuration](.agent/knowledge/project-config.md): current dependencies, data boundaries, and native build details.
- [Conventions](.agent/knowledge/conventions.md) and [AGENTS.md](AGENTS.md): implementation and collaboration rules.
- [Release checklist](.agent/workflows/release-checklist.md): remaining preparation and release verification.
- [Exercise illustrations](.agent/workflows/exercise-illustrations.md): artwork maintenance and verification.

Before launch, the app still needs finalized public information and support links, production signing and store configuration, complete photo backup handling, and release testing. See current progress for the maintained list rather than treating historical roadmaps as open work.

## License

The repository's [LICENSE](LICENSE) contains GPLv3, while `package.json` declares MIT. The owner needs to resolve that mismatch before publication.
