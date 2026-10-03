---
description: Add or maintain a built-in or custom exercise without breaking history
---

# Add an Exercise

**Updated: 2026-10-02.** The built-in library lives in `src/data/exercises.ts`. Custom exercises and built-in favorite/hidden overrides use the SQLite-backed `exerciseService.ts`.

## Built-in exercise

1. Search the current seed library and import mappings for the same movement or variant.
2. Add an entry using the existing `seedExercise` helper and a stable, unique ID. Never reuse an existing ID for a different movement; saved history, templates, and artwork depend on it.
3. Use the types in `src/models/exercise.ts`:
   - Category: strength, cardio, stretch, mobility, warmup, plyometric, or isometric.
   - Primary/secondary muscles and equipment.
   - Tracking flags for weight, reps, time, and distance. The model supports distance, but the current logging keyboard only exposes weight, reps, and duration.
   - Optional description/instructions where supported.
4. Check the helper's default tracking flags and override them for the actual exercise. Confirm comparable seeds before changing muscle contributions.
5. Add/review illustration coverage through the [exercise illustration workflow](exercise-illustrations.md). Keep exact ID-to-movement mappings; generated registries are maintained by the packaging utility.
6. Check `src/services/importParsers/exerciseMapper.ts` and exercise relationships if the movement needs competitor-name mapping or related-exercise suggestions. The exercise model has no general aliases or compound/isolation fields.

Adding a seed does not itself require a database schema change. Changing persisted fields does; use the [migration workflow](database-migration.md).

## Custom exercise

Use the app's custom-exercise flow and `createCustomExercise` in `src/services/exerciseService.ts`. Custom images are local paths and fall back gracefully when absent. Use the service's mutation APIs so exercise caches are invalidated.

## Verify

- The exercise appears in the correct picker/search/filter results with the right equipment and tracking inputs.
- It can be added to a workout and template, logged, saved, and reopened.
- Favorite and hide/unhide changes persist.
- Its artwork identifies the exact movement and displays without cropping important content.
- Imported names map deliberately; do not collapse distinct variants.
- Existing exercise IDs and history stay intact.

Run typecheck and relevant exercise/import/artwork tests for code/data changes. Run `node scripts/exercise-art.cjs verify --require-complete` when built-in artwork or seeds change.
