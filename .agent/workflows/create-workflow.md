---
description: Maintain a short reusable procedure when future work benefits from it
---

# Create or Update a Workflow

**Updated: 2026-10-02.** Add a workflow when a repeated or error-prone procedure genuinely needs documenting. A completed feature does not automatically need its own workflow.

## Content

Keep the document focused on what the next developer needs:

1. Purpose and the date last verified.
2. Required tools, access, files, or configuration.
3. Ordered steps, with commands checked against the repository.
4. How to verify the result and protect existing user data.
5. Known failure modes and links to related guides.

Use lowercase filenames with hyphens in `.agent/workflows/`. Keep product direction in knowledge files and dated outcomes in current progress. Historical plans should be clearly dated as artifacts rather than presented as current instructions.

## Check before saving

- The procedure agrees with [AGENTS.md](../../AGENTS.md).
- File links and commands point to real project resources.
- It does not add mandatory approval gates, separate QA chats, arbitrary line limits, automatic commits, or publication steps.
- Verification claims describe work actually performed; future checks remain instructions.
- Existing guidance is updated rather than duplicated.

## Small template

````markdown
---
description: One sentence describing the procedure
---

# Workflow Title

**Updated: YYYY-MM-DD.** Purpose and scope.

## Prerequisites

Required tools and context.

## Steps

1. First action.
2. Next action.

## Verification

Observable checks and any native-device requirements.

## Troubleshooting

Known symptoms and safe recovery steps.
````
