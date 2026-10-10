> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/stats-cli/spec.md) · [spec](../spec.md) · [grill session](../grill.md)

# 01 - textkit stats behind the stats-cli flag

Status: ready-for-agent
Estimate: ~90 lines

## What to build

Makes [delta](../../specs/stats-cli/spec.md) - "Requirement: Stats command" and [delta](../../specs/stats-cli/spec.md) - "Requirement: Stats command flag" work end to end: `io.readStdin` wired in `bin/textkit.mjs`, the `stats` entry and the flag check in `src/cli.mjs`, tests in `test/cli-stats.test.mjs` (fake streams + one spawn test).

## Blocked by

None - can start immediately.

## Acceptance criteria

Scenarios of the [delta](../../specs/stats-cli/spec.md), by name:

- [ ] Scenario "Stats summary" passes
- [ ] Scenario "Unknown stats option" passes
- [ ] Scenario "Flag off" passes
- [ ] Scenario "Flag on" passes
