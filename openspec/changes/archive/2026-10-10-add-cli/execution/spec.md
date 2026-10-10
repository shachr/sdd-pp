> Source of truth: [proposal](../proposal.md) · [spec delta](../specs/cli/spec.md) · [grill session](grill.md) · parent [grill session](../../add-text-stats-cli/execution/grill.md)

Status: ready-for-agent

## Problem Statement

See [proposal.md](../proposal.md) - "Why".

## Solution

A `textkit` command-line tool whose `slugify` command and usage errors behave as the [cli delta](../specs/cli/spec.md) says.

## User Stories

1. As a shell user, I want to slugify a phrase from the terminal or a pipe, so that I can name files and branches without writing code - [delta](../specs/cli/spec.md) "Requirement: Slugify command" (Scenarios "Slugify argument", "Slugify from stdin").
2. As a shell user, I want a clear usage message and a non-zero exit when I mistype or forget the command, so that scripts fail loudly - [delta](../specs/cli/spec.md) "Requirement: Usage errors" (Scenarios "Unknown command", "Missing argument").

## Implementation Decisions

- `src/cli.mjs` exports `run(argv, io)` returning the exit code; `io` is `{ stdout, stderr, readStdin, env }` (parent grill Q9, slice grill Q1).
- A command table `{ slugify: (args, io) => code }` that later slices extend with one entry (slice grill Q1).
- Several text arguments are joined with a single space (slice grill Q3); no argument -> `io.readStdin()`, trailing newline trimmed.
- `bin/textkit.mjs` wires `process.argv.slice(2)`, the process streams and `fs.readFileSync(0)`; `package.json` gets a `bin` entry.

## Testing Decisions

- `run` is tested with fake streams, one test per delta scenario, named after it; one spawn test runs `bin/textkit.mjs` to prove the wiring (including stdin).

## Out of Scope

- `--help`, `stats` (slice add-stats-cli).

## Further Notes

Decisions were delegated to Grok Bot; see [grill.md](grill.md).
