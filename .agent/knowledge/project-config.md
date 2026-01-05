---
description: Technical stack, dependencies, build commands, and project structure (TBD)
---

# Project Configuration

## Status

**⚠️ Technology stack not yet decided**

This document will be updated once platform and framework decisions are made.

---

## Pending Decisions

### Platform
- [ ] Android-only (primary target based on market research)
- [ ] Cross-platform (iOS + Android)
- [ ] Web companion?

### Framework Options

| Option | Pros | Cons |
|--------|------|------|
| **Kotlin (Native Android)** | Best performance, native feel, Google-preferred | Android-only, steeper learning curve |
| **Flutter** | Cross-platform, fast development, good performance | Dart language, larger app size |
| **React Native** | JavaScript, large ecosystem, cross-platform | Performance overhead, native bridge issues |
| **Kotlin Multiplatform** | Share logic, native UI, future-proof | Newer, smaller ecosystem |

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
