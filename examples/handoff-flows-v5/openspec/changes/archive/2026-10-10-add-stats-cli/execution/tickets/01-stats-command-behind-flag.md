> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/stats-cli/spec.md) · [spec](../spec.md) · [grill session](../grill.md)

# 01 - textkit stats behind the stats-cli flag

Status: done
Estimate: ~90 lines

## What to build

Makes [delta](../../specs/stats-cli/spec.md) - "Requirement: Stats command" and [delta](../../specs/stats-cli/spec.md) - "Requirement: Stats command flag" work end to end: `io.readStdin` wired in `bin/textkit.mjs`, the `stats` entry and the flag check in `src/cli.mjs`, tests in `test/cli-stats.test.mjs` (fake streams + one spawn test).

## Blocked by

None - can start immediately.

## Acceptance criteria

Scenarios of the [delta](../../specs/stats-cli/spec.md), by name:

- [x] Scenario "Stats summary" passes
- [x] Scenario "Unknown stats option" passes
- [x] Scenario "Flag off" passes
- [x] Scenario "Flag on" passes
