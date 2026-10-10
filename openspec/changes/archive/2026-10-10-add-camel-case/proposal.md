# Proposal

## Why

Apps built on textkit turn form labels and headings into identifiers (object keys, style names) by hand, and each does it differently. textkit already standardises the URL-slug form; the camelCase form is missing.

## What Changes

- New: turn a free-text phrase into a camelCase identifier.
- Any non-letter, non-digit characters separate words; letters from any script are kept.
- Input casing is normalised.
- Text with no letters or digits gives an empty identifier.
- No change to `slugify`.

## Capabilities

### New Capabilities

- `casing`: converting phrases into case-styled identifiers.

### Modified Capabilities

_None._

## Impact

New `src/camel-case.mjs` export and its tests. No dependencies, no changes to existing exports.

## Size Budget

- Requirements in deltas: 3
- Expected tickets / plan tasks: 2
- Estimated changed lines: 60
- Split decision: fits
