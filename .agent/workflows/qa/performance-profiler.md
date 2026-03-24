---
description: Step-by-step workflow for running the Performance Profiler QA pass on code diffs
---

# Performance Profiler QA Workflow

Focused review for performance regressions — the things that make the app feel sluggish, especially on budget Android devices.

## Prerequisites

- Access to `.agent/knowledge/qa/performance-baseline.md`
- Diff or list of changed files for the feature under review
- Ideally: a mid-range Android device or emulator for manual spot-checks

---

## When to Run

- **After building UI-heavy features** (new screens, list views, charts)
- **After touching Zustand stores** (selector changes affect re-render scope)
- **After adding/modifying SQLite queries** (regression risk for N+1 patterns)
- **Before any release** (perf regression check)

---

## Steps

1. **Identify the scope**
   - Get the list of new/modified files from `current-progress.md`
   - Flag files that are: screens, components with lists, stores, services with queries, chart renderers

2. **Run the Performance Profiler prompt**
   - Open a new chat session
   - Paste the tailored Performance Profiler prompt (from `tailored_qa_prompts.md` or below)
   - Attach the diff or changed files as context
   - Let the reviewer run to completion

3. **Triage findings**
   - For each issue reported, classify:
     - **🔴 Confirmed regression** — measurable or obvious (e.g., full-store subscription)
     - **🟡 Likely impact** — hard to measure but pattern is known-bad
     - **⚪ Negligible** — technically true but impact is trivial for this app's scale
   - Add confirmed/likely issues to `performance-baseline.md`

4. **Fix confirmed regressions**
   - Common quick fixes:
     - Add selector to `useWorkoutStore(s => s.specificField)`
     - Wrap list items in `React.memo`
     - Add `useMemo` around chart data computations
     - Add `keyExtractor` to FlatLists
   - Update `performance-baseline.md` → move to Resolved section

5. **Spot-check on device (optional but recommended)**
   - Run the app on a mid-range Android device/emulator
   - Navigate through the changed screens
   - Look for: jank on scroll, slow screen transitions, delayed input response
   - Note any subjective sluggishness in baseline doc

---

## The Prompt

> Act as a Performance Optimization Specialist for a **React Native 0.81 + Expo** mobile app running on mid-range Android devices. The app uses **Zustand** stores, **expo-sqlite** for all data, and **react-native-gifted-charts** for analytics rendering. Review this diff strictly for performance degradation. Ignore general bugs and architecture. Focus entirely on:
>
> - **Zustand selector granularity** — are components subscribing to the entire store or using fine-grained selectors? Look for `useWorkoutStore()` without a selector (triggers re-render on *any* state change in the store).
> - **FlatList / ScrollView performance** — missing `keyExtractor`, missing `React.memo` on row components, inline arrow functions as props causing re-renders on every frame.
> - **SQLite query efficiency** — N+1 query patterns (the project has fixed these before), missing indexes on frequently filtered columns (`exercise_muscle_groups`), large result sets not paginated.
> - **Chart rendering cost** — `react-native-gifted-charts` with `labelComponent` custom renderers can be expensive. Flag any chart that recomputes data on every render instead of memoizing with `useMemo`.
> - Memory leaks: un-cleared `setInterval`/`setTimeout` (rest timer), lingering event listeners, large arrays held in closure scope.
> - **Do NOT flag component size violations** (>600 lines) — those are tracked by the Tech Debt Auditor workflow, not this one.
> - UI thread blocking: synchronous SQLite calls on mount, heavy `JSON.parse()` in render path (exercise muscle groups are stored as JSON strings in DB rows).
> - **Image / asset loading** — exercise icon placeholders; ensure no synchronous `require()` chains in list renders.
>
> Be specific about **which device tier will feel this** (flagship vs budget Android) and how to optimize it.

---

## Checklist Areas (What the Prompt Targets)

| Area | What to Look For |
|------|-----------------|
| Zustand selectors | `useStore()` without selector → full re-render on any change |
| FlatList/ScrollView | Missing `keyExtractor`, `React.memo`, inline arrow props |
| SQLite queries | N+1 patterns, missing indexes, unpaginated large results |
| Chart rendering | `useMemo` on data arrays, expensive `labelComponent` renderers |
| Memory leaks | Uncleared intervals/timeouts, lingering listeners |
| Component size | **Out of scope** — tracked by Tech Debt Auditor |
| UI thread blocking | Sync SQLite on mount, `JSON.parse` in render path |
| Asset loading | Sync `require()` chains in list renders |

---

## Stop Conditions

The pass is COMPLETE when:
- All files in scope have been reviewed
- All findings are triaged (confirmed / likely / negligible)
- Confirmed regressions are fixed or logged in baseline
- Optional device spot-check done (or noted as skipped)

---

## Last Updated
- Date: 2026-03-23
- Session Context: Scoped out component size violations — those belong to the Tech Debt Auditor workflow
