# Proposal

## Why

Services using textkit move identifiers between JSON fields, JavaScript properties and CSS/URL names, and each one hand-rolls its own conversion that disagrees on acronyms and digits. One shared, predictable conversion removes those mismatches.

## What Changes

- New helpers that convert an identifier or phrase to snake_case, kebab-case and camelCase.
- All three agree on where words start and end, including acronyms, digits and non-ASCII letters.
- Empty input gives an empty result; non-text input is rejected with a clear error.

## Capabilities

### New Capabilities
- `case-conversion`: converting identifiers between naming styles

### Modified Capabilities

_None._

## Impact

- New public helpers in textkit's entry point; no change to `slugify` or `excerpt`.
- No new dependencies.

## Size Budget

- Requirements in deltas: 5
- Expected tickets / plan tasks: 2-3
- Estimated changed lines: ~160 (code + tests)
- Split decision: fits
