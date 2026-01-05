---
description: Checklist for implementing a new feature from design through testing
---

# Add Feature Workflow

A comprehensive checklist for implementing new features in the workout app.

## Prerequisites

- Feature is defined in knowledge docs or discussed with user
- Tech stack is set up (see `project-config.md`)
- Understanding of affected areas of the codebase

## Steps

### 1. Document the Feature

Before coding:
- [ ] Capture requirements in relevant knowledge file
- [ ] Update `current-progress.md` with in-progress status
- [ ] Identify affected components/screens

### 2. Design Data Model (if needed)

- [ ] Define new entities/types
- [ ] Plan database schema changes
- [ ] Consider migration path from existing data
- [ ] Document in `conventions.md` or domain-specific file

### 3. Implement Backend/Logic Layer

- [ ] Add data models
- [ ] Implement service/repository methods
- [ ] Handle error cases
- [ ] Add validation

### 4. Implement UI

- [ ] Create/modify screens
- [ ] Add components as needed
- [ ] Follow design system (see `ui-guidelines.md` when created)
- [ ] Ensure accessibility basics (touch targets, contrast)

### 5. Connect UI to Logic

- [ ] Wire up state management
- [ ] Handle loading states
- [ ] Handle error states
- [ ] Implement navigation

### 6. Test

- [ ] Happy path works
- [ ] Edge cases handled
- [ ] Error states display correctly
- [ ] Offline behavior (if applicable)
- [ ] Performance acceptable

### 7. Polish

- [ ] Animations/transitions feel right
- [ ] Loading states aren't jarring
- [ ] No janky UI during interaction
- [ ] Follows "speed over everything" principle

### 8. Document

- [ ] Update `current-progress.md`
- [ ] Add to relevant knowledge files if design decisions were made
- [ ] Create workflow if process was repeatable

## Verification

- [ ] Feature works as intended
- [ ] No regressions in existing features
- [ ] Code passes review checks (see `code-review.md`)
- [ ] User can complete the feature flow in expected time

## Fitness App Specific Reminders

- **Logging features** must be FAST — no blocking operations
- **Data features** must work OFFLINE
- **Export compatibility** — will this break existing exports?
- **Veteran users** — does this add friction for power users?

---

## Last Updated
- Date: 2026-01-04
- Session Context: Initial workflow setup
