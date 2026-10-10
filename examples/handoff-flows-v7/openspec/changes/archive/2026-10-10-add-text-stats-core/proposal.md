# Proposal

> Slice of split change [add-text-stats](../add-text-stats/slices.md) - shared design session: [../add-text-stats/execution/](../add-text-stats/execution/).

## Why

Library functions that measure a text. Part of [add-text-stats](../add-text-stats/proposal.md), split so each PR stays reviewable.

## What Changes

- Library functions that measure a text

## Capabilities

### New Capabilities

- `text-stats`

### Modified Capabilities

_None._

## Impact

See the parent plan [slices.md](../add-text-stats/slices.md); depends on: none.

## Split notes

<!-- Deliberate differences from the original change, recorded by this slice (split.mjs loss reads them):
     - dropped: Requirement|Scenario "<original name>" - <why>
     - added: Requirement|Scenario "<new name>" - <why>
     - renamed_from: Requirement|Scenario "<original name>" -> "<new name>" - <why equivalent>
     - split_from: Requirement "<original name>" - confirmed -->

- renamed_from: Requirement "Reading time" -> "Reading time estimate" - same behaviour; the slice's narrowed session renamed it to say it is an estimate
- dropped: Scenario "Empty text reads in zero minutes" - redundant with the formula (0 words / 200 rounded up is 0); kept the scenario list minimal (Grok Bot on behalf of shachar bardavid)
