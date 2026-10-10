> Source of truth: [proposal](../proposal.md) · specs: ../specs/

<!-- written by split-check.mjs; estimates from execution/size-estimate.md -->

split-check add-text-stats-cli: OVER BUDGET (warning) - ~400 lines estimated, budget ~300

| Requirement | Scenarios | Code touched | Estimate |
|---|---|---|---|
| Slugify command | 2 | src/cli.mjs (new: argv dispatch, stdin reading, io injection), bin/textkit.mjs (new), package.json bin, test/cli.test.mjs (new, incl. one spawn test) | 130 |
| Command errors | 2 | src/cli.mjs (usage text, exit codes), test/cli.test.mjs | 60 |
| Stats command | 1 | src/cli.mjs (stats sub-command, uses src/stats.mjs), test/cli-stats.test.mjs (new) | 70 |
| Stats JSON output | 1 | src/cli.mjs (option parsing), test/cli-stats.test.mjs | 40 |
| Word count | 2 | src/stats.mjs (new), test/stats.test.mjs (new) | 45 |
| Sentence count | 2 | src/stats.mjs, test/stats.test.mjs | 55 |
| **Total** | | | **400** |

! estimated 400 lines > ~300-line PR budget - propose a split

Proposed slices (execution/split-proposal.md, approved by Grok Bot on behalf of shachar bardavid (decisions delegated; slices accepted as proposed)), ~450 lines in total:

| Slice | Requirements | Depends on | Flag | Estimate |
|---|---|---|---|---|
| add-text-stats-core | Word count; Sentence count | - | - | 100 |
| add-cli | Slugify command; Command errors | - | - | 190 |
| add-stats-cli | Stats command; Stats JSON output | add-text-stats-core, add-cli | stats-cli | 135 |
| remove-stats-cli-flag | - | add-stats-cli | removes stats-cli | 25 |

Ready first: add-text-stats-core, add-cli
Parallel-safe pairs (no dependency, no shared capability): add-text-stats-core ∥ add-cli

Approved. Apply: node .openspec-handoff/scripts/split.mjs apply add-text-stats-cli
