# Proposal

## Why

People use textkit from scripts and the terminal, not only from code, and they keep asking how long a text is and how long it takes to read. textkit has no way to measure a text and no command-line entry point.

## What Changes

- New: measure a text - how many words and sentences it has, and roughly how many minutes it takes to read.
- New: a `textkit` command-line tool that turns text into slugs and reports mistakes with a usage message.
- New: a `stats` sub-command that prints a text's measurements for people, and as JSON for scripts.
- No change to the `slugify` function.

## Capabilities

### New Capabilities

- `text-stats`: measuring a text.
- `cli`: the textkit command-line tool and its errors.
- `stats-cli`: the stats sub-command.

### Modified Capabilities

_None._

## Impact

New library module, a command-line entry point (`bin`) and tests. No dependencies.

## Size Budget

- Requirements in deltas: 7, capabilities: 3 (over the split gate: <= 5 and <= 2)
- Expected tickets / plan tasks: about 7
- Changed lines: estimated after planning
- Split decision: to be decided by /split-check
