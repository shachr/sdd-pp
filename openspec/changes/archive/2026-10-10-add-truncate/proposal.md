# Proposal

## Why

Apps built on textkit show previews of long text (titles, list rows, notifications) and each one shortens text differently - some overflow the space, some cut words in half.

## What Changes

- New: shorten a text to a length limit for previews, marking the cut with an ellipsis that counts towards the limit.
- Cuts land between words when possible; text that already fits is left alone.
- Callers can choose their own ellipsis.
- Limits that make no sense are rejected.
- No change to `slugify`.

## Capabilities

### New Capabilities

- `truncation`: shortening text to a length limit.

### Modified Capabilities

_None._

## Impact

New `src/truncate.mjs` export and its tests. No dependencies, no changes to existing exports.

## Size Budget

- Requirements in deltas: 3
- Expected tickets / plan tasks: 2
- Estimated changed lines: 80
- Split decision: fits
