> Source of truth: [proposal](../proposal.md) · [spec delta](../specs/stats-cli/spec.md) · [grill session](grill.md) · parent [grill session](../../add-text-stats-cli/execution/grill.md)

Status: ready-for-agent

## Problem Statement

See [proposal.md](../proposal.md) - "Why".

## Solution

A `textkit stats` sub-command, dark behind an environment flag, that behaves as the [stats-cli delta](../specs/stats-cli/spec.md) says.

## User Stories

1. As a shell user, I want a text's measurements from the terminal, so that I can check a draft quickly - [delta](../specs/stats-cli/spec.md) "Requirement: Stats command" (Scenario "Stats summary").
2. As a script author, I want the measurements as JSON, so that I can parse them - [delta](../specs/stats-cli/spec.md) "Requirement: Stats JSON output" (Scenario "JSON flag").
3. As the maintainer, I want the command hidden until it is released, so that feedback can change it - [delta](../specs/stats-cli/spec.md) "Requirement: Stats command flag" (Scenarios "Flag off", "Flag on").

## Implementation Decisions

- One `stats` entry in the command table of `src/cli.mjs`, calling `wordCount`, `sentenceCount`, `readingMinutes` from `src/stats.mjs` (slice grill Q1-Q3).
- The flag is checked in `run` before the command lookup, so with the flag off `stats` takes the unknown-command path and is left out of the usage list (slice grill Q2).
- The fake-stream test helper moves to `test/cli-io.mjs` (slice grill Q4).

## Testing Decisions

- One test per delta scenario in `test/cli-stats.test.mjs`, named after it; flag on via `env: { TEXTKIT_STATS: '1' }`.

## Out of Scope

- Removing the flag (slice remove-stats-cli-flag).

## Further Notes

Decisions were delegated to Grok Bot; see [grill.md](grill.md).
