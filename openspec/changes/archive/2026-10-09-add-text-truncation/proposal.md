# Proposal

## Why

textkit can make slugs but has no way to shorten text for previews (list views, notifications, link cards). Callers hand-roll `text.slice(0, n) + '...'`, which overshoots the limit and cuts words in half.

## What Changes

- New `truncate(text, maxLength)` export that returns text no longer than `maxLength` characters, ending in a single `…` when shortened.
- Shortened text ends at a word boundary when one is available, so words are not cut in half.
- Invalid limits are rejected with an error instead of producing surprising output.

## Capabilities

### New Capabilities

- `text-truncation`: shortening text to a character limit for previews, with an ellipsis and word-boundary awareness.

### Modified Capabilities

_None._

## Impact

New module `src/truncate.mjs` and its tests. No dependencies, no change to `slugify`.

## Size Budget

- Requirements in deltas: 4
- Expected tickets / plan tasks: 2
- Estimated changed lines: 80
- Split decision: fits
