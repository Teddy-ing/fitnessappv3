---
description: Commands to scaffold the project from scratch (TBD based on stack)
---

# Setup Project Workflow

How to set up the workout app development environment from scratch.

## Status

**⚠️ Detailed steps pending technology stack decision**

This workflow will be completed once platform and framework are chosen.

## Pending Decisions

- [ ] Platform (Android / Cross-platform)
- [ ] Framework (Native Kotlin / Flutter / React Native / etc.)
- [ ] IDE (Android Studio / VS Code / etc.)

## General Prerequisites

Regardless of stack, you'll need:

- [ ] Git installed
- [ ] GitHub account (or preferred Git host)
- [ ] Platform-specific development tools:
  - Android: Android Studio, JDK 11+
  - iOS: Xcode (Mac only)
  - Flutter: Flutter SDK
  - React Native: Node.js, Watchman

## Repository Setup

```bash
# Clone repo (once created)
git clone <repo-url>
cd workout-app

# Install dependencies
# Command depends on framework, e.g.:
# npm install
# flutter pub get
# ./gradlew build
```

## Project Structure

See `project-config.md` for project structure once defined.

## First Build

*Commands TBD*

```bash
# Example commands (update when stack is chosen):

# Android/Kotlin:
./gradlew assembleDebug

# Flutter:
flutter run

# React Native:
npm run android
```

## Verification

After setup, verify:
- [ ] Project builds without errors
- [ ] App runs on emulator/device
- [ ] Hot reload works (if applicable)
- [ ] Tests pass (if any exist)

## Common Issues

*To be populated as issues are discovered*

---

## Last Updated
- Date: 2026-01-04
- Session Context: Initial workflow setup, placeholder pending stack decision
