> Source of truth: [proposal](../proposal.md) · [spec delta](../specs/text-stats/spec.md) · [grill session](grill.md) · parent [grill session](../../add-text-stats/execution/grill.md)

Status: ready-for-agent

## Problem Statement

See [proposal.md](../proposal.md) - "Why".

## Solution

Pure functions in `src/stats.mjs` that behave as the [text-stats delta](../specs/text-stats/spec.md) says.

## User Stories

1. As a developer, I want to count the words and sentences of a text, so that I can show its length - [delta](../specs/text-stats/spec.md) "Requirement: Word count" (Scenarios "Words in a sentence", "Whitespace only") and "Requirement: Sentence count" (Scenarios "Sentences ending in punctuation", "No terminal punctuation").
2. As a developer, I want an estimate of how many minutes a text takes to read, so that I can show it next to the text - [delta](../specs/text-stats/spec.md) "Requirement: Reading time estimate" (Scenario "Short text reads in one minute").

## Implementation Decisions

- `src/stats.mjs` exports `wordCount`, `sentenceCount`, `readingMinutes` and `textStats` (slice grill Q3); `String(text)` coercion (parent grill decisions).

## Testing Decisions

- `test/stats.test.mjs`, one node:test case per delta scenario, named after it.

## Out of Scope

- The terminal command (slice add-stats-cli).
