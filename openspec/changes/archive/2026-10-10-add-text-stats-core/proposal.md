# Proposal

> Slice of split change [add-text-stats-cli](../add-text-stats-cli/slices.md) - shared design session: [../add-text-stats-cli/execution/](../add-text-stats-cli/execution/).

## Why

Library functions that measure a text. Part of [add-text-stats-cli](../add-text-stats-cli/proposal.md), split so each PR stays reviewable.

## What Changes

- Library functions that measure a text

## Capabilities

### New Capabilities

- `text-stats`

### Modified Capabilities

_None._

## Impact

See the parent plan [slices.md](../add-text-stats-cli/slices.md); depends on: none.

## Split notes

<!-- Deliberate differences from the original change, recorded by this slice (split.mjs loss reads them):
     - dropped: Requirement|Scenario "<original name>" - <why>
     - added: Requirement|Scenario "<new name>" - <why>
     - renamed_from: Requirement|Scenario "<original name>" -> "<new name>" - <why equivalent>
     - split_from: Requirement "<original name>" - confirmed -->

- dropped: Scenario "Empty text reads in zero minutes" - deliberate test drop (v6); the zero-words case is already pinned by "Whitespace only" and the requirement text (0 / 200 rounded up = 0)
