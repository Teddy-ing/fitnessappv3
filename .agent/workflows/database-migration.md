---
description: How to add a new versioned database migration
---

# Database Migration

## Prerequisites
- Understand the current schema (see `src/services/migrations.ts`)
- Know the next version number (check the last entry in `MIGRATIONS` array)

## Steps

1. **Open `src/services/migrations.ts`**
   - Find the `MIGRATIONS` array at the bottom of the file

2. **Add a new migration entry**
   ```typescript
   {
       version: N,  // next sequential integer
       name: 'descriptive_snake_case_name',
       up: async (db) => {
           // Your schema change here
       },
   },
   ```

3. **Write the `up` function**
   - Use `CREATE TABLE IF NOT EXISTS` for new tables
   - For `ALTER TABLE ADD COLUMN`: **always** check `columnExists()` first to handle devices that may already have the column from a prior code path
   - For new indexes: use `CREATE INDEX IF NOT EXISTS`
   - Never use try/catch to silence errors — let failures propagate

4. **Never modify existing migrations**
   - Existing migrations may have already run on user devices
   - Changing them will have no effect (they won't re-run) or could cause version mismatches
   - If a previous migration was wrong, add a **new** migration to fix it

5. **Test both paths**
   - **Fresh install:** Uninstall app, reinstall, verify all tables created
   - **Upgrade path:** Run app with existing database, verify migration applies cleanly
   - Check device logs for `[DB] Running migration vN: name` messages

## Troubleshooting

- **"Migration vN FAILED" in logs** — The migration threw an error. Check the error message. The app will show database initialization failure. Fix the migration logic and redeploy.
- **Schema not updating** — Check `PRAGMA user_version` value in the database. If it's already >= your migration version, the migration won't re-run. This is by design.
- **Column already exists crash** — You forgot to check `columnExists()` before `ALTER TABLE ADD COLUMN`. Add the check.

## Notes
- Migrations use SQLite's `PRAGMA user_version` for version tracking (no extra table needed)
- Forward-only: no rollback support (intentional for mobile apps)
- Connection-level pragmas (WAL mode, foreign keys) are set in `database.ts`, not in migrations
