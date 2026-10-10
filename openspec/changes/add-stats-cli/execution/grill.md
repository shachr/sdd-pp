---
tool: ai-hero
session: grill-with-docs
---

# grill-with-docs session: add-stats-cli

> Source of truth: [proposal](../proposal.md) · [specs/stats-cli/spec.md](../specs/stats-cli/spec.md) · parent session (read first): [../add-text-stats-cli/execution/grill.md](../../add-text-stats-cli/execution/grill.md)

Narrowed session for slice `add-stats-cli` of the split change [add-text-stats-cli](../../add-text-stats-cli/slices.md), run with AI Hero `grill-with-docs` limited to this slice. The parent settled the output shape (Q6 `--json`) and that the command ships dark (Q10). Earlier slices left `wordCount` / `sentenceCount` / `readingMinutes` in `src/stats.mjs` and the command table + `usageError` in `src/cli.mjs`. Decisions were delegated: every answer is **Grok Bot's call on the user's behalf**.

## Grilling record

- **Q1 - Flag mechanism?** -> environment variable `TEXTKIT_STATS=1`, read from `io.env` (no config file in textkit). Delta "Requirement: Stats command flag" (added by this slice, split note in the proposal). (Grok Bot's call)
- **Q2 - With the flag off, does `stats` appear in the usage's command list?** -> no; it is an unknown command, so the list stays `slugify` (dark launch). (Grok Bot's call)
- **Q3 - Unknown options (`textkit stats --xml`)?** -> usage error, exit 2, like an unknown command. (Grok Bot's call; reuses "Requirement: Usage errors" of the cli capability)
- **Q4 - Test helper reuse?** -> move the fake-stream helper out of `test/cli.test.mjs` into `test/cli-io.mjs` so both test files share it without importing a test file. (Grok Bot's call)

## Scenarios found

Names only - each is a scenario in the delta:
- Stats summary
- JSON flag
- Flag off; Flag on

## Domain docs

- No new glossary terms.
