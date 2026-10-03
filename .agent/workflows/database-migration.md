---
description: Append and verify a data-preserving SQLite migration
---

# Database Migration

**Updated: 2026-10-02.** The current schema is v21. Always inspect the end of the registry in `src/services/migrations.ts` for the next version.

## Add the migration

1. Inspect the affected tables, models, hydration, queries, and transfer paths.
2. Append a new entry to `MIGRATIONS` with the next sequential version and a descriptive name. Never rewrite a shipped migration.
3. Use the current signature:

```typescript
{
    version: N, // next sequential version from the current registry
    name: 'descriptive_snake_case_name',
    up: async (db, { startingVersion }) => {
        // Apply the schema/data change.
        // startingVersion is the version before this migration run began.
    },
},
```

4. Use `CREATE TABLE/INDEX IF NOT EXISTS` as appropriate. Check `columnExists()` before adding a column, accounting for historical devices that may already have it.
5. Preserve records, identities, relationships, and existing units. Provide compatible defaults or deliberate backfills.
6. Let failures propagate. The runner starts a transaction for each migration, stamps `PRAGMA user_version` inside it, commits on success, and rolls back on failure. Do not introduce a nested transaction into `up`.

Connection-level WAL and foreign-key pragmas belong in `database.ts`.

## Carry the field through the app

Check the relevant model, save/load queries, hydration, unfinished-workout persistence, JSON/Drive payload, older-backup restore compatibility, competitor imports, spreadsheet export, and data clearing. A schema change is incomplete if the field silently disappears in an affected transfer path.

Use `startingVersion` only when behavior needs to distinguish a fresh install from an upgrade. It remains the original database version while all pending migrations run; it is not the immediately preceding migration number.

## Verify safely

Use isolated test databases or disposable test installations. Do not uninstall or clear an owner's real history to test a fresh database.

- **Fresh database:** all migrations complete and the expected schema/defaults exist.
- **Upgrade:** representative records survive with the same IDs, related rows, values, and units.
- **Failure:** a deliberately failed migration cannot leave half-applied changes or an advanced version stamp.
- **Restore:** supported older snapshots acquire compatible defaults; current snapshots round-trip through affected local and cloud paths.
- **App behavior:** new values save, reload, and display correctly.

Run typecheck and relevant persistence/migration tests. Native SQLite verification supplements mocked tests when behavior depends on SQLite itself.

## Troubleshooting

- `Migration vN FAILED`: retain the failing database and inspect the error; do not swallow it or erase the data.
- Schema unchanged: inspect `PRAGMA user_version`; completed migrations do not run again.
- Existing-column error in an unshipped migration: add the missing guard and recheck fresh and upgrade paths.
- Bad state left by an already-applied migration: append a forward repair that accounts for affected records and schema states.
- A pending shipped migration fails before completion: the runner stops there, so a later migration cannot repair that device by itself. Preserve the database, reproduce the failure and design a compatible recovery path through the runner. Verify both affected and unaffected databases without rewriting the shipped migration or clearing user data.

Migrations are forward-only. A previous app binary is not automatically compatible with a newer schema.
