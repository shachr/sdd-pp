---
tool: ai-hero
session: grill-with-docs
---

# grill-with-docs session: add-cli

> Source of truth: [proposal](../proposal.md) · [specs/cli/spec.md](../specs/cli/spec.md) · parent session (read first): [../add-text-stats-cli/execution/grill.md](../../add-text-stats-cli/execution/grill.md)

Narrowed session for slice `add-cli` of the split change [add-text-stats-cli](../../add-text-stats-cli/slices.md), run with AI Hero `grill-with-docs` limited to this slice. The parent settled the CLI shape (Q4 one binary with sub-commands, Q8 exit codes, Q9 `run(argv, io) -> exitCode` in `src/cli.mjs` + thin `bin/textkit.mjs`); not re-decided here. Decisions were delegated: every answer is **Grok Bot's call on the user's behalf**.

## Grilling record

- **Q1 - What does this slice leave for add-stats-cli?** -> a command table in `src/cli.mjs` that the stats slice extends with one entry; `run` receives `{ stdout, stderr, readStdin, env }` so stats can read standard input and check its flag without touching the bin file.
- **Q2 - The error requirement's name?** -> renamed to "Usage errors" (Grok Bot's call; also the deliberate rename test of v6). Same behaviour; the name says what the user sees. Recorded as `renamed_from` in this slice's proposal split notes; `split.mjs loss add-text-stats-cli` PASS.
- **Q3 - Several words without quotes (`textkit slugify Hello World`)?** -> join the arguments with a space. (Grok Bot's call)
- **Q4 - Empty standard input for slugify?** -> prints an empty line, exit 0 (slug of "" is ""). (Grok Bot's call; no new behaviour beyond the delta.)
- **Q5 - Usage text?** -> `usage: textkit <command> [text]` then `commands: slugify`. (Grok Bot's call)

## Scenarios found

Names only - each is a scenario in the delta:
- Slugify argument; Slugify from stdin
- Unknown command; Missing argument

## Domain docs

- No new glossary terms.
