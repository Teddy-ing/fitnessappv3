---
description: Active coding conventions, data-safety patterns, and project structure
---

# Project Conventions

## Current update — 2026-10-02

IronJot uses **React Native, Expo, TypeScript, Zustand, and expo-sqlite**. [AGENTS.md](../../AGENTS.md) is the active working agreement and takes precedence over older procedures in the knowledge and workflow folders.

These conventions retain useful implementation guidance. Fixed file-size and hook-count limits, mandatory multi-chat QA, required PRDs, exhaustive audit baselines, and a log entry for every exchange are retired. Extract code when responsibilities or reuse justify it.

## Code and state

- Prefer clear names, typed interfaces, and cohesive functions. Explain non-obvious decisions without narrating straightforward code.
- Avoid `any` where a specific type or `unknown` with narrowing works. Keep canonical domain models in `src/models/`; local projection/result types can live beside their use.
- Services return data and do not import stores. Screens, hooks, and store actions coordinate UI state and side effects.
- State tied to an entity must reset or rehydrate when its identity changes. Preserve drafts and active workout state during theme changes and ordinary navigation.
- Reuse existing hydration, batching, formulas, unit-conversion, and write-coordination helpers before adding parallel implementations.

## Database and data ownership

1. Add schema changes as new versioned migrations in `src/services/migrations.ts`. Do not rewrite shipped migrations. Verify both a fresh database and an upgrade.
2. Store weight canonically in pounds. Convert at input/display boundaries through `src/utils/unitConversion.ts`; preserve existing conventions for other measurements and imported data.
3. Keep related writes atomic and use the established database write lock. Guard non-idempotent actions against concurrent invocation and double taps, with a synchronous guard before the first `await` where needed.
4. Update parent records in place. Replacing children can be appropriate, but deleting and recreating a parent risks breaking identities, references, and history.
5. Carry persisted fields through save/load, backup/restore, relevant import/export, and data clearing. Register new user-data tables in the relevant export/clear lists and preserve compatibility with older backups.
6. Use batch queries for multi-entity work instead of N independent reads. Reuse `src/utils/batchQuery.ts` and `batchInsert.ts`, including their parameter-budget handling. The established ID batch size is 500; account for additional placeholders when constructing custom queries.
7. Keep shared SQL formulas in `src/utils/sqlFragments.ts` and equivalent JavaScript calculations in `src/utils/formulas.ts`. Avoid independently maintained copies of volume and estimated-1RM calculations.
8. Restore operations must make their replacement behavior clear and must not leave a partial database on failure. Photo files require explicit handling beyond database rows; the current JSON format only includes their paths.

## UI and navigation

- Use `useThemeColors` and `createThemedStyles` from `src/theme` for reactive palette access. Do not capture a palette once at module load. Use semantic colors, including `text.onAccent` for text on filled actions.
- IronJot is the default theme; Classic Purple is optional. The icon and startup artwork retain IronJot brand colors.
- Workout and Profile each own a stack. Shared detail/settings routes belong to the caller's stack. Ordinary Back pops that stack; explicit workout-entry actions use the existing navigation helpers.
- Only the focused screen should respond to screen-specific Android Back handling. Nested editors and pickers close before their parent.
- Match safe-area handling to navigation ownership. The visible tab bar supplies its bottom inset; a screen without it must account for the bottom system area. A native stack header normally handles the top inset. Avoid adding duplicate padding.
- Preserve accessible labels, readable numeric inputs, and adequate touch targets. Check changed native interactions on a device or emulator when available; automated tests alone do not establish mobile layout or lifecycle behavior.

## Naming and layout

- Prefer descriptive names; booleans commonly use `is`, `has`, `can`, or `should`.
- Use `Workout` for a session, `Exercise` for an activity, `WorkoutSet` for a logged set, `Template` for a reusable workout, and `Split` for an ordered schedule of templates and rest days.
- Keep reusable UI in components, screen orchestration in screens/hooks, domain types in models, and persistence/business logic in services.

```text
src/
├── components/    # Reusable UI and feature-specific component groups
├── screens/       # Full-screen views
├── hooks/         # Stateful behavior and screen coordination
├── models/        # Canonical domain types
├── stores/        # Zustand state and workout persistence
├── services/      # Data access, calculations, migrations, imports
├── navigation/    # Routes, stacks, tabs, navigation helpers
├── theme/         # Palettes, shared tokens, reactive theme runtime
├── data/          # Bundled data and generated registries
└── utils/         # Shared pure helpers and database coordination
assets/            # Branding, exercise images, and other bundled assets
```

## Verification and handoff

For code changes, run `npm run typecheck` and relevant Jest tests. Run `npm test -- --runInBand` when shared behavior or broad integration warrants the full suite. Add tests for meaningful behavior, calculations, persistence, and regressions; do not add tests merely to exercise documentation changes. Run lint only when its tooling and configuration are available.

Use a separate review for substantive changes as described in AGENTS.md. Report confirmed defects, remaining risks, and unperformed checks accurately. Record a short substantive outcome in [current progress](current-progress.md), with durable product or architecture decisions in the relevant knowledge file.

Work on the selected branch and preserve unrelated edits. Do not commit, push, merge, publish, or release without explicit authorization. If a commit is requested, conventional prefixes such as `feat:`, `fix:`, `docs:`, `refactor:`, and `test:` remain useful; a commit-message proposal is not required for every exchange.

## Maintaining the project records

- Keep one current follow-up list in `current-progress.md`. Add simple dated outcome entries that say what changed and include meaningful verification or an unresolved limitation.
- Link older logs and plans as dated archives. Keep their original context distinct from current status; use a capture date when the original date is unknown.
- Avoid Latest/Previous outcome labels, repeated branch/install notes, and step-by-step design-option deliberations. Put reusable build instructions in project configuration and technical decisions in the relevant reference file.
- App Vision holds durable product direction. Delivery logs belong in Current Progress. Preserve useful original strategy in other product documents and add a dated update when the app changes.

## Document history

- **January–April 2026:** Original conventions and guardrails developed alongside implementation. Their rationale is preserved in the [April 13 conventions archive](progress-archive/2026-04-13-conventions.md).
- **2026-10-02:** Active conventions reconciled with AGENTS.md and the current theme, navigation, and data architecture.
