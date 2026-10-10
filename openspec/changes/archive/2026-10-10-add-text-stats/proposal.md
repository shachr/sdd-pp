# Proposal

## Why

Post previews show "N words · M min read", and callers count words with ad-hoc regexes that disagree with how textkit already defines a word for wrapping.

## What Changes

- New word count helper using textkit's definition of a word.
- New reading-time estimate in whole minutes with a default and a caller-chosen reading speed.
- Bad input is rejected with an error, like the existing helpers.

## Capabilities

### New Capabilities
- `text-stats`: counting words and estimating reading time for a text.

### Modified Capabilities
- None.

## Impact

Two new public exports from the package entry point; no dependencies; `slugify` and `wordWrap` unchanged.

## Size Budget

- Requirements in deltas: 3
- Expected tickets / plan tasks: 2
- Estimated changed lines: ~120 (code + tests)
- Split decision: fits
