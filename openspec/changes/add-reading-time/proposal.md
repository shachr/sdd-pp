# Proposal

## Why

textkit can shape text (slugs) but tells callers nothing about it. Blogs and docs sites built on textkit want to show "N min read" next to an article, and today every caller hand-rolls its own estimate with different rules.

## What Changes

- New: estimate how many whole minutes a text takes to read, at a default or caller-chosen reading speed.
- Only real words count towards the estimate; text without words reads in zero minutes.
- A reading speed that makes no sense is rejected instead of producing a meaningless estimate.
- No change to `slugify`.

## Capabilities

### New Capabilities

- `reading-time`: estimating reading time for a text.

### Modified Capabilities

_None._

## Impact

New `src/reading-time.mjs` export and its tests. No dependencies, no changes to existing exports.

## Size Budget

- Requirements in deltas: 3
- Expected tickets / plan tasks: 2
- Estimated changed lines: 80
- Split decision: fits
