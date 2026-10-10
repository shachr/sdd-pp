# Proposal

## Why

Headings and report titles built from user input come out inconsistently cased ("the LORD of the rings"), and each caller fixes it with its own ad-hoc capitalisation that also capitalises small words like "of". textkit should offer one predictable headline-style casing.

## What Changes

- Add a `toTitleCase(text)` function to textkit that returns the text in headline style.
- Every word is capitalised, except a fixed list of minor words, which stay lowercase unless they open or close the title.
- The spacing of the input is kept exactly.
- Input that is not a string is rejected with a `TypeError`.

## Capabilities

### New Capabilities
- `title-case`: headline-style casing of a short piece of text.

### Modified Capabilities
- (none)

## Impact

- New module and tests in textkit; `slugify` and `wrapText` are unchanged; no new dependencies.
- Out of scope: locale-specific casing rules, preserving acronyms, hyphenated compounds, and words that start with punctuation (e.g. `(draft)`).

## Size Budget

- Requirements in deltas: 4
- Expected tickets / plan tasks: 3
- Estimated changed lines: ~100
- Split decision: fits (one change)
