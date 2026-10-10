# Proposal

## Why

Apps using textkit show text previews (cards, search results, notifications) and today each one cuts strings by hand, which splits words, breaks emoji and leaves stray punctuation. A shared excerpt helper gives every preview the same readable result.

## What Changes

- New excerpt helper: shortens a text to a maximum length for previews, ending on a whole word and marking the cut with an ellipsis.
- The ellipsis can be changed or turned off per call.
- Previews are single-line: runs of whitespace become one space.
- Invalid input is rejected with clear errors.

## Capabilities

### New Capabilities
- `text-excerpt`: shortening text into a word-safe, length-limited preview

### Modified Capabilities

_None._

## Impact

- New public helper in textkit's entry point; no change to `slugify`.
- No new dependencies.

## Size Budget

- Requirements in deltas: 5
- Expected tickets / plan tasks: 2-3
- Estimated changed lines: ~150 (code + tests)
- Split decision: fits
