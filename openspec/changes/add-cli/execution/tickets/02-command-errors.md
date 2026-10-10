> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/cli/spec.md) · [spec](../spec.md) · [grill session](../grill.md)

# 02 - textkit CLI: usage errors

Status: ready-for-agent
Estimate: ~60 lines

## What to build

Makes [delta](../../specs/cli/spec.md) - "Requirement: Command errors" work: the usage text and exit code 2 in `src/cli.mjs` for an unknown command, no command, and `slugify` without text; tests in `test/cli.test.mjs`.

## Blocked by

- 01 - textkit CLI: slugify command

## Acceptance criteria

Scenarios of the [delta](../../specs/cli/spec.md), by name:

- [ ] Scenario "Unknown command" passes
- [ ] Scenario "Missing argument" passes
