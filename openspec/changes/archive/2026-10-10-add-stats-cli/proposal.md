# Proposal

> Slice of split change [add-text-stats-cli](../add-text-stats-cli/slices.md) - shared design session: [../add-text-stats-cli/execution/](../add-text-stats-cli/execution/).

## Why

The stats sub-command, dark behind a flag. Part of [add-text-stats-cli](../add-text-stats-cli/proposal.md), split so each PR stays reviewable.

## What Changes

- The stats sub-command, dark behind a flag
- Behind the feature flag `stats-cli` (off by default); removed later by a cleanup slice.

## Capabilities

### New Capabilities

- `stats-cli`

### Modified Capabilities

_None._

## Impact

See the parent plan [slices.md](../add-text-stats-cli/slices.md); depends on: add-text-stats-core, add-cli.

## Split notes

<!-- Deliberate differences from the original change, recorded by this slice (split.mjs loss reads them):
     - dropped: Requirement|Scenario "<original name>" - <why>
     - added: Requirement|Scenario "<new name>" - <why>
     - renamed_from: Requirement|Scenario "<original name>" -> "<new name>" - <why equivalent>
     - split_from: Requirement "<original name>" - confirmed -->

- added: Requirement "Stats command flag" - keeps the user-visible stats sub-command dark until remove-stats-cli-flag (delivery decision Q10 of the shared session)
