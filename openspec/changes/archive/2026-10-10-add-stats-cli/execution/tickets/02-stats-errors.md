> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/stats-cli/spec.md) · [spec](../spec.md) · [grill session](../grill.md)

# 02 - Stats errors

Status: done
Estimate: ~30 lines

## What to build

Makes [delta](../../specs/stats-cli/spec.md) - "Requirement: Stats errors" work in `src/stats-cli.mjs` (+ `bin/textkit-stats.mjs`), tests in `test/stats-cli.test.mjs`.

## Acceptance criteria

Scenarios of the [delta](../../specs/stats-cli/spec.md), by name:

- [x] Scenario "Unknown option" passes
- [x] Scenario "Unreadable file" passes
