---
description: Coding patterns, naming conventions, and project structure standards (TBD)
---

# Project Conventions

## Status

**⚠️ Conventions will be defined after technology stack is selected**

---

## General Principles

These apply regardless of framework:

### Code Quality
- Prefer readability over cleverness
- Document non-obvious decisions
- Write self-documenting code with clear naming
- Keep functions small and focused

### Git Practices
- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`
- Feature branches from `main`
- Squash merge for clean history
- Meaningful commit messages

### Testing Philosophy
- Test critical paths (logging a set, saving a workout)
- Integration tests over unit tests for UI
- Manual testing for UX flows

---

## Naming Conventions

*To be defined per language/framework*

### General
- Use descriptive names over abbreviations
- Boolean variables: `isX`, `hasX`, `canX`, `shouldX`
- Constants: `SCREAMING_SNAKE_CASE`
- Avoid generic names (`data`, `item`, `temp`, `stuff`)

### Domain-Specific
- `Workout` — A complete workout session
- `Exercise` — A type of exercise (e.g., "Bench Press")
- `Set` — A single set of an exercise (weight, reps, etc.)
- `Template` — A reusable workout structure
- `Routine` — A collection of templates (e.g., weekly program)

---

## File Organization

*To be defined after framework selection*

### General Pattern
```
src/
├── components/    # Reusable UI components
├── screens/       # Full-screen views
├── models/        # Data models/entities
├── services/      # Business logic, data access
├── utils/         # Helper functions
└── assets/        # Static resources
```

---

## Last Updated
- Date: 2026-01-04
- Session Context: Initial project setup, placeholder for conventions
