> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/stats-cli/spec.md) · [spec](../spec.md) · [grill session](../grill.md)

# 02 - textkit stats --json

Status: done
Estimate: ~35 lines

## What to build

Makes [delta](../../specs/stats-cli/spec.md) - "Requirement: Stats JSON output" work: the `--json` option of the `stats` entry in `src/cli.mjs`, tests in `test/cli-stats.test.mjs`.

## Blocked by

- 01 - textkit stats behind the stats-cli flag

## Acceptance criteria

Scenarios of the [delta](../../specs/stats-cli/spec.md), by name:

- [x] Scenario "JSON flag" passes
