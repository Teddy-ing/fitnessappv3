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
