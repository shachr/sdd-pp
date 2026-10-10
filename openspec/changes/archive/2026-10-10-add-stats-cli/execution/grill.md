---
tool: ai-hero
session: grill-with-docs
---

# grill-with-docs session: add-stats-cli

> Source of truth: [proposal](../proposal.md) · [specs/stats-cli/spec.md](../specs/stats-cli/spec.md) · parent session (read first): [../add-text-stats/execution/grill.md](../../add-text-stats/execution/grill.md)

Narrowed session for slice `add-stats-cli` of the split change [add-text-stats](../../add-text-stats/slices.md), run with AI Hero `grill-with-docs` limited to this slice. The parent settled the command shape (parent Q4-Q7: `run(argv, io) -> exitCode` in `src/stats-cli.mjs`, thin `bin/textkit-stats.mjs`); not re-decided here. Where the parent session and this slice's delta differ, the delta and this slice's proposal split notes win (this slice has none). Decisions were delegated: every answer is **Grok Bot's call on the user's behalf**.

## Grilling record

- **Q1 - What does the done core slice give this one?** -> `textStats(text)` from `src/stats.mjs`; the command only parses arguments and formats.
- **Q2 - Usage text?** -> `usage: textkit-stats [--json] [file]`. (Grok Bot's call)
- **Q3 - Both `--json` and a file?** -> allowed, any order. (Grok Bot's call; within the delta)

## Scenarios found

Names only - each is a scenario in the delta:
- Stats summary; Stats from a file
- JSON flag
- Unknown option; Unreadable file

## Domain docs

- No new glossary terms.
