# Agent Instructions

## 🧠 Knowledge Persistence System

This project uses a **dual-folder system** to maintain context across chat sessions:

- **`.agent/knowledge/`** — Reference documents, design decisions, project state
- **`.agent/workflows/`** — Repeatable procedures and step-by-step checklists

### Core Principle

**Before ending a session or when the user indicates they want to change chats**, ensure all important discoveries, decisions, and context are saved to the appropriate files.

---

## 📖 Knowledge Files

Reference documents that capture *what* and *why*. These are read-heavy, edited when decisions change.

| File | Purpose |
|------|---------|
| `app-vision.md` | Core goals, market positioning, design philosophy, disruption strategy |
| `project-config.md` | Technical stack, dependencies, build commands, project structure |
| `target-users.md` | User personas, audience prioritization, feature needs by user type |
| `feature-design.md` | Feature specifications, UX decisions, competitive differentiators |
| `monetization.md` | Pricing strategy, free vs premium features, anti-friction principles |
| `current-progress.md` | What's done, in-progress, next steps, session log |
| `conventions.md` | Coding patterns, naming conventions, project structure |
| `code-audit-baseline.md` | Open issues, resolved items, patterns from code review |
| `competitive-analysis.md` | Competitor breakdown, gaps in market, opportunities |

*Add domain-specific knowledge files as needed (e.g., `/data-schema`, `/api-design`, `/analytics-specs`).*

### When to Update Knowledge

- Design decisions are made or changed
- Project configuration changes
- User personas or target audience evolves
- Competitive landscape insights emerge
- At end of session (update `/current-progress`)

---

## 🔧 Workflows

Procedures that capture *how*. Step-by-step instructions for repeatable tasks.

| Workflow | Purpose |
|----------|---------|
| `setup-project.md` | Commands to scaffold the project from scratch |
| `add-feature.md` | Checklist for implementing new features (UI, logic, tests) |
| `add-exercise.md` | Process for adding new exercises to the database |
| `ui-guidelines.md` | Design system rules, component patterns, theming |
| `release-checklist.md` | Build, test, and publish process |
| `create-workflow.md` | How to create new workflow files |
| `code-review.md` | Baseline + diff audit procedure for code quality |
| `user-testing.md` | Process for gathering and incorporating user feedback |

*Add domain-specific workflows as needed (e.g., `/deploy-beta`, `/database-migration`, `/localization`).*

### When to Create Workflows

- A process has been repeated 2+ times
- Steps are complex enough to forget
- Future agents would benefit from documentation

### When to Update Workflows

- Steps change or improve
- Troubleshooting info is discovered
- Checklist items are missing

---

## 📝 File Formats

### Knowledge File Format

```markdown
---
description: [One-line description]
---

# [Title]

[Content organized with clear headers]

---

## Last Updated
- Date: [YYYY-MM-DD]
- Session Context: [What prompted the update]
```

### Workflow File Format

```markdown
---
description: [One-line description of what this workflow accomplishes]
---

# [Workflow Title]

## Prerequisites
- [Required tools, access, knowledge]

## Steps

1. **Step Name**
   - Details
   - Commands if applicable

2. **Step Name**
   - Details

## Troubleshooting
- [Common issues and solutions]

## Notes
- [Additional context]
```

---

## 🚨 Critical Reminders

1. **Never lose design decisions** — If the user describes how something should work, save it
2. **Knowledge ≠ Workflow** — Reference docs go in `/knowledge`, procedures go in `/workflows`
3. **When in doubt, document it** — Better to have too much context than too little
4. **Update before switching** — Always update progress before ending a session
5. **Proactively suggest documentation** — When discussing features, architecture, or decisions, offer to save them
6. **Capture the "why"** — Document rationale, not just what was decided

---

## 🏋️ Fitness App Specific Guidance

This project aims to disrupt the fitness app market by:
- Being **free or extremely cheap** (not the typical $10+/month)
- Having **modern, polished UI** (unlike Fitnotes)
- Prioritizing **zero friction** (unlike premium apps with forced onboarding)
- Being **veteran-friendly first**, with optional beginner support

When making decisions, always weigh:
1. Does this add friction for experienced users?
2. Does this feel like a premium app charging $12/month?
3. Would Fitnotes users switch to this?
4. Does this respect user privacy and data ownership?
