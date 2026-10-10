> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/stats-cli/spec.md) · [spec](../spec.md) · [grill session](../grill.md)

# 01 - Stats command and JSON output

Status: ready-for-agent
Estimate: ~50 lines

## What to build

Makes [delta](../../specs/stats-cli/spec.md) - "Requirement: Stats command" and "Requirement: Stats JSON output" work in `src/stats-cli.mjs` (+ `bin/textkit-stats.mjs`), tests in `test/stats-cli.test.mjs`.

## Acceptance criteria

Scenarios of the [delta](../../specs/stats-cli/spec.md), by name:

- [ ] Scenario "Stats summary" passes
- [ ] Scenario "Stats from a file" passes
- [ ] Scenario "JSON flag" passes
