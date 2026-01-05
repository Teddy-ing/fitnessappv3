---
description: Process for adding new exercises to the exercise database
---

# Add Exercise Workflow

How to add new exercises to the app's exercise database.

## Prerequisites

- Exercise database schema defined
- Understanding of exercise categorization system

## Exercise Data Structure

Each exercise needs:
- **Name**: Canonical name (e.g., "Barbell Bench Press")
- **Category**: Body part/muscle group (e.g., "Chest", "Back", "Legs")
- **Equipment**: Required equipment (e.g., "Barbell", "Dumbbell", "Bodyweight")
- **Type**: Movement type (e.g., "Compound", "Isolation")
- **Aliases**: Alternative names for search (e.g., "Bench", "Flat Bench")
- **Description**: Brief explanation (optional for MVP)
- **Instructions**: How to perform (optional for MVP)

## Steps

### 1. Verify Exercise Doesn't Exist

- [ ] Search existing database for name
- [ ] Check common aliases
- [ ] Avoid duplicates

### 2. Gather Exercise Info

- [ ] Determine primary muscle group
- [ ] Identify equipment needed
- [ ] Classify as compound or isolation
- [ ] List common aliases

### 3. Add to Database

*Exact process depends on data storage approach*

For seeded database:
```
// Example structure (format TBD)
{
  id: "barbell-bench-press",
  name: "Barbell Bench Press",
  category: "Chest",
  equipment: "Barbell",
  type: "Compound",
  aliases: ["bench", "flat bench", "bb bench"]
}
```

### 4. Test

- [ ] Exercise appears in search
- [ ] Aliases work for search
- [ ] Category filter shows exercise
- [ ] Exercise can be added to workout
- [ ] Sets can be logged for exercise

### 5. Verify Import Compatibility

- [ ] Check if exercise exists in major competitor exports
- [ ] Add mapping if needed for import feature

## Common Exercise Categories

| Category | Examples |
|----------|----------|
| Chest | Bench Press, Flyes, Push-ups |
| Back | Rows, Pull-ups, Lat Pulldown |
| Shoulders | OHP, Lateral Raises, Face Pulls |
| Legs | Squat, Deadlift, Leg Press, Lunges |
| Arms | Curls, Tricep Extensions, Dips |
| Core | Planks, Ab Wheel, Hanging Leg Raises |

## Equipment Types

- Barbell
- Dumbbell
- Kettlebell
- Cable
- Machine
- Bodyweight
- Band
- Other

---

## Last Updated
- Date: 2026-01-04
- Session Context: Initial workflow setup
