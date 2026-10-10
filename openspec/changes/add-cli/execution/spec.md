> Source of truth: [proposal](../proposal.md) · [spec delta](../specs/cli/spec.md) · [grill session](grill.md) · parent [grill session](../../add-text-stats-cli/execution/grill.md)

Status: ready-for-agent

## Problem Statement

See [proposal.md](../proposal.md) - "Why".

## Solution

A `textkit` command-line tool whose `slugify` command and usage errors behave as the [cli delta](../specs/cli/spec.md) says.

## User Stories

1. As a shell user, I want to slugify a phrase from the terminal, so that I can name files and branches without writing code - [delta](../specs/cli/spec.md) "Requirement: Slugify command" (Scenario "Slugify argument").
2. As a shell user, I want a clear usage message and a non-zero exit when I mistype or forget something, so that scripts fail loudly - [delta](../specs/cli/spec.md) "Requirement: Command errors" (Scenarios "Unknown command", "Missing argument").

## Implementation Decisions

- `src/cli.mjs` exports `run(argv, io)` returning the exit code; `io` is `{ stdin, stdout, stderr, env }` with `write`-able streams (parent grill Q8, slice grill Q1).
- A command table `{ slugify: (args, io) => code }` that later slices extend with one entry (slice grill Q1).
- Several text arguments are joined with a single space (slice grill Q3).
- `bin/textkit.mjs` wires `process.argv.slice(2)` and the process streams, and sets `process.exitCode`; `package.json` gets a `bin` entry.
- Usage text: two lines (slice grill Q4).

## Testing Decisions

- `run` is tested with fake streams (collecting strings), one test per delta scenario, named after it; one spawn test runs `bin/textkit.mjs` to prove the wiring.
- Prior art: `test/slugify.test.mjs`.

## Out of Scope

- Reading text from standard input for slugify (dropped, see parent amendments).
- `--help`, `stats` (slice add-stats-cli).

## Further Notes

Decisions were delegated to Grok Bot; see [grill.md](grill.md).
