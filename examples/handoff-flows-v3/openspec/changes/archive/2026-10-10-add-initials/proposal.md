# Proposal

## Why

Apps built on textkit show a circle with a person's initials when there is no profile picture. Each app hand-rolls the initials and gets hyphenated, lowercase or decorated names wrong (one letter for "Jean-Luc", a blank circle for a name that starts with a bracket).

## What Changes

- New: get the initials of a display name - one uppercase letter per name part, hyphenated parts counted separately.
- Characters that are not letters never become initials; a name with no letters gives no initials, so callers can fall back to an icon.
- No limit on the number of letters; the caller decides how many to show.
- No change to `slugify`.

## Capabilities

### New Capabilities

- `initials`: deriving initials from a display name.

### Modified Capabilities

_None._

## Impact

New `src/initials.mjs` export and its tests. No dependencies, no changes to existing exports.

## Size Budget

- Requirements in deltas: 3
- Expected tickets / plan tasks: 2
- Estimated changed lines: 70
- Split decision: fits
