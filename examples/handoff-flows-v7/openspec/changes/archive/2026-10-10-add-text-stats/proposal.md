# Proposal

## Why

People keep asking textkit how long a text is and how long it takes to read, from code and from the terminal. textkit has no way to measure a text.

## What Changes

- New: measure a text - how many words and sentences it has, and roughly how many minutes it takes to read.
- New: a `textkit-stats` terminal command that prints those measurements for people, and as JSON for scripts, and explains mistakes.
- No change to the `slugify` function.

## Capabilities

### New Capabilities

- `text-stats`: measuring a text.
- `stats-cli`: the textkit-stats terminal command.

### Modified Capabilities

_None._

## Impact

New library module, a command-line entry point (`bin`) and tests. No dependencies.

## Size Budget

- Requirements in deltas: 6, capabilities: 2 (over the split gate: <= 5 requirements)
- Expected tickets / plan tasks: about 6
- Changed lines: estimated after planning
- Split decision: to be decided by /split-check
