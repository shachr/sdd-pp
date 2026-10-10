---
tool: ai-hero
session: grill-with-docs
---

# grill-with-docs session: remove-stats-cli-flag

> Source of truth: [proposal](../proposal.md) · [specs/stats-cli/spec.md](../specs/stats-cli/spec.md) · parent session (read first): [../add-text-stats-cli/execution/grill.md](../../add-text-stats-cli/execution/grill.md)

Narrowed session for the cleanup slice `remove-stats-cli-flag` of the split change [add-text-stats-cli](../../add-text-stats-cli/slices.md) (AI Hero `grill-with-docs`, limited to this slice). Read first: the parent session (Q9 ship dark) and the archived slice add-stats-cli (flag check `availableCommands` in `src/cli.mjs`). Decisions were delegated: every answer is **Grok Bot's call on the user's behalf**.

## Grilling record

- **Q1 - Is the stats command ready to release?** -> yes (delegated release decision; no feedback pending in this demo project). (Grok Bot's call)
- **Q2 - What goes?** -> the flag check and its helper; the usage lists every command again; tests stop setting the variable; the flag tests go with "Requirement: Stats command flag" (delta `## REMOVED Requirements`). (Grok Bot's call)
- **Q3 - Anything left that reads TEXTKIT_STATS_CLI?** -> nothing may remain (`rg TEXTKIT_STATS_CLI src bin test` empty). (Grok Bot's call)

## Scenarios found

None new; the delta removes one requirement.
