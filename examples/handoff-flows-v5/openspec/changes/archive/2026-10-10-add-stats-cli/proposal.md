# Proposal

> Slice of split change [add-text-stats-cli](../add-text-stats-cli/slices.md) - shared design session: [../add-text-stats-cli/execution/](../add-text-stats-cli/execution/).

## Why

textkit stats command (text and JSON), behind the stats-cli flag. Part of [add-text-stats-cli](../add-text-stats-cli/proposal.md), split so each PR stays reviewable.

## What Changes

- textkit stats command (text and JSON), behind the stats-cli flag
- Behind the feature flag `stats-cli` (off by default); removed later by a cleanup slice.

## Capabilities

### New Capabilities

- `stats-cli`

### Modified Capabilities

_None._

## Impact

See the parent plan [slices.md](../add-text-stats-cli/slices.md); depends on: add-text-stats-core, add-cli.

## Size Budget

- Requirements in deltas: 2
- Estimated changed lines: 135
- Split decision: slice of a split
