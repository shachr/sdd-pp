---
tool: ai-hero
session: grill-with-docs
---

# grill-with-docs session: add-text-stats-cli

> Source of truth: [proposal](../proposal.md) · [specs/text-stats/spec.md](../specs/text-stats/spec.md) · [specs/cli/spec.md](../specs/cli/spec.md) · [specs/stats-cli/spec.md](../specs/stats-cli/spec.md)

Request (user, via the parent agent): "textkit should count words and sentences, and people should be able to use it from the terminal, including a stats command". Run with AI Hero `grill-with-docs` before any OpenSpec artifact existed. Decisions were delegated: every answer is **Grok Bot's call on the user's behalf**. This is the shared design session for the whole feature; if it is split, each slice runs a short narrowed session that reads this file first.

## Grilling record

### Round 1 (what the feature is)
- **Q1 - What counts as a word?** -> delta Requirement "Word count".
- **Q2 - What ends a sentence?** -> delta Requirement "Sentence count".
- **Q3 - Is the terminal tool one command or several?** -> one `textkit` binary with sub-commands; `slugify` first, `stats` second; delta Requirements "Slugify command", "Stats command".
- **Q4 - How does the CLI report mistakes?** -> delta Requirement "Command errors".
- **Q5 - Machine-readable stats?** -> yes, a `--json` option; delta Requirement "Stats JSON output".

### Round 2 (frontier unlocked by Q3-Q5)
- **Q6 - Input source for slugify?** argument or stdin -> delta Scenarios "Slugify argument", "Slugify from stdin".
- **Q7 - Exit codes?** 0 ok, 2 usage errors (like most CLIs) -> delta Requirement "Command errors".
- **Q8 - Module layout?** `src/stats.mjs` (pure functions `wordCount`, `sentenceCount`), `src/cli.mjs` (`run(argv, io) -> exitCode`, testable without spawning), `bin/textkit.mjs` (thin wrapper), tests per module. -> accepted.
- **Q9 - Release of the stats command?** It is the user-visible part that may change after feedback; ship it dark first. -> accepted (recorded as a delivery decision; no behaviour in the delta yet).

## Decisions
- Library functions are pure and take a string (`String(text)` coercion like `slugify`).
- The CLI core `run(argv, { stdin, stdout, stderr, env })` returns an exit code; the bin file only wires process streams.
- Tests: node:test; CLI tests call `run` with fake streams (one spawn test for the bin).

## Scenarios found
Names only - each is a scenario in the deltas:
- Words in a sentence; Whitespace only
- Sentences ending in punctuation; No terminal punctuation
- Slugify argument; Slugify from stdin
- Unknown command; Missing argument
- Stats summary
- JSON flag

## Domain docs
- `GLOSSARY.md`: **Word**, **Sentence** added.
