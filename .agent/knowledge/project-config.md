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
| **State Management** | TBD | (Zustand, Redux, or React Context) |
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

## ⚠️ Technical Consideration: Background Timers

**Issue:** React Native JS execution pauses when phone is locked/screen off. This affects rest timers.

**Solutions (in order of preference):**

1. **`react-native-background-timer`** — Keeps timers running in background
   - Works well on Android
   - iOS: Works when backgrounded, not when screen fully off
   - Requires Expo custom dev client (not Expo Go)

2. **Expo Notifications** — Schedule local notification for timer end
   - Timer notification fires even if app is killed
   - Visual countdown may pause but notification still arrives
   - Best UX for actual timer functionality

3. **Native module** — If above don't work, may need custom native code
   - Last resort, increases complexity

**Recommended approach:** Use `react-native-background-timer` + local notifications as backup. Scaffold with Expo dev client, not Expo Go.

**Additional notes:**
- Android: May need to guide users to disable battery optimization
- iOS: Stricter background execution policies

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

*To be defined after framework selection*

```
workout-app/
├── AGENTS.md
├── .agent/
│   ├── knowledge/
│   └── workflows/
├── src/              # TBD based on framework
├── assets/           # Images, fonts, etc.
├── docs/             # User-facing documentation
└── ...
```

---

## Build Commands

*To be defined after framework selection*

---

## Last Updated
- Date: 2026-01-04
- Session Context: Initial project setup, placeholder for technical decisions
