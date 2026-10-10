> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/truncation/spec.md) · [spec](../spec.md) · [grill session](../grill.md)

# 02 - truncate: refuse invalid limits

Status: ready-for-agent

## What to build

Makes [delta](../../specs/truncation/spec.md) - "Requirement: Limit validation" work. Slice: a guard at the top of `truncate` in `src/truncate.mjs`, tests in `test/truncate.test.mjs`.

## Blocked by

- 01-truncate-core

## Acceptance criteria

Scenarios of the [delta](../../specs/truncation/spec.md), by name:


- [ ] Scenario "Invalid limit rejected" passes
