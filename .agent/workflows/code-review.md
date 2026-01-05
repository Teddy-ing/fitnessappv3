---
description: How to run code quality audits (baseline + diff modes) and track issues
---

# Code Review Workflow

A structured approach to LLM-assisted code review that prevents endless issue loops and maintains quality over time.

## 📋 Prerequisites

- Access to `.agent/knowledge/code-audit-baseline.md`
- Familiarity with project conventions (see `conventions.md`)

---

## 🔄 Review Modes

### Mode A: Baseline Audit (One-Time or Quarterly)

Use when: Starting fresh, quarterly refresh, or major refactor complete.

1. **Scan all source files** in the project's source directory

2. **Focus on platform-specific smells** (adjust per framework):
   - **Performance**: O(n²) loops, unnecessary allocations, blocking UI thread
   - **Resource management**: Unclosed handles, memory leaks, missing cleanup
   - **Error handling**: Swallowed exceptions, missing validation, crash risks
   - **Thread safety**: Race conditions, shared mutable state
   - **Security**: Injection risks, sensitive data exposure, insecure storage
   - **Overengineering**: Unused abstractions, premature generalization, YAGNI
   - **Dead code**: Unused methods, unreachable code paths
   - **Missing tests**: Critical paths without coverage
   - **Fitness app specific**: Data loss risks, slow logging flow, sync issues

3. **For each finding, document**:
   - File and line range
   - Issue type
   - Why it's a problem (1-2 sentences)
   - Severity: Low / Medium / High
   - Suggested fix (code snippet or description)

4. **Create/update** `code-audit-baseline.md` with checklist

---

### Mode B: Diff Audit (Per-Session)

Use when: Reviewing code written since last session.

1. **Identify changed files** since last session (check `current-progress.md` session log)

2. **Review only those files** against baseline patterns

3. **Report only NEW issues** (not already in baseline)

4. **If no new issues**: Report "Clean pass"

5. **Update** `code-audit-baseline.md` if new issues found

---

## 📝 Baseline Document Format

```markdown
# Code Audit Baseline

## Summary
- Last full audit: [DATE]
- Open issues: X (H: X, M: X, L: X)
- Fixed since baseline: X

## Open Issues
- [ ] **[SHORT TITLE]** — `file.ext:L##` — [Type] — [Severity]
  - Why: [Brief explanation]
  - Fix: [Suggested solution]

## Resolved
- [x] **[TITLE]** — Fixed [DATE] — [What was done]

## Accepted/Won't Fix
- [~] **[TITLE]** — Reason: [Why this is acceptable]
```

---

## 🛑 Stop Conditions

An audit is COMPLETE when:
- All files in scope have been reviewed
- All findings are documented in baseline
- No new patterns are being discovered

Do NOT:
- Keep finding new issues indefinitely
- Re-audit already-documented issues
- Create new categories after baseline is established

---

## 🏋️ Fitness App Specific Checks

Always verify these critical paths:

1. **Set logging flow** — Can a user log a set in <3 seconds?
2. **Data persistence** — Is workout data saved atomically?
3. **Export functionality** — Does export always produce valid output?
4. **Offline capability** — Does app work without network?
5. **History loading** — Does workout history load efficiently?

---

## Last Updated
- Date: 2026-01-04
- Session Context: Initial workflow setup
