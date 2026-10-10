# Proposal

## Why

Callers that print text to a terminal or a fixed-width log column currently wrap long messages by hand, which breaks words in the middle and lets lines run past the column. textkit should provide one predictable way to fit text into a fixed width.

## What Changes

- Add a `wrapText(text, width)` function to textkit that splits text into lines no wider than `width`.
- Lines break between words; a single word wider than the column is split across lines rather than overflowing.
- Line breaks already present in the input are kept.
- An invalid width is rejected with a `RangeError`.

## Capabilities

### New Capabilities
- `text-wrapping`: fitting text into a fixed column width as a list of lines.

### Modified Capabilities
- (none)

## Impact

- New module and tests in textkit; `slugify` is unchanged; no new dependencies.

## Size Budget

- Requirements in deltas: 4
- Expected tickets / plan tasks: 2-3
- Estimated changed lines: ~90
- Split decision: fits
