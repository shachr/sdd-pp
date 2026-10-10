> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/stats-cli/spec.md) · [spec](../spec.md) · [grill session](../grill.md)

# 02 - stats JSON output

Status: ready-for-agent
Estimate: ~30 lines

## What to build

Makes [delta](../../specs/stats-cli/spec.md) - "Requirement: Stats JSON output" work in the `stats` entry, with tests in `test/cli-stats.test.mjs`.

## Blocked by

- 01 - stats command behind the flag

## Acceptance criteria

Scenarios of the [delta](../../specs/stats-cli/spec.md), by name:

- [ ] Scenario "JSON flag" passes
