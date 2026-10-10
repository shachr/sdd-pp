> Source of truth: [proposal](../proposal.md) · [spec delta](../specs/stats-cli/spec.md) · [grill session](grill.md) · parent [grill session](../../add-text-stats/execution/grill.md)

Status: ready-for-agent

## Problem Statement

See [proposal.md](../proposal.md) - "Why".

## Solution

A `textkit-stats` command that behaves as the [stats-cli delta](../specs/stats-cli/spec.md) says.

## User Stories

1. As a shell user, I want a text's measurements from a pipe or a file, so that I can check a draft's length - [delta](../specs/stats-cli/spec.md) "Requirement: Stats command" (Scenarios "Stats summary", "Stats from a file").
2. As a script author, I want the measurements as JSON - [delta](../specs/stats-cli/spec.md) "Requirement: Stats JSON output" (Scenario "JSON flag").
3. As a shell user, I want mistakes reported clearly, so that scripts fail loudly - [delta](../specs/stats-cli/spec.md) "Requirement: Stats errors" (Scenarios "Unknown option", "Unreadable file").

## Implementation Decisions

- `src/stats-cli.mjs` exports `run(argv, io)`; `io` is `{ stdout, stderr, readStdin, readFile }` (parent grill decisions); `bin/textkit-stats.mjs` wires the process.

## Testing Decisions

- `test/stats-cli.test.mjs`: `run` with fake streams, one test per delta scenario, named after it.

## Out of Scope

- Changes to the measuring functions (done in add-text-stats-core).
