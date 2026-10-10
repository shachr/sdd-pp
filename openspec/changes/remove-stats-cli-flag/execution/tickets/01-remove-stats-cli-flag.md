> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/stats-cli/spec.md) · [spec](../spec.md) · [grill session](../grill.md)

# 01 - release textkit stats (remove the stats-cli flag)

Status: ready-for-agent
Estimate: ~25 lines

## What to build

Removes [delta](../../specs/stats-cli/spec.md) - "Requirement: Stats command flag": the flag check in `src/cli.mjs`, the flag tests and the variable in `test/cli-stats.test.mjs`.

## Blocked by

None - can start immediately.

## Acceptance criteria

- [ ] `textkit stats` works with an empty environment (test)
- [ ] `rg TEXTKIT_STATS_CLI src bin test` finds nothing
