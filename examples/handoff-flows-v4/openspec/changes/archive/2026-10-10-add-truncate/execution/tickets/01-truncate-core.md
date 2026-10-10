> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/truncation/spec.md) · [spec](../spec.md) · [grill session](../grill.md)

# 01 - truncate: fit, cut and mark

Status: done

## What to build

Makes [delta](../../specs/truncation/spec.md) - "Requirement: Short text unchanged" and [delta](../../specs/truncation/spec.md) - "Requirement: Truncation with ellipsis" work. Slice: new module `src/truncate.mjs` with the `truncate` export and its cutting algorithm (spec Implementation Decisions), tests in `test/truncate.test.mjs`.

## Blocked by

None - can start immediately.

## Acceptance criteria

Scenarios of the [delta](../../specs/truncation/spec.md), by name:


- [x] Scenario "Fits already" passes
- [x] Scenario "Exact length" passes
- [x] Scenario "Cut at word boundary" passes
- [x] Scenario "Long single word" passes
- [x] Scenario "Custom ellipsis" passes
