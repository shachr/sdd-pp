> Source of truth: [proposal](../proposal.md) · specs: ../specs/

<!-- written by split-check.mjs (counts only; names stay in the deltas) -->

split-check add-text-stats-cli: WARNING - 7 requirements (> 5), 3 capabilities (> 2) - consider splitting

- cli: 2 requirements
- stats-cli: 2 requirements
- text-stats: 3 requirements

Proposed slices (execution/split-proposal.md, approved by Grok Bot on behalf of shachar bardavid (decisions delegated; proposed slices accepted unchanged)):

| Slice | Requirements | Depends on | Flag |
|---|---|---|---|
| add-text-stats-core | 3 | - | - |
| add-cli | 2 | - | - |
| add-stats-cli | 2 | add-text-stats-core, add-cli | stats-cli |
| remove-stats-cli-flag | 0 | add-stats-cli | removes stats-cli |

Ready first: add-text-stats-core, add-cli
Parallel-safe pairs (no dependency, no shared capability): add-text-stats-core ∥ add-cli

Approved. Apply (after committing the deltas - that commit is the loss-check baseline): node .openspec-handoff/scripts/split.mjs apply add-text-stats-cli
