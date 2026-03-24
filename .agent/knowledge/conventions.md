---
description: Coding patterns, naming conventions, and project structure standards (TBD)
---

# Project Conventions

## Status

**Stack selected: React Native + Expo + TypeScript + Zustand + expo-sqlite**

---

## General Principles

These apply regardless of framework:

### Code Quality
- Prefer readability over cleverness
- Document non-obvious decisions
- Write self-documenting code with clear naming
- Keep functions small and focused

### Guardrails

These rules are enforced to prevent the specific categories of tech debt that have bitten this project:

1. **Component size limit (600 lines) — build first, extract later**
   Component files should stay under 600 lines. **This is strictly enforced post-completion, never mid-build.**
   - **During active feature development: DO NOT extract for line count.** Files may freely exceed 600 lines while a feature is being built. Agents must not pause implementation to refactor, extract sub-components, or split files to satisfy the line limit. Premature extraction adds friction, creates churn, and produces worse component boundaries because the full picture isn't visible yet.
   - **After feature completion: run the tech-debt auditor workflow** (`.agent/workflows/qa/tech-debt-auditor.md`). Any file over 600 lines is flagged as active debt and extracted in a dedicated refactoring pass. This is the **only** point where the guardrail is enforced.
   
   *Rationale:* Every god-component in this project (WorkoutScreen 1600→385, SplitsScreen 1258→225, AnalyticsScreen 902→148, CalendarScreen 1056→310) followed the same pattern: grew during multi-phase development, then was cleanly extracted once boundaries were stable. The right abstraction only becomes obvious after the feature is complete. Mid-build extraction consistently produces inferior splits that need re-extraction later.

2. **Avoid `any` types**
   Do not use `any` in TypeScript. If `any` is truly unavoidable (e.g., React Native API quirks like `Alert.alert` button arrays), add a `// eslint-disable-next-line` comment with a short justification.

3. **Database schema changes require versioned migrations**
   All database schema changes must go through a versioned migration in the migration system. Never modify the schema inline or alter existing migration files.

4. **Hook extraction signal: 3+ `useState` for one concern**
   When a component needs more than 3 `useState` hooks for a single concern (e.g., keyboard state, data fetching), extract that concern into a custom hook in `src/hooks/`.

5. **Canonical types live in `src/models/`**
   Service files must not re-declare model types. Import from `src/models/` instead. If a service only needs a subset of fields, define a minimal interface locally (e.g., `TemplateSummary`) rather than re-exporting a conflicting type.

6. **State reset on lifecycle boundaries**
   Hooks that manage state tied to a specific entity (e.g., a workout, a split) must reset their state when that entity's identity changes. Use a `useEffect` watching the entity's ID and a `useRef` to track the previous value.

7. **SafeAreaView edges must match tab bar visibility**
   The custom tab bar already handles `insets.bottom`. When it hides (active workout, profile sub-screens), screens must provide their own bottom safe area. Rules:
   - **Tab bar visible** → Use plain `<View>` (tab bar handles bottom inset)
   - **Tab bar hidden + stack header** → Use `<SafeAreaView edges={['bottom']}>` (header handles top)
   - **Tab bar hidden + no header** → Use `<SafeAreaView edges={['top', 'bottom']}>`
   - Never use `edges={[]}` or omit bottom when the tab bar is hidden — this causes content to clip behind the system navigation bar.

### Git Practices
- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`
- Feature branches from `main`
- Squash merge for clean history
- Meaningful commit messages

### Agent Commit Message Convention
**At the end of every coding task**, the agent should provide a suggested commit message following this format:

```
<type>(<scope>): <short description>

<optional body with more details>
```

**Types**: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
**Scope**: Component or feature area (e.g., `splits`, `workout`, `database`)

Example:
```
feat(splits): add rest days support in split creation

- Added splits_schedule table for rest day storage
- Updated SplitsScreen with Add Rest Day button
- Schedule preview shows ordered templates + rest days
```

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
├── hooks/         # Custom React hooks (one concern per hook)
├── models/        # Data models/entities (canonical types)
├── stores/        # Zustand stores
├── services/      # Business logic, data access
├── utils/         # Helper functions
├── theme/         # Colors, spacing, typography tokens
└── assets/        # Static resources
```

---

## Last Updated
- Date: 2026-03-23
- Session Context: Strengthened guardrail #1 — agents must NOT extract mid-build for line count; extraction happens exclusively via post-completion tech-debt auditor workflow
