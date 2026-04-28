---
description: Tracking document for logic bugs, runtime errors, and edge case findings from Bug Hunter QA passes
---

# Bug Hunter Audit Baseline

## Summary

- **Last full pass:** 2026-04-13 (Settings Revamp + Canonical Weight Storage — 24 files)
- **Last scoped pass:** 2026-04-28 (Phase 6: Import, Export & Cloud Backup — 15 files)
- **Open issues:** 2 (Critical: 0, High: 0, Medium: 0, Low: 1, Deferred: 1)
- **Fixed since baseline:** 55

---

## Open Issues

### Deferred

#### BH-058 · `dbInitFailed` is permanent — no retry, no recovery, no user feedback
- **File:** [database.ts](file:///c:/Users/teddy/projects/workout-app/src/services/database.ts#L28-L44)
- **Phase:** Latent (Jan 2026 — foundational)
- **Description:** If `openDatabaseAsync` throws for any transient reason, `dbInitFailed = true` permanently. All data operations silently degrade.
- **Deferred to:** Pre-launch polish. Has never triggered. Requires crash reporting (TD-048) to detect in production. Fix: retry with backoff + user-facing error banner.

### Accepted

#### BH-060 · No FK constraint between `workout_exercises.exercise_id` and `exercises` table — **ACCEPTED 2026-04-17**
- **Rationale:** The denormalized exercise snapshots in workout rows mean historical workouts display correctly even if the exercise is deleted. The only crash path (navigating to deleted exercise details) is already handled by BH-039's null guard. The index on `exercise_id` was already added (PP-076). Soft-delete would be a feature decision, not a bug fix.

#### BH-036 · `WorkoutSettingsMenu` 2-column bypass on rapid toggles — **ACCEPTED 2026-04-17**
- **Rationale:** Requires impossibly fast taps + React batching failure. `disabled` prop is a secondary guard. Theoretical only — no user could reasonably trigger this.

### Low (Defensive Gaps)

#### BH-061 · Persisted workout `as Workout` cast with no runtime validation
- **File:** [workoutStore.ts](file:///c:/Users/teddy/projects/workout-app/src/stores/workoutStore.ts) → `restoreWorkout()`
- **Phase:** Latent (Mar 2026 — TD-021 persistence)
- **Description:** `loadPersistedWorkout()` casts persisted data as `Workout` with no runtime validation or schema versioning. If the model changes between app versions, the persisted JSON silently loads a malformed object. Note: TD-051 replaced `unknown` with `Workout | null` which adds compile-time protection, but runtime validation on load is still missing.
- **Likelihood:** Low — only triggers on model schema changes between app updates.
- **Impact:** Corrupted in-memory workout state after restore.
- **Fix:** Add `schemaVersion` field. On mismatch, discard or migrate.
- **Deferred to:** Before first model schema change (Phase 6 or 7).

---

## False Positives Reviewed

| Concern | Reviewed Area | Why Not a Bug |
|---------|--------------|---------------|
| `SCREEN_WIDTH` stale on rotation | `ExerciseAnalyticsScreen.tsx:30-31`, `AnalyticsScreen.tsx:49-50`, `TrendsTab.tsx:42`, `GalleryTab.tsx:41`, `ChartsTab.tsx:28-29` | Module-level `Dimensions.get()` would be stale on rotation, but this is a portrait-locked mobile fitness app — acceptable. |
| `lastMonth` mutable in `.map()` | `AnalyticsScreen.tsx:205`, `ExerciseAnalyticsScreen.tsx:115,244` | Looks like a stale closure, but `lastMonth` is a `let` variable in the *render scope* above the `.map()`, capturing correctly via closure. Data is sorted by date, so mutation during iteration produces correct month-header logic. |
| Missing error handling in `ConsistencyCards` / `FatigueRatioBanner` | Both components | Service functions already return safe defaults on failure; components correctly handle null/zero states. Not a gap. |
| `safeJsonParse` doesn't validate shape | `analyticsService.ts:444,534` | `safeJsonParse` returns `as T` without runtime validation, but the `MuscleContribution[]` data is written by the app itself (not user input) and validated at write time. Acceptable given data provenance. |
| `backfillPersonalRecords` called without `await` | `CalendarScreen.tsx:592` | The backfill is fire-and-forget by design — it's idempotent and gated by the `pr_backfill_complete` flag. Blocking the UI load on a potentially expensive backfill would degrade UX. Acceptable. |
| `searchNotes` N+1 query pattern | `calendarService.ts:671-680` | Each workout row triggers a separate `SELECT` for exercise notes. With typical journal usage (10-50 entries), this is within acceptable bounds. Could be optimized later if journals grow large. |
| `JournalView` debounce timer not cleared on unmount | `JournalView.tsx:99,117-123` | The `setTimeout` ref could fire after unmount, but the effect would only call `setEntries` / `setLoading` on an unmounted component. React suppresses this as a no-op warning. Low-priority cleanup. |
| `loadOlderMonths` captures `months` in closure | `CalendarScreen.tsx:633-656` | The `months` dependency in `useCallback` is correct — it reads `months[0]` to determine the oldest loaded month. The `isLoadingOlderRef` guard prevents re-entrancy. |
| `handleDiscardWorkout` stale closure on `activeWorkout` | `WorkoutScreen.tsx:214-224` | The `useEffect` dep array uses `[activeWorkout !== null]` (boolean coercion). This is intentional — the effect only needs to re-bind when transitioning between "has workout" and "no workout" states, not on every set update. **Note:** BH-032 identified a separate concern about `handleDiscardWorkout` as a function dep — the coercion itself remains a valid FP. |
| `SWIPE_HINT_FILE.write('1')` sync file write on mount | `WorkoutScreen.tsx:148` | expo-file-system `File.write()` is synchronous for small payloads in the new API, and this is a one-time operation on first-ever workout. No perf concern. |
| `getSettings()` called without error handling on mount | `WorkoutScreen.tsx:112-120` | `getSettings()` returns `DEFAULTS` on failure (database unavailable returns spread of DEFAULTS). The `.then()` safely applies defaults. No crash path. |
| `SetTypeMenu` / `RpeSelector` / `RirSelector` Modal rendered per set row | `SetRow.tsx:363-384` | Each SetRow renders 3 Modal components with `visible={false}`. React Native `<Modal visible={false}>` does not mount a native modal view — it's a no-op. Performance-profiler concern, not a logic bug. |
| `getPreviousSetsForExercises` N+1 query pattern | `workoutService.ts:511-523` | Each exerciseId fires a separate query inside `Promise.all`. With typical workout sizes (3-8 exercises), this is O(n) with n < 10. Could be batched into a single CTE query but not a correctness issue. |
| `updateSettings` fire-and-forget in `handleToggleSetting` | `WorkoutScreen.tsx:122-128` | The async `updateSettings` call is not awaited in the toggle handler. Optimistic state update already applied, and settings writes are idempotent. A failed write means the toggle won't persist — edge case, not a crash. |
| `noteInput` useState not re-synced on external note change | `ExerciseCard.tsx:97` | `noteInput` is initialized from `workoutExercise.note` on first render. If the note changes externally, `useState` initializer doesn't re-run. However, `handleAddNote` (line 141) calls `setNoteInput(workoutExercise.note ?? '')` before opening the editor, overwriting the stale initial value at interaction time. Effectively safe. |
| `DailyWorkoutModal` filter matching logic (AND vs OR) | `CalendarScreen.tsx:163-166` | `matchesFilter` uses AND semantics: a day must match *all* active filters to avoid dimming. This is intentional — PRs + Notes means "show days with both PRs AND notes." |
| `loadSparklines` fires only on mount (empty deps) | `TrendsTab.tsx:793-795` | `loadSparklines` is called via `useEffect([], [])`. The sparkline list doesn't auto-refresh when the user logs new data on the Track tab and switches to Trends. However, this is acceptable — the component remounts when switching tabs because it's conditionally rendered (`activeTab === 'trends'`), so the `useEffect` fires each time. |
| `loadData` / `loadFields` defined with `useCallback` but called from `useEffect` without cleanup | `MeasurementsScreen.tsx:619-665` | The async calls fire without an abort signal. However, the result is only `setState` calls, which are safe on unmounted components (React suppresses). No data-corruption risk. |
| `commitValue` reads `focusedIndex` from closure | `MeasurementsScreen.tsx:728-755` | `focusedIndex` is read from the closure inside `commitValue`. Because `setFocusedIndex` updates are synchronous within the same render batch, and `commitValue` is always called in the same tick as the keyboard handler, the closure captures the correct value. |
| `SparklineSVG` gradient `id` collision across multiple sparklines | `TrendsTab.tsx:99` | All sparklines use `id="sparkGrad"` for the gradient. In React Native SVG, each `<Svg>` element is an isolated SVG document, so IDs don't collide across components. Not a bug. |
| `getFieldType` returns `'weight'` for all types | `MeasurementsScreen.tsx:780-785` | The comment says "Body Fat % → percentage, everything else → weight-like decimal" but both branches return `'weight'`. This is intentional — the keyboard layout for weight (decimal numbers) works for all measurement types including percentages. No bug. |
| `GoalCelebrationOverlay` `handleDismiss` stale closure | `GoalCelebrationOverlay.tsx:55-62` | `handleDismiss` is defined as a plain function (not `useCallback`) and references `timerRef`, `slideAnim`, `opacityAnim`, and `dismiss`. All of these are refs or Zustand selectors (stable references), so no stale closure risk. The `dismiss` function from Zustand is stable across renders. |
| `GoalCelebrationOverlay` auto-dismiss timer not cleared between queue items | `GoalCelebrationOverlay.tsx:55-62` | The `useEffect` cleanup function clears `timerRef.current` on unmount or when `currentGoal?.id` changes. Between queue items, the `dismiss()` call triggers a re-render with a new `currentGoal?.id`, which triggers cleanup → new effect. Safe. |
| `computeExerciseVolume` includes non-working sets | `goalService.ts:317-336` | Volume query doesn't filter by `ws.type = 'working'`, unlike 1RM and max-reps. This is intentional — total session volume includes warmup and drop sets for volume-tracking goals. |
| `resolveDisplayInfoBatch` N+1 for exercise goals | `GoalsScreen.tsx:140-159` | Each exercise goal calls `getExerciseById()` individually. With typical goal counts (1-10), this is acceptable. The exercise service has a module-level cache (PP-012 resolved), so these are in-memory lookups. |
| `loadGoals` callback defined with empty deps | `GoalsScreen.tsx:119-134` | `loadGoals` is defined with `useCallback([], [])`. It's called from `useEffect` on mount and as `onCreated` callback. Since it doesn't read any state from the component, empty deps are correct. |
| `GoalCreationModal` prefill `useEffect` missing `prefillData` in deps | `GoalCreationModal.tsx:73-81` | The `useEffect` watches `[visible]` but not `prefillData`. This is intentional — `prefillData` is set before `visible` is toggled to `true`, so the effect always sees the current value. Adding `prefillData` would cause double-fire when both change in the same render cycle. |
| `contextGoal` stale in `Alert.alert` callback | `GoalsScreen.tsx:201-263` | `contextGoal` is captured in the `onPress` closure inside `Alert.alert`. Since `setContextGoal(null)` is called at line 263 *after* the switch, and the Alert callbacks fire asynchronously (user must tap), the captured `contextGoal` is still valid at the time the user taps. Not a bug. |
| `WidgetGrid` `useCallback([widgets])` for `loadData` | `WidgetGrid.tsx:167-176` | `widgets` array reference changes on add/remove/reorder. Data refreshes happen on mount via `isFocused` in parent. Acceptable. |
| `PinnedExerciseWidget` always assumes positive = good (green) | `PinnedExerciseWidget.tsx:75` | For exercise metrics (1RM, volume), increasing is always desirable. No "cut" analogue for bench press. Correct behavior. |
| `BodyweightSparklineWidget` hardcodes `unit = 'lbs'` default | `BodyweightSparklineWidget.tsx:46` | Fallback default; parent should pass correct unit. Minor UX issue for kg users, not a runtime bug. |
| `SwipeableTabScreen` fling gesture during vertical scroll | `SwipeableTabScreen.tsx:67-96` | `Gesture.Fling()` requires fast directional swipe; `Gesture.Race()` means first gesture wins. Standard RNGH pattern — no conflict with vertical scrolls. |
| `tabContent` in `useMemo` remounts tabs on switch | `ExerciseDetailsScreen.tsx:119-130` | Each tab switch creates a new component instance via `useMemo`, remounting and re-fetching. Intentional — each tab manages its own loading state. Not expensive since tabs are lightweight and `useMemo` prevents unnecessary re-renders when other props change. |
| `handleSaveNote` async without error boundary | `AboutTab.tsx:133-144` | `saveExerciseNote` and `getExerciseNotes` have try/catch blocks internally that log and return safe defaults. No unhandled promise rejection path. |
| `ExerciseAnalyticsScreen` still in codebase but no route | `ExerciseAnalyticsScreen.tsx` | Dead code — no route points to it after `AppNavigator` switched to `ExerciseDetailsScreen`. Can be deleted in cleanup pass. Not a runtime bug. |
| `handleDeleteNote` optimistic local update | `AboutTab.tsx:147-163` | If `deleteExerciseNote` fails, the note disappears from UI but remains in DB. On next tab visit it reappears. Acceptable — waiting for DB confirmation introduces visible lag. |
| `computeEpley1RM` rounding to 1 decimal | `RecordsTab.tsx:38` | Standard Epley precision for gym users. No accuracy concern. |
| `getExerciseSessionHistory` volume excludes warmup sets | `exerciseDetailsService.ts:212` | Intentional per PRD — session volume = working set volume only. Consistent with goalProgressService volume pattern (documented FP). |
| `ExerciseCard` info icon visible on non-collapsed cards | `ExerciseCard.tsx:223-244` | PRD specifies icon should not appear on collapsed cards. The icon is inside the expanded view block (after the `if (isCollapsed)` early return at line 172), so it correctly hides when collapsed. |
| `backupToCloud` reads + writes DB without FK-safe ordering | `cloudBackupService.ts:311-336` | The write lock serializes against concurrent saves. The `generateExportPayload` is a read-only SELECT-all, and the only write is to `cloud_backup_config` (no FK deps). Safe. |
| `triggerAutoBackupIfEnabled` detached promise — unhandled rejection | `cloudBackupService.ts:452-476` | The entire body is wrapped in `try/catch` with inner try/catch for the failure-status update. All rejection paths are handled. Intentionally fire-and-forget per PRD. |
| `findBackupFile` query string not URL-encoded | `cloudBackupService.ts:212` | The filename `workout-backup-latest.json` contains no special characters that need encoding. The `name='...'` syntax is the Google Drive API's required format for the `q` parameter. Safe. |
| `uploadToDrive` multipart boundary collision risk | `cloudBackupService.ts:257` | The boundary `===backup_boundary===` is a fixed string. While theoretically it could appear in the JSON payload, the probability is negligible for workout data, and the Drive API would reject the upload with a clear error (not silent corruption). Accepted. |
| `connectGoogleDrive` INSERT OR REPLACE resets `auto_backup_enabled` to 0 | `cloudBackupService.ts:109-114` | This is intentional — reconnecting should start with auto-backup off until the user explicitly enables it. Per PRD design. |
| `exerciseMapper` Levenshtein is O(n*m) per comparison | `exerciseMapper.ts:23-47` | With typical exercise DB sizes (~200 built-in + custom) and CSV import sizes (~50 unique names), this is ~10k comparisons at O(20*20) each. Total: <1ms. Not a performance concern. |
| `strongParser` hardcodes `toCanonicalWeight(weightKg, 'kg')` | `strongParser.ts:133` | Strong's export format documentation confirms weights are always in kg. The canonical conversion is correct. |
| `fitnotesParser` per-row `Weight Unit` with `toCanonicalWeight` | `fitnotesParser.ts:206-208` | FitNotes genuinely has per-row weight units (user can mix kg/lbs). The per-row conversion is correct. |
| `ImportBottomSheet` modal closes before navigation | `ImportBottomSheet.tsx:94` | `onClose()` is called before `navigation.navigate()`, which is correct — the modal should dismiss before pushing a new screen. The navigation happens synchronously after `onClose()`. |
| `dataTransferService.importAllData` document picker outside write lock | `dataTransferService.ts:147-155` | Correct — user interaction (picker) must not be inside the lock. Lock is acquired only for the destructive DB operations. |
| `allMappingsResolved` treats `action === 'create'` as resolved | `exerciseMapper.ts:197-201` | Correct — exercises with `action: 'create'` will be created during `executeCompetitorImport`. They don't need user resolution. |
| `advanceOrShowSummary` re-derives unresolved from modified mappings | `ExerciseMappingScreen.tsx:145-159` | The logic creates a speculative copy of mappings to check how many are still unresolved after the current one would be resolved. This handles the edge case where the user resolves the last item and the `unresolvedMappings` memo hasn't updated yet. Correct. |
| `ExerciseMappingScreen` passes complex objects via route params | `ImportBottomSheet.tsx:99-106` | React Navigation serializes route params. `ParsedWorkout[]` and `ExerciseMapping[]` are plain objects (no functions, no circular refs), so they serialize correctly. For very large imports this could hit serialization limits, but that's a performance concern, not a logic bug. |
| `dbMutex` lockPromise captured before await | `dbMutex.ts:31-34` | This is the correct FIFO pattern. `previousLock` captures the *current* lock before replacing it, ensuring each caller awaits its predecessor. The `release!()` in `finally` is guaranteed to be assigned because the `new Promise` executor runs synchronously. |

---

## Resolved

#### BH-069 · `handleRestore` deps missing `executeRestore` — stale closure risk — **RESOLVED 2026-04-28**
- **Severity:** Low
- **Original status:** 🟢 Defensive gap
- **File:** [CloudBackupSection.tsx](file:///c:/Users/teddy/projects/workout-app/src/components/settings/CloudBackupSection.tsx#L139)
- **Root cause:** `handleRestore` captured `executeRestore` in an Alert callback but didn't list it in `useCallback` deps. Currently safe (stable ref), but violates exhaustive-deps.
- **Fix applied:** Moved `executeRestore` definition above `handleRestore`, added `[executeRestore]` to deps.

#### BH-068 · `ExportBottomSheet` swallows export failures silently — **RESOLVED 2026-04-28**
- **Severity:** Low
- **Original status:** 🟢 Edge case
- **File:** [ExportBottomSheet.tsx](file:///c:/Users/teddy/projects/workout-app/src/components/settings/ExportBottomSheet.tsx#L43-L59)
- **Root cause:** `handleExport` had try/finally with no catch. On failure, sheet closed with no user feedback.
- **Fix applied:** Added `catch (error)` block with `Alert.alert('Export Failed', ...)` before the `finally` block.

#### BH-067 · `cloudBackupService.restoreFromCloud` row-by-row INSERT — no batching — **RESOLVED 2026-04-28**
- **Severity:** Low
- **Original status:** 🟢 Performance / guardrail compliance
- **File:** [cloudBackupService.ts](file:///c:/Users/teddy/projects/workout-app/src/services/cloudBackupService.ts#L397-L416)
- **Root cause:** Cloud restore inserted rows one at a time, violating guardrail #13 (bulk imports must use chunked batch INSERT).
- **Fix applied:** Added `BATCH_SIZE = 500` chunking loop matching `competitorImportService` pattern.

#### BH-066 · `RESTORE_TABLES` hardcoded duplicate of `EXPORT_TABLES` — maintenance drift risk — **RESOLVED 2026-04-28**
- **Severity:** Medium
- **Original status:** 🟡 Maintainability
- **File:** [cloudBackupService.ts](file:///c:/Users/teddy/projects/workout-app/src/services/cloudBackupService.ts#L381-L386)
- **Root cause:** `restoreFromCloud` defined its own `RESTORE_TABLES` constant that had to exactly mirror `EXPORT_TABLES` from `dataTransferService.ts`. A future table addition could be missed.
- **Fix applied:** Exported `EXPORT_TABLES` from `dataTransferService.ts` and imported it in `cloudBackupService.ts`. Single source of truth.

#### BH-065 · `executeCompetitorImport` custom exercise creation not under write lock — **RESOLVED 2026-04-28**
- **Severity:** Medium
- **Original status:** 🟡 Concurrency
- **File:** [competitorImportService.ts](file:///c:/Users/teddy/projects/workout-app/src/services/competitorImportService.ts#L119-L133)
- **Root cause:** Custom exercises were created outside any write lock. A concurrent auto-backup could snapshot exercises without their associated workouts.
- **Fix applied:** Wrapped entire `executeCompetitorImport` body in `withWriteLock()` to serialize against concurrent writes.

#### BH-064 · Hevy parser maps both `abdomen_in` and `waist_in` to `'waist'` — duplicate measurements — **RESOLVED 2026-04-28**
- **Severity:** Medium
- **Original status:** 🟡 Data integrity
- **File:** [hevyParser.ts](file:///c:/Users/teddy/projects/workout-app/src/services/importParsers/hevyParser.ts#L250-L251)
- **Root cause:** Both `abdomen_in` and `waist_in` mapped to the same `'waist'` type ID. If a Hevy CSV had both columns with values, it produced duplicate measurements for the same date/type.
- **Fix applied:** Removed `waist_in` mapping. `abdomen_in` → `'waist'` is sufficient.

#### BH-063 · `ExerciseMappingScreen` calls `setShowSummary(true)` during render — **RESOLVED 2026-04-28**
- **Severity:** Medium
- **Original status:** 🟡 React correctness
- **File:** [ExerciseMappingScreen.tsx](file:///c:/Users/teddy/projects/workout-app/src/screens/ExerciseMappingScreen.tsx#L320-L323)
- **Root cause:** `setShowSummary(true)` was called directly in the render body (not inside `useEffect`), violating React's rendering contract and triggering "Cannot update component while rendering another component" warnings.
- **Fix applied:** Moved to `useEffect(() => { if (!currentMapping && !showSummary) setShowSummary(true); }, [currentMapping, showSummary])`. Render body now returns `null` without side effects.

#### BH-062 · `createWorkoutExercise` hardcodes first set as warmup regardless of settings — **RESOLVED 2026-04-16**
- **Severity:** Low
- **Original status:** 🟡 Latent
- **File:** [workout.ts](file:///c:/Users/teddy/projects/workout-app/src/models/workout.ts#L226-L240)
- **Root cause:** Factory always marked `i === 0 && exercise.category === 'strength'` as warmup. Setting warmups to 0 still produced 1 warmup set.
- **Fix applied:** Added `warmupSets` parameter (defaults to 0) to `createWorkoutExercise`. Only creates warmup sets for strength exercises when `warmupSets > 0`. `WorkoutScreen` now passes the user's `defaultWarmupSets` setting via `addWarmupSets()` after adding each exercise.

#### BH-059 · `handleFinishWorkout` double-tap race condition — **RESOLVED 2026-04-16**
- **Severity:** High
- **Original status:** 🔴 Latent
- **File:** [WorkoutScreen.tsx](file:///c:/Users/teddy/projects/workout-app/src/screens/WorkoutScreen.tsx#L208-L299)
- **Root cause:** `handleFinishWorkout` chained 6+ async operations with no guard against concurrent invocation. A double-tap would race two save operations.
- **Fix applied:** Added `isSavingRef = useRef(false)` guard per guardrail #14. Set synchronously before first `await`, cleared in `finally`.

#### BH-051 · `keepAwakeDuringWorkout` stale after Settings toggle — **RESOLVED 2026-04-16**
- **Severity:** Medium
- **Original status:** 🟡 Plausible
- **File:** [useWorkoutSettings.ts](file:///c:/Users/teddy/projects/workout-app/src/hooks/workout/useWorkoutSettings.ts), [WorkoutScreen.tsx](file:///c:/Users/teddy/projects/workout-app/src/screens/WorkoutScreen.tsx)
- **Root cause:** Settings loaded once on mount via `getSettings().then(...)` with empty deps. Toggling keepAwake in SettingsScreen didn't propagate to already-mounted WorkoutScreen tab.
- **Fix applied:** Extracted `refreshSettings()` callback from `useWorkoutSettings`. WorkoutScreen calls it on focus via `useIsFocused()` + `useEffect`. All settings (not just keepAwake) now refresh when the tab regains focus.

#### BH-055 · `SettingsScreen.handleUpdate` no rollback on DB write failure — **RESOLVED 2026-04-16**
- **Severity:** Medium
- **Original status:** 🟡 Plausible
- **File:** [SettingsScreen.tsx](file:///c:/Users/teddy/projects/workout-app/src/screens/SettingsScreen.tsx#L79-L101)
- **Root cause:** Optimistic state update followed by bare `await updateSettings()`. On failure, local state showed new value but DB retained old value, causing silent revert on restart.
- **Fix applied:** Added try/catch with rollback to `previousSettings` snapshot + `Alert.alert` on failure.

#### BH-057 · `weightUnit` stale in WorkoutSettingsMenu label — **RESOLVED 2026-04-13**
- **Severity:** Medium
- **Original status:** 🟡 Plausible
- **File:** [useWorkoutSettings.ts](file:///c:/Users/teddy/projects/workout-app/src/hooks/workout/useWorkoutSettings.ts#L43)
- **Root cause:** `weightUnit` stored as local `useState` loaded once on mount. If user changed unit in SettingsScreen and returned, the WorkoutSettingsMenu stepper showed stale "5 lbs" instead of "5 kg".
- **Fix applied:** Replaced `useState('lbs')` with `useWeightUnit()` subscriber hook, which auto-updates via module-level cache invalidation.

#### BH-053/054 · `loadWeightUnit` unhandled promise rejection + stuck cache — **RESOLVED 2026-04-13**
- **Severity:** High
- **Original status:** 🔴 Confirmed
- **File:** [useWeightUnit.ts](file:///c:/Users/teddy/projects/workout-app/src/hooks/useWeightUnit.ts#L26-L37)
- **Root cause:** `getSettings().then(...)` had no `.catch()`. A DB init race caused an unhandled rejection and left `cachePromise` as a rejected promise permanently, making all future weight unit reads also fail.
- **Fix applied:** Added `.catch()` that logs a warning, resets `cachePromise = null` (so next call retries), and returns `'lbs'` as fallback.

#### BH-052 · Floating-point noise in MacroAnalyticsView chart data — **RESOLVED 2026-04-13**
- **Severity:** Low
- **Original status:** 🟡 Plausible
- **File:** [MacroAnalyticsView.tsx](file:///c:/Users/teddy/projects/workout-app/src/components/analytics/MacroAnalyticsView.tsx#L121)
- **Root cause:** `convertWeight(value, weightUnit)` used without rounding in chart data transformation. In kg mode, produced values like `102.0582` which showed excessive decimal precision in chart tooltips and Y-axis labels.
- **Fix applied:** Added `Math.round(... * 10) / 10` to match the rounding pattern used in all other conversion call sites.

#### BH-050 · `handleBackspace` treats weight value `0` as null — **RESOLVED 2026-04-13**
- **Severity:** Medium
- **Original status:** 🔴 Confirmed
- **File:** [useWorkoutKeyboard.ts](file:///c:/Users/teddy/projects/workout-app/src/hooks/useWorkoutKeyboard.ts#L149)
- **Root cause:** `numValue && !isNaN(numValue)` is falsy when `numValue === 0`. Typing or backspacing to `0` silently stored `null` instead of `0`, making bodyweight exercises impossible to set to 0 weight.
- **Fix applied:** Changed to `numValue != null && !isNaN(numValue)`.

#### BH-042 · React key collision for warmup sets in HistoryTab — **RESOLVED 2026-04-10**
- **Severity:** Low
- **Original status:** 🟡 Plausible
- **File:** [HistoryTab.tsx](file:///c:/Users/teddy/projects/workout-app/src/components/exerciseDetails/HistoryTab.tsx#L64)
- **Root cause:** Set row keys used `{set.setNumber}-${set.type}`. Warmup sets all had `setNumber: 0` and `type: 'warmup'`, so multiple warmups produced duplicate keys.
- **Fix applied:** Changed `.map((set) => ...)` to `.map((set, idx) => ...)` and key to `key={idx}`.

#### BH-041 · `ExerciseCard` info button `as any` cast documented — **RESOLVED 2026-04-10**
- **Severity:** Low
- **Original status:** 🟡 Plausible
- **File:** [ExerciseCard.tsx](file:///c:/Users/teddy/projects/workout-app/src/components/ExerciseCard.tsx#L235)
- **Root cause:** Cross-stack navigation `as any` needed for nested params but lacked eslint-disable comment.
- **Fix applied:** Added `// eslint-disable-next-line @typescript-eslint/no-explicit-any — cross-stack navigation requires untyped nested params (BH-041)` comment.

#### BH-040 · Analytics Hub and Widget deep-link defaulted to wrong tab — **RESOLVED 2026-04-10**
- **Severity:** Medium
- **Original status:** 🔴 Confirmed
- **File:** [ExerciseListView.tsx](file:///c:/Users/teddy/projects/workout-app/src/components/analytics/ExerciseListView.tsx#L81-L84), [WidgetGrid.tsx](file:///c:/Users/teddy/projects/workout-app/src/components/widgets/WidgetGrid.tsx#L259-L262)
- **Root cause:** Both callers navigated to `ExerciseDetails` without `initialTab` param. Screen defaulted to `'about'` instead of `'charts'` (PRD requirement for Path A and Path C).
- **Fix applied:** Added `initialTab: 'charts'` to navigation params in both `ExerciseListView.tsx` and `WidgetGrid.tsx`.

#### BH-039 · `AboutTab` permanent spinner on missing exercise — **RESOLVED 2026-04-10**
- **Severity:** Medium
- **Original status:** 🟡 Plausible
- **File:** [AboutTab.tsx](file:///c:/Users/teddy/projects/workout-app/src/components/exerciseDetails/AboutTab.tsx#L114-L130)
- **Root cause:** `getExerciseById` returning `null` caused `if (loading || !exercise)` to show spinner forever.
- **Fix applied:** Added `notFound` state. When exercise is null after fetch, shows `MaterialIcons error-outline` icon with "Exercise not found" message.

#### BH-038 · `handleLoadMore` pagination race in HistoryTab — **RESOLVED 2026-04-10**
- **Severity:** High
- **Original status:** 🔴 Confirmed
- **File:** [HistoryTab.tsx](file:///c:/Users/teddy/projects/workout-app/src/components/exerciseDetails/HistoryTab.tsx#L124-L134)
- **Root cause:** `loadingMore` state guard was async (batched React state), allowing `onEndReached` to fire twice before the guard engaged.
- **Fix applied:** Added `loadingMoreRef = useRef(false)` as a synchronous guard. Set `true` immediately before async fetch, `false` on completion. Removed `loadingMore` from the `useCallback` dep array.

#### BH-037 · Duration input logs reps instead of duration — **RESOLVED 2026-03-30**
- **Severity:** High
- **Original status:** 🔴 Confirmed
- **File:** [SetRow.tsx](file:///c:/Users/teddy/projects/workout-app/src/components/SetRow.tsx), [useWorkoutKeyboard.ts](file:///c:/Users/teddy/projects/workout-app/src/hooks/useWorkoutKeyboard.ts), [ExerciseCard.tsx](file:///c:/Users/teddy/projects/workout-app/src/components/ExerciseCard.tsx)
- **Root cause:** The custom numeric keyboard was hardcoded to `'weight' | 'reps'`, and clicking the duration field incorrectly focused `'reps'`. Typing updated the `reps` field in state, but the UI displayed the untouched `duration` field, rendering duration un-loggable.
- **Fix applied:** Added `'duration'` to `FocusState.field` union. Rewrote `useWorkoutKeyboard.ts` with 3-way branching in all handlers (`handleKeyPress`, `handleBackspace`, `handleClear`, `handleAdjust`, `handleNext`). Updated `SetRow.tsx` to pass `'duration'` from the duration cell. Added `isDurationFocused` prop for highlight ring. Updated `getKeyboardFieldType` and `getFieldLabel` to return correct type/label.

#### BH-033 · Superset cards rendered without ErrorBoundary wrapping — **RESOLVED 2026-03-30**
- **Severity:** Medium
- **Original status:** 🔴 Confirmed
- **File:** [SupersetGroup.tsx](file:///c:/Users/teddy/projects/workout-app/src/components/workout/SupersetGroup.tsx)
- **Root cause:** ExerciseCards in `SupersetGroup` were rendered directly without `<ErrorBoundary>` wrapping, unlike standalone cards in `WorkoutScreen`.
- **Fix applied:** Wrapped each `<ExerciseCard>` inside the superset group's `.map()` with `<ErrorBoundary fallback="card" label={ex.exercise.name}>`.

#### BH-032 · `handleDiscardWorkout` captured in stale BackHandler closure — **RESOLVED 2026-03-30**
- **Severity:** Medium
- **Original status:** 🔴 Confirmed
- **File:** [WorkoutScreen.tsx](file:///c:/Users/teddy/projects/workout-app/src/screens/WorkoutScreen.tsx)
- **Root cause:** `handleDiscardWorkout` referenced `handleHideKeyboard` (recreated each render) but was not memoized, and the BackHandler `useEffect` didn't include it in deps.
- **Fix applied:** Wrapped `handleDiscardWorkout` in `useCallback` with `[handleHideKeyboard, discardWorkout]` deps, and added `handleDiscardWorkout` to the BackHandler `useEffect` deps.

#### BH-035 · PlateCalculator rejects barbell-only weight as invalid — **RESOLVED 2026-03-30**
- **Severity:** Low
- **Original status:** 🟡 Plausible
- **File:** [PlateCalculator.tsx](file:///c:/Users/teddy/projects/workout-app/src/components/PlateCalculator.tsx)
- **Root cause:** `const isValid = weight > barbellWeight` used strict `>`, rejecting barbell-only weight (e.g., 45 lbs).
- **Fix applied:** Changed to `>=`. Added ternary: when `isValid && plates.length === 0`, shows "Barbell only — no plates needed".

#### BH-034 · `replaceExercise` doesn't clear `collapsedExercises` — **RESOLVED 2026-03-30**
- **Severity:** Low
- **Original status:** 🟡 Plausible
- **File:** [workoutStore.ts](file:///c:/Users/teddy/projects/workout-app/src/stores/workoutStore.ts)
- **Root cause:** `replaceExercise` swapped the exercise definition and reset sets to pending, but didn't remove the exercise ID from `collapsedExercises`.
- **Fix applied:** Added `collapsedExercises.delete(exerciseId)` and included `collapsedExercises: updatedCollapsed` in the `set()` call.

#### BH-031 · `pulseAnim` / `swipeHintAnim` missing from `useEffect` deps — **RESOLVED 2026-03-30**
- **Severity:** Low
- **Original status:** 🔴 Confirmed
- **File:** [SetRow.tsx](file:///c:/Users/teddy/projects/workout-app/src/components/SetRow.tsx)
- **Root cause:** `useEffect` deps didn't include `pulseAnim` or `swipeHintAnim` despite referencing them.
- **Fix applied:** Added `pulseAnim` to line 112's deps and `swipeHintAnim` to line 140's deps.

#### BH-030 · `WidgetEditorModal` internal state not reset on external visibility toggle — **RESOLVED 2026-03-28**
- **Severity:** Low
- **Original status:** 🟡 Plausible
- **File:** [WidgetEditorModal.tsx](file:///c:/Users/teddy/projects/workout-app/src/components/widgets/WidgetEditorModal.tsx)
- **Root cause:** Internal state (`showCatalog`, `showExercisePicker`, `exerciseSearch`) persisted when `visible` was toggled externally without `handleClose`.
- **Fix applied:** Added `useEffect` that resets internal state when `visible` transitions to `false`.

#### BH-029 · `ProfileScreen.loadConfig` uses always-true `>= 0` length check — **RESOLVED 2026-03-28**
- **Severity:** Low
- **Original status:** 🟡 Plausible
- **File:** [ProfileScreen.tsx](file:///c:/Users/teddy/projects/workout-app/src/screens/ProfileScreen.tsx)
- **Root cause:** `settings.widgetConfig.length >= 0` always true for any array. Misleading guard.
- **Fix applied:** Simplified to `if (settings.widgetConfig)` — clearer intent.

#### BH-027 · `SwipeableTabScreen` `useEffect` missing shared values in deps — **RESOLVED 2026-03-28**
- **Severity:** Low
- **Original status:** 🔴 Confirmed
- **File:** [SwipeableTabScreen.tsx](file:///c:/Users/teddy/projects/workout-app/src/components/SwipeableTabScreen.tsx)
- **Root cause:** `useEffect` referenced `translateX` and `opacity` but only had `[isFocused]` in deps.
- **Fix applied:** Added `translateX` and `opacity` to the dependency array.

#### BH-026 · `TrendsTab.loadSparklines` stale `autoSelectTypeId` — **RESOLVED 2026-03-28**
- **Severity:** Medium
- **Original status:** 🔴 Confirmed
- **File:** [TrendsTab.tsx](file:///c:/Users/teddy/projects/workout-app/src/components/measurements/TrendsTab.tsx)
- **Root cause:** `loadSparklines` memoized with empty deps; `autoSelectTypeId` captured from first render.
- **Fix applied:** Added `autoSelectTypeId` to `useCallback` dependency array.

#### BH-025 · `GoalProgressWidget` progress calculation wrong for regression — **RESOLVED 2026-03-28**
- **Severity:** High
- **Original status:** 🔴 Confirmed
- **File:** [GoalProgressWidget.tsx](file:///c:/Users/teddy/projects/workout-app/src/components/widgets/GoalProgressWidget.tsx)
- **Root cause:** `Math.abs(current - starting)` erased direction, showing false progress when user regressed past starting value.
- **Fix applied:** Replaced with directional formula `(current - starting) / (target - starting)` clamped to [0, 1]. Works for both gain and loss goals.

#### BH-024 · Fire-and-forget `refreshAllGoalProgress()` + service→store coupling — **RESOLVED 2026-03-24**
- **Severity:** High
- **Original status:** 🟡 Plausible
- **File:** [workoutService.ts](file:///c:/Users/teddy/projects/workout-app/src/services/workoutService.ts), [measurementService.ts](file:///c:/Users/teddy/projects/workout-app/src/services/measurementService.ts)
- **Root cause:** Fire-and-forget `.then().catch()` pattern left uncovered rejection path; services imported `useGoalCelebrationStore` violating guardrail #9.
- **Fix applied:** `saveWorkout`/`updateWorkout` now return `Goal[]`; `logMeasurement` returns `{ measurement, completedGoals }`. All three services properly `await refreshAllGoalProgress()`. Celebration logic moved to callers (`WorkoutScreen.tsx`, `MeasurementsScreen.tsx`). Store import removed from both services.

#### BH-023 · `goalProgressService` 1RM/reps queries include abandoned workouts — **RESOLVED 2026-03-24**
- **Severity:** High
- **Original status:** 🔴 Confirmed
- **File:** [goalProgressService.ts](file:///c:/Users/teddy/projects/workout-app/src/services/goalProgressService.ts)
- **Root cause:** 6 SQL queries (3 single-goal compute + 3 batch) had no `JOIN workouts` and no `w.status = 'completed'` filter. Abandoned workouts inflated goal progress.
- **Fix applied:** Added `JOIN workouts w ON w.id = we.workout_id` and `AND w.status = 'completed'` to all 6 queries: `computeExercise1RM()`, `computeExerciseVolume()`, `computeExerciseMaxReps()`, and their batch equivalents in `refreshAllGoalProgress()`.

#### BH-022 · `getProgressPercent` returns misleading percentage for loss goals — **RESOLVED 2026-03-23**
- **Severity:** Low
- **Original status:** 🟡 Plausible
- **File:** [GoalCard.tsx](file:///c:/Users/teddy/projects/workout-app/src/components/goals/GoalCard.tsx#L50-L63), [GoalDetailModal.tsx](file:///c:/Users/teddy/projects/workout-app/src/components/goals/GoalDetailModal.tsx#L41-L54)
- **Root cause:** `(currentBest / targetValue) * 100` gave 109% clamped to 100% for a loss goal (e.g., 185/170). Misleading progress bar.
- **Fix applied:** Added direction detection (`targetValue < startingValue`); loss goals now compute `((starting - current) / (starting - target)) * 100`.

#### BH-021 · Stale closure in `selectExerciseMetric` — **RESOLVED 2026-03-23**
- **Severity:** Medium
- **Original status:** 🟡 Plausible
- **File:** [useGoalCreation.ts](file:///c:/Users/teddy/projects/workout-app/src/hooks/useGoalCreation.ts#L187-L204)
- **Root cause:** `state.exercise?.id` read from outer closure after `setState` call in the same callback, risking a stale value.
- **Fix applied:** Captured `exerciseId` from `prev` argument inside the `setState` updater function. Removed `state.exercise?.id` dependency.

#### BH-020 · `updateWorkout` fire-and-forget doesn't celebrate completed goals — **RESOLVED 2026-03-23**
- **Severity:** Medium
- **Original status:** 🔴 Confirmed
- **File:** [workoutService.ts](file:///c:/Users/teddy/projects/workout-app/src/services/workoutService.ts#L258-L265)
- **Root cause:** `updateWorkout` only logged completed goals to console, unlike `saveWorkout` and `logMeasurement` which called `celebrate()`.
- **Fix applied:** Replaced `console.log` loop with `useGoalCelebrationStore.getState().celebrate(completed)`.

#### BH-019 · `refreshAllGoalProgress` completion check wrong for loss goals — **RESOLVED 2026-03-23**
- **Severity:** High
- **Original status:** 🔴 Confirmed
- **File:** [goalService.ts](file:///c:/Users/teddy/projects/workout-app/src/services/goalService.ts#L419-L428)
- **Root cause:** `currentBest >= targetValue` was always used, but for loss goals (target < starting), `<=` should be used.
- **Fix applied:** Added `isLossGoal` detection. Loss goals use `<=`, gain goals use `>=`.

#### BH-013 · "View Comparison" button is a no-op — **RESOLVED 2026-03-23**
- **Severity:** High
- **Original status:** 🔴 Confirmed
- **File:** [GalleryTab.tsx](file:///c:/Users/teddy/projects/workout-app/src/components/measurements/GalleryTab.tsx#L661-L666)
- **Root cause:** `CompareView` auto-rendered when 2 photos selected, but the "View Comparison" button `onPress` was a stub.
- **Fix applied:** Added `showCompare` state to gate the `CompareView` modal behind the button press. Button now sets `showCompare(true)`, and `onClose` resets all compare state.

#### BH-014 · `getLatestMeasurements` returns arbitrary values when multiple entries exist on same date — **RESOLVED 2026-03-23**
- **Severity:** Medium
- **Original status:** 🟡 Plausible
- **File:** [measurementService.ts](file:///c:/Users/teddy/projects/workout-app/src/services/measurementService.ts#L257-L294)
- **Root cause:** `INNER JOIN` on `recorded_at = max_date` could match multiple rows with no tiebreaker.
- **Fix applied:** Added `MAX(created_at) AS max_created` to subquery and `AND m.created_at = latest.max_created` to join condition.

#### BH-015 · Hardcoded "lbs" unit in overlay summary and tooltip — **RESOLVED 2026-03-23**
- **Severity:** Medium
- **Original status:** 🔴 Confirmed
- **File:** [TrendsTab.tsx](file:///c:/Users/teddy/projects/workout-app/src/components/measurements/TrendsTab.tsx#L441-L510)
- **Root cause:** Three hardcoded `lbs` string literals in the 1RM overlay tooltip, latest row, and change row.
- **Fix applied:** Replaced all three with the dynamic `{unit}` variable, which correctly reflects the user's kg/lbs preference.

#### BH-017 · `PhotoViewer` doesn't guard `currentIndex` against out-of-bounds after delete — **RESOLVED 2026-03-23**
- **Severity:** Low
- **Original status:** 🟡 Plausible
- **File:** [GalleryTab.tsx](file:///c:/Users/teddy/projects/workout-app/src/components/measurements/GalleryTab.tsx#L186-L207)
- **Root cause:** `currentIndex` was local state not clamped when `photos` array shrank after deletion.
- **Fix applied:** Added `useEffect` watching `photos.length` to clamp `currentIndex` to `Math.min(currentIndex, photos.length - 1)`.

#### BH-018 · Duplicated `generateId()` utility across measurement and photo services — **RESOLVED 2026-03-23**
- **Severity:** Low
- **Original status:** 🔴 Confirmed
- **File:** [measurementService.ts](file:///c:/Users/teddy/projects/workout-app/src/services/measurementService.ts), [photoService.ts](file:///c:/Users/teddy/projects/workout-app/src/services/photoService.ts)
- **Root cause:** Identical UUID v4 `generateId()` function copy-pasted into both files.
- **Fix applied:** Extracted to shared `src/utils/uuid.ts`. Both services now import from there.

#### BH-012 · Overlay `data2` length mismatch causes chart crash or misalignment — **RESOLVED 2026-03-23**
- **Severity:** High
- **Original status:** 🔴 Confirmed
- **File:** [TrendsTab.tsx](file:///c:/Users/teddy/projects/workout-app/src/components/measurements/TrendsTab.tsx#L294-L311)
- **Root cause:** `.filter(d => d.value > 0)` on `overlayChartData` shrunk `data2` relative to `data`, breaking gifted-charts' 1:1 index alignment.
- **Fix applied:** Removed the `.filter()` call. Added `hasAnyOverlay` flag to gate overlay rendering. The interpolation pass already fills gaps with nearest-neighbor values.

#### BH-001 · ISO-week mismatch between SQLite `%W` and JS `getISOWeekNumber()` — **RESOLVED 2026-03-14**
- **Severity:** High
- **Original status:** 🟡 Plausible
- **File:** [analyticsService.ts](file:///c:/Users/teddy/projects/workout-app/src/services/analyticsService.ts)
- **Root cause:** SQLite `strftime('%W', ...)` uses non-ISO week numbering while JS `getISOWeekNumber()` uses ISO 8601. These disagreed near year boundaries.
- **Fix applied:** Streak calculation replaced with raw `DATE(completed_at)` fetches; week keys computed in JS via `getISOWeekYear()` / `toISOWeekKey()`. Chart `buildBucketExpression` `per_week` case also updated to use ISO 8601 Thursday-pivot formula (`date(col, '-3 days', 'weekday 4')`) instead of `strftime('%W')`.

#### BH-003 · `Text.onPress` replaced with `TouchableOpacity` in RangePills — **RESOLVED 2026-03-14**
- **Severity:** Medium
- **Original status:** 🔴 Confirmed
- **File:** [ExerciseAnalyticsScreen.tsx](file:///c:/Users/teddy/projects/workout-app/src/screens/ExerciseAnalyticsScreen.tsx)
- **Root cause:** `RangePills` used `<Text onPress>` with mixed View/Text styles — no touch feedback, broken `borderRadius` on Android.
- **Fix applied:** Replaced with `<TouchableOpacity>` wrapping `<Text>`, split the `pill` style into container and text styles.

#### BH-004 · `getBestWeightForReps` returns correct `achieved_date` — **RESOLVED 2026-03-14**
- **Severity:** Medium
- **Original status:** 🟡 Plausible
- **File:** [analyticsService.ts](file:///c:/Users/teddy/projects/workout-app/src/services/analyticsService.ts)
- **Root cause:** `GROUP BY ws.reps` with `MAX(ws.weight)` left `achieved_date` as a non-aggregated bare column.
- **Fix applied:** Replaced with CTE using `ROW_NUMBER()` window function.

#### BH-005 · Duration excluded from Breakdown tab — **RESOLVED 2026-03-14**
- **Severity:** Medium
- **Original status:** 🟡 Plausible
- **File:** [AnalyticsScreen.tsx](file:///c:/Users/teddy/projects/workout-app/src/screens/AnalyticsScreen.tsx)
- **Root cause:** Duration can't meaningfully be distributed per muscle group.
- **Fix applied:** Added `BREAKDOWN_METRICS` constant excluding `duration`, passed via optional `items` prop on `MetricSelector`.

#### BH-006 · Analytics screens wrapped in `ErrorBoundary` — **RESOLVED 2026-03-14**
- **Severity:** Low
- **Original status:** 🔴 Confirmed
- **File:** [AppNavigator.tsx](file:///c:/Users/teddy/projects/workout-app/src/navigation/AppNavigator.tsx)
- **Root cause:** Analytics screens were only covered by the outer ProfileStack boundary. A chart crash would take down the entire stack.
- **Fix applied:** Added `AnalyticsScreenWithBoundary` and `ExerciseAnalyticsScreenWithBoundary` wrapper components in AppNavigator.

#### BH-011 · `updateWorkout` not exported in default export object of `workoutService.ts` — **RESOLVED 2026-03-17**
- **Severity:** Low
- **Original status:** 🔴 Confirmed
- **File:** [workoutService.ts](file:///c:/Users/teddy/projects/workout-app/src/services/workoutService.ts#L431-L439)
- **Root cause:** `updateWorkout` was a named export but missing from the default export object.
- **Fix applied:** Added `updateWorkout` to the default export object.

#### BH-010 · `navigationRef` typed as `any` — violates conventions guardrail #2 — **RESOLVED 2026-03-17**
- **Severity:** Medium
- **Original status:** 🔴 Confirmed
- **File:** [navigationRef.ts](file:///c:/Users/teddy/projects/workout-app/src/navigation/navigationRef.ts)
- **Root cause:** `createNavigationContainerRef<any>()` and untyped `tabName: string` parameter.
- **Fix applied:** Used existing `RootTabParamList` from `AppNavigator.tsx`. Typed `tabName` as `keyof RootTabParamList`. Removed `as never` cast.

#### BH-009 · `getWorkoutsForDate` casts `SetRow` without `workout_exercise_id` in type — **RESOLVED 2026-03-17**
- **Severity:** Medium
- **Original status:** 🔴 Confirmed
- **File:** [calendarService.ts](file:///c:/Users/teddy/projects/workout-app/src/services/calendarService.ts#L335-L350)
- **Root cause:** Used inline `as SetRow & { workout_exercise_id: string }` cast instead of the existing `SetRowWithParent` interface.
- **Fix applied:** Replaced `getAllAsync<SetRow>` with `getAllAsync<SetRowWithParent>` and removed the inline cast.

#### BH-008 · `backfillPersonalRecords` uses manual `BEGIN/COMMIT` instead of `withTransactionAsync` — **RESOLVED 2026-03-17**
- **Severity:** High
- **Original status:** 🟡 Plausible
- **File:** [calendarService.ts](file:///c:/Users/teddy/projects/workout-app/src/services/calendarService.ts#L545-L600)
- **Root cause:** Manual `BEGIN`/`COMMIT`/`ROLLBACK` pattern was inconsistent with the rest of the codebase and risked partial writes on failure.
- **Fix applied:** Replaced with `db.withTransactionAsync()`, removed manual rollback catch block.

#### BH-007 · `finishWorkout` reads stale `isEditMode` / `original*` after `set()` clears them — **RESOLVED 2026-03-17**
- **Severity:** High
- **Original status:** 🔴 Confirmed
- **File:** [WorkoutScreen.tsx](file:///c:/Users/teddy/projects/workout-app/src/screens/WorkoutScreen.tsx#L126-L200)
- **Root cause:** `finishWorkout()` resets `isEditMode`/`original*` to `false`/`null` in the Zustand store before the screen reads them to decide between `updateWorkout` vs `saveWorkout`.
- **Fix applied:** Snapshot `isEditMode`, `originalDuration`, `originalCompletedAt`, `originalStartedAt` into local `const`s before calling `finishWorkout()`.

#### BH-002 · Missing cleanup return in `useExerciseAnalytics` web path — **RESOLVED 2026-03-14**
- **Severity:** High
- **Original status:** ➖ Accepted
- **File:** [useExerciseAnalytics.ts](file:///c:/Users/teddy/projects/workout-app/src/hooks/useExerciseAnalytics.ts)
- **Root cause:** Web mock-data path in `useEffect` returned bare `return;` instead of a cleanup function, breaking React's cleanup contract.
- **Fix applied:** Changed `return;` to `return () => {};` so both code paths consistently return cleanup functions.

---

## Accepted / Won't Fix

*No accepted / won't fix items.*

---

## Historical Bugs Caught By This Category

These were found and fixed before this baseline was created. Documented here for pattern awareness:

| Bug | Where | Root Cause | Fixed |
|-----|-------|-----------|-------|
| Epoch vs ISO date confusion in hydration | `hydration.ts` | Raw SQL rows used epoch timestamps but code expected ISO strings | 2026-03-05 |
| Partial writes on workout save | `database.ts` | Transaction not wrapping all inserts | 2026-01-06 |
| Template cycling skips wrong index | `splitService.ts` | Off-by-one when rest days present at end of schedule | 2026-01-08 |
| Stale workout data after switching splits | `useHomeScreenData.ts` | Hook didn't reset when active split ID changed | 2026-03-05 |

---

## Last Updated
- Date: 2026-04-28
- Session Context: Phase 6 Bug Hunter pass — found and fixed 7 issues (BH-063 through BH-069) across import, export, and cloud backup features. Added 14 new false positives from the Phase 6 scope. Total resolved: 55.
