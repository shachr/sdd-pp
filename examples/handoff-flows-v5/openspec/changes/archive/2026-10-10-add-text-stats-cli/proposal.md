# Proposal

## Why

People use textkit from scripts and the terminal, not only from code, and they keep asking how long a text is. textkit has no way to count words or sentences and no command-line entry point.

## What Changes

- New: count the words and sentences in a text.
- New: a `textkit` command-line tool with a `slugify` command and clear usage errors.
- New: a `stats` command that prints a text's word and sentence counts, also as JSON.
- No change to the `slugify` function.

## Capabilities

### New Capabilities

- `text-stats`: counting words and sentences.
- `cli`: the textkit command-line tool and its errors.
- `stats-cli`: the stats command.

### Modified Capabilities

_None._

## Impact

New library module, a command-line entry point (`bin`) and tests. No dependencies.

## Size Budget

- Requirements in deltas: 6
- Expected tickets / plan tasks: 6
- Estimated changed lines: 480
- Split decision: to be decided by /split-check
