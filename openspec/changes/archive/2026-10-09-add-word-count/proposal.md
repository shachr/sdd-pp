# Proposal

## Why

Callers that show "N words" next to a draft or enforce a word limit on a form field currently split on a single space themselves, which over-counts on double spaces and newlines and counts stray punctuation as words. textkit should give one consistent answer.

## What Changes

- Add a `countWords(text)` function to textkit that returns the number of words in a string.
- Words are separated by any run of whitespace (spaces, tabs, newlines); tokens with no letters or digits (a lone dash, an ellipsis) are not words.
- Non-string input is rejected with a `TypeError` instead of being coerced.

## Capabilities

### New Capabilities
- `text-statistics`: measurements over a piece of text, starting with word counting.

### Modified Capabilities
- (none)

## Impact

- New module and tests in textkit; no changes to `slugify` or `truncate`; no new dependencies.

## Size Budget

- Requirements in deltas: 3
- Expected tickets / plan tasks: 2
- Estimated changed lines: ~70
- Split decision: fits
