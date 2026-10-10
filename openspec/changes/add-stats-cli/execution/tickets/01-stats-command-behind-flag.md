> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/stats-cli/spec.md) · [spec](../spec.md) · [grill session](../grill.md)

# 01 - stats command behind the flag

Status: ready-for-agent
Estimate: ~80 lines

## What to build

Makes [delta](../../specs/stats-cli/spec.md) - "Requirement: Stats command" and "Requirement: Stats command flag" work: the `stats` entry, the flag check in `run`, the shared test helper `test/cli-io.mjs`, tests in `test/cli-stats.test.mjs`.

## Blocked by

None - can start immediately.

## Acceptance criteria

Scenarios of the [delta](../../specs/stats-cli/spec.md), by name:

- [ ] Scenario "Stats summary" passes
- [ ] Scenario "Flag off" passes
- [ ] Scenario "Flag on" passes
