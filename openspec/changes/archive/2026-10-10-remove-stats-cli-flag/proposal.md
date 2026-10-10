# Proposal

> Slice of split change [add-text-stats-cli](../add-text-stats-cli/slices.md) - shared design session: [../add-text-stats-cli/execution/](../add-text-stats-cli/execution/).

## Why

Release the stats command by removing the stats-cli flag. Part of [add-text-stats-cli](../add-text-stats-cli/proposal.md), split so each PR stays reviewable.

## What Changes

- Release the stats command by removing the stats-cli flag
- Removes the feature flag `stats-cli`.

## Capabilities

### New Capabilities

- `stats-cli`

### Modified Capabilities

_None._

## Impact

See the parent plan [slices.md](../add-text-stats-cli/slices.md); depends on: add-stats-cli.

## Size Budget

- Requirements in deltas: 0
- Estimated changed lines: 25
- Split decision: slice of a split
