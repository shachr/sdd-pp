---
tool: ai-hero
session: grill-with-docs
---

> Source of truth: [proposal](../proposal.md) · [specs/text-stats/spec.md](../specs/text-stats/spec.md) · [specs/stats-cli/spec.md](../specs/stats-cli/spec.md)

# grill-with-docs session: add-text-stats

Request (user, via the parent agent): "textkit should count words and sentences, estimate reading time, and have a terminal command that prints those numbers". Run with AI Hero `grill-with-docs` before any OpenSpec artifact existed. Decisions were delegated: every answer is **Grok Bot's call on the user's behalf**. This is the shared design session for the whole feature; if it is split, each slice runs a short narrowed session that reads this file first.

## Grilling record

### Round 1 (what the feature is)
- **Q1 - What counts as a word?** whitespace-separated runs with a letter or digit -> delta Requirement "Word count".
- **Q2 - What ends a sentence?** ".", "!" or "?", plus trailing text -> delta Requirement "Sentence count".
- **Q3 - Reading time: which speed, which rounding?** 200 words per minute, rounded up; 0 minutes for a text with no words -> delta Requirement "Reading time".
- **Q4 - How do people get the numbers in a terminal?** a `textkit-stats` command reading a file or standard input -> delta Requirement "Stats command".
- **Q5 - Machine-readable output?** a `--json` option -> delta Requirement "Stats JSON output".
- **Q6 - How does the command report mistakes?** usage message on stderr, exit code 2 -> delta Requirement "Stats errors".

### Round 2 (frontier unlocked by Q4-Q6)
- **Q7 - Module layout?** `src/stats.mjs` (pure functions), `src/stats-cli.mjs` (`run(argv, io) -> exitCode`, testable without spawning), `bin/textkit-stats.mjs` (thin wrapper). -> accepted.

## Decisions
- Library functions are pure and take a string (`String(text)` coercion like `slugify`).
- The CLI core `run(argv, { stdout, stderr, readStdin, readFile })` returns an exit code.
- Tests: node:test; CLI tests call `run` with fake streams.

## Scenarios found
Names only - each is a scenario in the deltas:
- Words in a sentence; Whitespace only
- Sentences ending in punctuation; No terminal punctuation
- Short text reads in one minute; Empty text reads in zero minutes
- Stats summary; Stats from a file
- JSON flag
- Unknown option; Unreadable file

## Domain docs
- `GLOSSARY.md`: **Word**, **Sentence**, **Reading time** added.
