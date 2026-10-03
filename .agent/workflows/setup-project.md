---
description: Set up the current IronJot native development environment
---

# Set Up IronJot

**Updated: 2026-10-02.** The stack is Expo SDK 54, React Native 0.81, TypeScript, Zustand, and SQLite. See [project configuration](../knowledge/project-config.md) for architecture and native configuration.

## Prerequisites

- Node.js **20.19.4 or newer** and npm; this minimum comes from the installed React Native package.
- Android Studio, Android SDK/platform tools, a compatible JDK, and an emulator or USB-debugging-enabled device for Android.
- macOS, Xcode, and its command-line tools for local iOS builds.
- Access to the project's Google configuration if testing Drive backup.

Use a native development build. Expo Go cannot supply every native dependency used by this app.

## Install and run

From the repository root:

```sh
npm ci
npm run android
```

On macOS:

```sh
npm ci
npm run ios
```

The scripts run `expo run:android` and `expo run:ios`. They build and install the native app; the first build also generates a native project if needed. For later JavaScript-only development with a build already installed:

```sh
npm start -- --dev-client
```

Use `adb devices` to confirm Android device access before troubleshooting installation. The optional `npm run web` script is not a substitute for native testing.

## Native configuration

`app.json` declares the native identifiers, branding, SQLite and notification plugins, Google sign-in plugin, and Android Google services file. Generated `android/` and `ios/` folders are ignored by Git.

When native configuration changes and the native folder already exists, regenerate before rebuilding:

```sh
npx expo prebuild --platform android --no-install
npm run android
```

Use `--platform ios` and `npm run ios` on macOS. Review local native customizations before regeneration. A Metro reload cannot update the installed app's name, launcher icon, native splash, plugins, or permissions.

### Google Drive configuration

Drive backup uses `@react-native-google-signin/google-signin`. Relevant configuration is in:

- `app.json`: Android `googleServicesFile` and iOS URL scheme.
- `google-services.json`: Google project/native app configuration.
- `src/services/cloudBackupService.ts`: web client ID and Drive app-data scope.

For another Google project or signing identity, ensure the app identifiers, OAuth clients, Android signing certificate, and iOS URL scheme agree. Do not place private keys, signing passwords, or account tokens in documentation. Production sign-in must be checked with the production-signed app; debug sign-in success does not prove it will work.

Core local logging does not require a connected Google account. Drive restoration replaces local data; use disposable test data.

## Verify the environment

```sh
npm run typecheck
npm test -- --runInBand
```

Then open the native app, skip or finish optional setup, start a workout, log a set, save it, and reopen its history. Confirm changes reload during development.

The lint script currently lacks a declared ESLint dependency and repository configuration. Report that limitation rather than treating the script name as an available check.

## Common issues

| Symptom | Check |
| --- | --- |
| Native module missing | Rebuild the native development client after dependency/plugin changes; confirm the app was not opened in Expo Go. |
| Old name, icon, or splash | Regenerate native configuration and rebuild; check the installed app rather than the development launcher. |
| Drive sign-in fails | Compare native identifiers, OAuth client configuration, and the certificate used to sign this build. |
| Rest alarm delayed or silent | Check notification sound and exact-alarm access through Settings → Rest Timer Alerts; verify on a real device. |
| Database initialization fails | Inspect migration logs and preserve the database for diagnosis. Do not clear real history to bypass an upgrade failure. |

For shipping builds and release-specific checks, use the [release checklist](release-checklist.md).
