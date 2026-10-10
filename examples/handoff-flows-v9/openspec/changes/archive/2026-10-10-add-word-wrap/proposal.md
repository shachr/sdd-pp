# Proposal

## Why

textkit can make slugs but cannot lay text out for fixed-width output (terminal help, commit messages, plain-text email). Callers hand-roll line wrapping and get it wrong on long words and blank lines.

## What Changes

- New `wordWrap` helper that wraps text to a maximum line width at word boundaries, with a default width.
- Words longer than the width are broken so no line exceeds it.
- Existing line breaks (paragraphs) are kept.
- Invalid text or width is rejected with an error.

## Capabilities

### New Capabilities
- `text-wrap`: wrapping text into lines of a maximum width.

### Modified Capabilities
- None.

## Impact

New public export from the package entry point; no dependencies; existing `slugify` unchanged.

## Size Budget

- Requirements in deltas: 4
- Expected tickets / plan tasks: 2
- Estimated changed lines: ~150 (code + tests)
- Split decision: fits
