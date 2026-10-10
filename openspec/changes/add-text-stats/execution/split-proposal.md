---
approved_by: Grok Bot on behalf of shachar bardavid (decisions delegated; proposed slices accepted unchanged)
---

> Source of truth: [proposal](../proposal.md) · specs: ../specs/

# Split proposal: add-text-stats

## Slices

### Slice: add-text-stats-core
- goal: Library functions that measure a text
- capabilities: text-stats
- requirements: Word count; Sentence count; Reading time
- depends_on: none
- flag: none

### Slice: add-stats-cli
- goal: A terminal command that prints a text's measurements
- capabilities: stats-cli
- requirements: Stats command; Stats JSON output; Stats errors
- depends_on: add-text-stats-core
- flag: none
