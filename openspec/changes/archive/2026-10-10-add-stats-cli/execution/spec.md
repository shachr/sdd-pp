> Source of truth: [proposal](../proposal.md) · [spec delta](../specs/stats-cli/spec.md) · [grill session](grill.md) · parent [grill session](../../add-text-stats-cli/execution/grill.md)

Status: ready-for-agent

## Problem Statement

See [proposal.md](../proposal.md) - "Why".

## Solution

A `textkit stats` command, behind the stats-cli flag, behaving as the [stats-cli delta](../specs/stats-cli/spec.md) says.

## User Stories

1. As a writer in the terminal, I want the word and sentence counts of a text I pipe in, so that I can check length without an editor - [delta](../specs/stats-cli/spec.md) "Requirement: Stats command" (Scenarios "Stats summary", "Unknown stats option").
2. As a script author, I want the counts as JSON, so that I can parse them reliably - [delta](../specs/stats-cli/spec.md) "Requirement: Stats JSON output" (Scenario "JSON flag").
3. As the maintainer, I want the command hidden until we release it, so that early feedback can still change it - [delta](../specs/stats-cli/spec.md) "Requirement: Stats command flag" (Scenarios "Flag off", "Flag on").

## Implementation Decisions

- `io.readStdin()` returns all of standard input as a string; `bin/textkit.mjs` passes `() => fs.readFileSync(0, 'utf8')` (slice grill Q1).
- A `stats` entry in the `COMMANDS` table of `src/cli.mjs`, using `wordCount` / `sentenceCount` from `src/stats.mjs`.
- One flag check in `src/cli.mjs` decides which commands are available and what the usage lists (slice grill Q2); the cleanup slice removes it.
- JSON via `JSON.stringify` (slice grill Q4).

## Testing Decisions

- `run` with fake streams and a fake `readStdin`, `env` per test; one test per delta scenario, named after it; one spawn test pipes text into `bin/textkit.mjs` with the flag on.

## Out of Scope

- Reading files by path, other statistics, the flag's removal (slice remove-stats-cli-flag).

## Further Notes

Decisions were delegated to Grok Bot; see [grill.md](grill.md).
