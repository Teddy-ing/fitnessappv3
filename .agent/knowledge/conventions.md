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

8. **Batch `IN (...)` queries must be chunked at 500 IDs**
   SQLite has a compile-time limit of 999 bound parameters (`SQLITE_MAX_VARIABLE_NUMBER`). Any query that builds `WHERE x IN (?,?,?...)` with a dynamic list must chunk IDs into batches of 500 and merge results. A user with ~3 years of daily workouts will exceed 999 IDs.
   
   *Pattern:*
   ```typescript
   const BATCH_SIZE = 500;
   const allResults = [];
   for (let i = 0; i < ids.length; i += BATCH_SIZE) {
       const batch = ids.slice(i, i + BATCH_SIZE);
       const placeholders = batch.map(() => '?').join(',');
       const rows = await db.getAllAsync(`... IN (${placeholders})`, batch);
       allResults.push(...rows);
   }
   ```

9. **Services must not reach into stores**
   Service files (`src/services/`) must never import from `src/stores/` or call `useXStore.getState()`. Services return data; the caller (screen, hook, or store action) decides what to do with it. This keeps services testable and prevents invisible coupling.
   
   *Bad:* `workoutService.ts` calling `useGoalCelebrationStore.getState().celebrate(completed)` after save.
   *Good:* `saveWorkout()` returns a result, and the caller in `WorkoutScreen.tsx` triggers the celebration.

10. **Shared SQL formulas live in one canonical location**
    Any SQL formula or filter used in more than one service must be defined once and imported. Duplicated formulas drift silently — one copy gets a bugfix, the others don't.
    
    Currently duplicated:
    - Epley 1RM: `weight * (1.0 + reps / 30.0)` — in `analyticsService`, `calendarService`, `goalProgressService`
    - Volume: `SUM(weight * reps)` — same three files
    - Status filter: `w.status = 'completed'` — missing in `goalProgressService` but present elsewhere
    
    *Approach:* Create string-builder helpers or constants in a shared `src/services/sqlFragments.ts`, or centralize the computation in one service that others call.

11. **New tables must be registered in `clearAllData()`**
    Every migration that creates a new table must also add a corresponding `DELETE FROM <table>` line in `database.ts → clearAllData()`. Without this, "clear all data" leaves orphaned rows that corrupt imports and dev testing. Add a comment in `clearAllData()` referencing the migration version for each table.

12. **`updateX()` must use UPDATE, not delete-then-reinsert**
    Update functions must use SQL `UPDATE` statements on the existing rows. The pattern of deleting a parent + all children and re-inserting them is fragile: any table with a foreign key reference that isn't `ON DELETE CASCADE` will silently orphan data. If a complex update is truly needed (e.g., replacing all child rows), use `DELETE` only on the children being replaced, and `UPDATE` the parent row in-place.

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
- Date: 2026-03-24
- Session Context: Added guardrails 8–12 from staff engineer code audit — batch IN() chunking, service-store decoupling, shared SQL formulas, clearAllData coverage, and UPDATE-not-delete patterns
