> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/text-stats/spec.md) · [spec](../spec.md) · [grill session](../grill.md)

# 01 - Word and sentence count

Status: ready-for-agent
Estimate: ~45 lines

## What to build

Makes [delta](../../specs/text-stats/spec.md) - "Requirement: Word count" and "Requirement: Sentence count" work: `wordCount` and `sentenceCount` in `src/stats.mjs`, tests in `test/stats.test.mjs`.

## Blocked by

None - can start immediately.

## Acceptance criteria

Scenarios of the [delta](../../specs/text-stats/spec.md), by name:

- [ ] Scenario "Words in a sentence" passes
- [ ] Scenario "Whitespace only" passes
- [ ] Scenario "Sentences ending in punctuation" passes
- [ ] Scenario "No terminal punctuation" passes
