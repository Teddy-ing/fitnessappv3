---
description: When and how to create new workflow documents
---

# Create Workflow

A meta-workflow for documenting repeatable processes.

## When to Create a Workflow

Create a new workflow when:
- A process has been repeated 2+ times
- Steps are complex enough to forget
- Future agents or developers would benefit from documentation
- A mistake was made that could be prevented with a checklist

## Workflow Template

```markdown
---
description: [One-line description of what this workflow accomplishes]
---

# [Workflow Title]

[Brief intro explaining purpose, 1-2 sentences]

## Prerequisites

- [Required tools, access, or knowledge]
- [Files or configurations needed]

## Steps

### 1. [Step Name]

[Description of what to do]

```command
# Commands if applicable
```

### 2. [Step Name]

[Description]

- Sub-step details
- More details

### 3. [Continue as needed...]

## Verification

How to confirm the workflow completed successfully:
- [ ] Check item 1
- [ ] Check item 2

## Troubleshooting

### [Common Issue 1]
**Symptom:** [What goes wrong]
**Solution:** [How to fix it]

### [Common Issue 2]
**Symptom:** [What goes wrong]
**Solution:** [How to fix it]

## Notes

- [Additional context]
- [Gotchas to remember]
- [Related workflows]

---

## Last Updated
- Date: [YYYY-MM-DD]
- Session Context: [What prompted the update]
```

## Naming Conventions

- Use lowercase with hyphens: `add-feature.md`, `release-checklist.md`
- Be specific: `add-exercise.md` not just `add.md`
- Verb-noun format when possible: `setup-project.md`, `run-tests.md`

## Where to Save

All workflows go in: `.agent/workflows/`

## Linking Workflows

Reference other workflows when relevant:
- "See `code-review.md` for audit procedure"
- Cross-link to knowledge files when needed

---

## Last Updated
- Date: 2026-01-04
- Session Context: Initial workflow setup
