> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/cli/spec.md) · [spec](../spec.md) · [grill session](../grill.md)

# 02 - textkit CLI: usage errors

Status: done
Estimate: ~40 lines

## What to build

Makes [delta](../../specs/cli/spec.md) - "Requirement: Usage errors" work in `src/cli.mjs` (usage text, exit code constant) with tests in `test/cli.test.mjs`.

## Blocked by

- 01 - textkit CLI: slugify command

## Acceptance criteria

Scenarios of the [delta](../../specs/cli/spec.md), by name:

- [x] Scenario "Unknown command" passes
- [x] Scenario "Missing argument" passes
