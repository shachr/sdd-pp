# Proposal

## Why

`greet` can only say `Hello, World!`. Users want to greet a specific person from scripts, which is the smallest useful step beyond the default.

## What Changes

- `greet <name>` greets that person.
- Blank or whitespace-only names fall back to the default greeting.
- No change to running `greet` without arguments.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `greeting`: adds greeting a named person; the default greeting is unchanged.

## Impact

`src/greet.mjs`, `src/cli.mjs`, and their tests. No dependencies, no API breaks.

## Size Budget

- Requirements in deltas: 2
- Expected tickets / plan tasks: 2
- Estimated changed lines: 40
- Split decision: fits
