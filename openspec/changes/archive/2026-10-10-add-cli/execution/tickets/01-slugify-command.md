> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/cli/spec.md) · [spec](../spec.md) · [grill session](../grill.md)

# 01 - textkit CLI: slugify command

Status: done
Estimate: ~110 lines

## What to build

Makes [delta](../../specs/cli/spec.md) - "Requirement: Slugify command" work, end to end: `src/cli.mjs` with `run(argv, io)` and the command table, `bin/textkit.mjs`, the `bin` entry in `package.json`, tests in `test/cli.test.mjs` (fake streams + one spawn test).

## Blocked by

None - can start immediately.

## Acceptance criteria

Scenarios of the [delta](../../specs/cli/spec.md), by name:

- [x] Scenario "Slugify argument" passes
- [x] The bin file runs it from a real process (spawn test)
