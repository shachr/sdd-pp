---
approved_by: Grok Bot on behalf of shachar bardavid (decisions delegated; proposed slices accepted unchanged)
---

> Source of truth: [proposal](../proposal.md) · specs: ../specs/

# Split proposal: add-text-stats-cli

## Slices

### Slice: add-text-stats-core
- goal: Library functions that measure a text
- capabilities: text-stats
- requirements: Word count; Sentence count; Reading time
- depends_on: none
- flag: none

### Slice: add-cli
- goal: The textkit command-line tool with slugify and usage errors
- capabilities: cli
- requirements: Slugify command; Command errors
- depends_on: none
- flag: none

### Slice: add-stats-cli
- goal: The stats sub-command, dark behind a flag
- capabilities: stats-cli
- requirements: Stats command; Stats JSON output
- depends_on: add-text-stats-core, add-cli
- flag: stats-cli

### Slice: remove-stats-cli-flag
- goal: Release the stats sub-command by removing its flag
- capabilities: stats-cli
- depends_on: add-stats-cli
- removes_flag: stats-cli
