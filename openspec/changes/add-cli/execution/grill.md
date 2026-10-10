---
tool: ai-hero
session: grill-with-docs
---

# grill-with-docs session: add-cli

> Source of truth: [proposal](../proposal.md) · [specs/cli/spec.md](../specs/cli/spec.md) · parent session (read first): [../add-text-stats-cli/execution/grill.md](../../add-text-stats-cli/execution/grill.md)

Narrowed session for slice `add-cli` of the split change [add-text-stats-cli](../../add-text-stats-cli/slices.md), run with AI Hero `grill-with-docs` limited to this slice. The parent settled the CLI shape (Q3 one binary with sub-commands, Q7 exit codes, Q8 `run(argv, io) -> exitCode` in `src/cli.mjs` + thin `bin/textkit.mjs`); not re-decided here. Decisions were delegated: every answer is **Grok Bot's call on the user's behalf**.

## Grilling record

- **Q1 - What does this slice leave for add-stats-cli?** -> a command table in `src/cli.mjs` that a later slice extends with one entry; `run` receives `{ stdin, stdout, stderr, env }` so the stats slice can read standard input and check its flag without touching the bin file.
- **Q2 - Slugify input from standard input?** -> **dropped from this feature** (Grok Bot's call; also the deliberate loss-check test the user asked for). It adds a stream reader and a spawn-level test to a slice already at ~190 lines, and nobody asked for piping slugs. `textkit slugify` with no text becomes a usage error. -> delta "Requirement: Slugify command" and "Requirement: Command errors" edited in this slice; Scenario "Missing argument" widened; parent amendments recorded; `split.mjs loss add-text-stats-cli` PASS.
- **Q3 - Several words without quotes (`textkit slugify Hello World`)?** -> join the arguments with a space, like `echo`. (Grok Bot's call; builder detail, no new behaviour beyond "its text argument".)
- **Q4 - Usage text?** -> one line per command: `usage: textkit <command> [text]` then `commands: slugify`. (Grok Bot's call)
- **Q5 - Where does the usage go on success paths, e.g. `--help`?** -> out of scope (no help flag in the delta). (Grok Bot's call)

## Scenarios found

Names only - each is a scenario in the delta:
- Slugify argument
- Unknown command; Missing argument

## Domain docs

- No new glossary terms.
