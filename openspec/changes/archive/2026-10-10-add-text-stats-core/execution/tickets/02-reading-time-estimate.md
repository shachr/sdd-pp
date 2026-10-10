> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/text-stats/spec.md) · [spec](../spec.md) · [grill session](../grill.md)

# 02 - Reading time estimate

Status: done
Estimate: ~20 lines

## What to build

Makes [delta](../../specs/text-stats/spec.md) - "Requirement: Reading time estimate" work: `readingMinutes` and `textStats` in `src/stats.mjs`, tests in `test/stats.test.mjs`.

## Blocked by

- 01 (uses `wordCount`).

## Acceptance criteria

Scenarios of the [delta](../../specs/text-stats/spec.md), by name:

- [x] Scenario "Short text reads in one minute" passes
