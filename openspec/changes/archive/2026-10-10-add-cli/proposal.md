# Proposal

> Slice of split change [add-text-stats-cli](../add-text-stats-cli/slices.md) - shared design session: [../add-text-stats-cli/execution/](../add-text-stats-cli/execution/).

## Why

The textkit command-line tool with slugify and usage errors. Part of [add-text-stats-cli](../add-text-stats-cli/proposal.md), split so each PR stays reviewable.

## What Changes

- The textkit command-line tool with slugify and usage errors

## Capabilities

### New Capabilities

- `cli`

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

- renamed_from: Requirement "Command errors" -> "Usage errors" - same behaviour (usage message on stderr, exit 2 for unknown or missing command); the new name matches what the user sees, decided in the add-cli grill session (Q2)
