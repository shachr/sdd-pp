> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/stats-cli/spec.md) · [spec](../spec.md) · [grill session](../grill.md)

# 01 - stats command behind the flag

Status: done
Estimate: ~80 lines

## What to build

Makes [delta](../../specs/stats-cli/spec.md) - "Requirement: Stats command" and "Requirement: Stats command flag" work: the `stats` entry, the flag check in `run`, the shared test helper `test/cli-io.mjs`, tests in `test/cli-stats.test.mjs`.

## Blocked by

None - can start immediately.

## Acceptance criteria

Scenarios of the [delta](../../specs/stats-cli/spec.md), by name:

- [x] Scenario "Stats summary" passes
- [x] Scenario "Flag off" passes
- [x] Scenario "Flag on" passes
