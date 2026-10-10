> Source of truth: [proposal](../proposal.md) · specs: ../specs/

<!-- written by split-check.mjs (counts only; names stay in the deltas) -->

split-check add-text-stats: WARNING - 6 requirements (> 5) - consider splitting

- stats-cli: 3 requirements
- text-stats: 3 requirements

Proposed slices (execution/split-proposal.md, approved by Grok Bot on behalf of shachar bardavid (decisions delegated; proposed slices accepted unchanged)):

| Slice | Requirements | Depends on | Flag |
|---|---|---|---|
| add-text-stats-core | 3 | - | - |
| add-stats-cli | 3 | add-text-stats-core | - |

Ready first: add-text-stats-core
Parallel-safe pairs (no dependency, no shared capability): none

Approved. Apply (after committing the deltas - that commit is the loss-check baseline): node .openspec-handoff/scripts/split.mjs apply add-text-stats
