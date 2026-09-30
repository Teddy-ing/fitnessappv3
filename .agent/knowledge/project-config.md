---
description: Technical stack, dependencies, build commands, and project structure
---

# Project Configuration

## Project Type

**Open Source** ✅

License: TBD (MIT, Apache 2.0, or GPL to consider)

---

## Technology Stack

| Layer | Choice | Rationale |
|-------|--------|----------|
| **Framework** | React Native + Expo | Cross-platform, JS ecosystem, no Mac required for dev |
| **Language** | TypeScript | Type safety, better tooling |
| **State Management** | Zustand | Lightweight, minimal boilerplate, great TypeScript support |
| **Local Database** | TBD | (SQLite via expo-sqlite, or WatermelonDB) |
| **On-device ML** | TBD | (TensorFlow Lite, ONNX, or custom) |
| **Cloud AI** | TBD | (OpenAI, Anthropic, or open-source) |

### Why React Native + Expo

- Cross-platform (Android + iOS) from single codebase
- No Mac required for Android development
- Large ecosystem and community
- Expo simplifies build/deploy pipeline
- Good enough performance for this use case

### Development Constraints

- **No Mac available** — iOS testing will require Expo Go or cloud builds
- **Solo developer** — Framework choice prioritizes productivity over performance
- **1 year timeline** — Room for iteration and polish

---

## Rest timer delivery (updated 2026-09-29)

JavaScript can pause when the app is backgrounded. The native notification scheduled for the absolute timer deadline owns the alert; the foreground interval only updates the display and haptics.

- `App.tsx` mounts `useRestTimerLifecycle` once. It observes the timer store independently of screen navigation.
- Starting or changing a timer replaces the native alarm. Skip, discard and successful workout save cancel it. Returning to the app synchronizes the clock without sending a second alert.
- `restTimerNotificationController` guards asynchronous scheduling so stale requests cannot leave alarms behind after Skip or a newer set.
- Android creates the audible `rest-timer` channel before requesting notification permission. The Expo config declares `SCHEDULE_EXACT_ALARM` and the notifications plugin.
- On Android 12+, allow **Alarms & reminders → Workout App**, as well as notifications and sound. Settings → **Rest Timer Alerts** opens the relevant system settings. Without exact-alarm access, installed Expo native code uses inexact delivery and Android may delay it.
- Native permission/config changes require rebuilding the Android app; a JavaScript reload is insufficient. Timer delivery must be checked on-device, including screen-off/background use.

Keep notification services independent of stores. Do not reintroduce an immediate JavaScript notification on resume or depend on a background JS interval for delivery.

### Data Storage
- [ ] SQLite (local, Fitnotes-compatible)
- [ ] Room (Android) / Core Data (iOS)
- [ ] Realm
- [ ] Custom JSON/file-based

### Cloud Sync (Optional Feature)
- [ ] Firebase
- [ ] Supabase
- [ ] Custom backend
- [ ] Peer-to-peer sync

---

## Project Structure

```
workout-app/
├── .agent/                 # AI agent knowledge & workflows
│   ├── knowledge/          # Project documentation
│   └── workflows/          # Development procedures
├── src/
│   ├── components/         # Reusable UI components
│   ├── screens/            # Full-screen views  
│   ├── services/           # Business logic, data access
│   ├── models/             # Data types and entities
│   ├── hooks/              # Custom React hooks
│   ├── navigation/         # Navigation configuration
│   ├── theme/              # Colors, typography, spacing
│   └── utils/              # Helper functions
├── assets/                 # Images, fonts, etc.
├── App.tsx                 # App entry point
├── app.json                # Expo configuration
├── package.json            # Dependencies
├── README.md               # Project overview
└── LICENSE                 # MIT License
```

---

## Build Commands

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on Android
npm run android

# Run on iOS (requires macOS)
npm run ios

# Run on web
npm run web

# Type check
npm run typecheck

# Lint
npm run lint
```

---

## Dependencies (Current)

| Package | Version | Purpose |
|---------|---------|----------|
| expo | ~54.0.30 | Framework |
| react | 19.1.0 | UI library |
| react-native | 0.81.5 | Native bridge |
| expo-status-bar | ~3.0.9 | Status bar control |
| typescript | ~5.9.2 | Type checking |

---

## Last Updated
- Date: 2026-01-04
- Session Context: Initial project setup, placeholder for technical decisions
