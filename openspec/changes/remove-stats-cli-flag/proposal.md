# Proposal

> Slice of split change [add-text-stats-cli](../add-text-stats-cli/slices.md) - shared design session: [../add-text-stats-cli/execution/](../add-text-stats-cli/execution/).

## Why

Release the stats sub-command by removing its flag. Part of [add-text-stats-cli](../add-text-stats-cli/proposal.md), split so each PR stays reviewable.

## What Changes

- Release the stats sub-command by removing its flag
- Removes the feature flag `stats-cli`.

## Capabilities

### New Capabilities

- `stats-cli`

### Modified Capabilities

_None._

## Impact

See the parent plan [slices.md](../add-text-stats-cli/slices.md); depends on: add-stats-cli.

## Split notes

<!-- Deliberate differences from the original change, recorded by this slice (split.mjs loss reads them):
     - dropped: Requirement|Scenario "<original name>" - <why>
     - added: Requirement|Scenario "<new name>" - <why>
     - renamed_from: Requirement|Scenario "<original name>" -> "<new name>" - <why equivalent>
     - split_from: Requirement "<original name>" - confirmed -->

_None._
