---
approved_by: Grok Bot on behalf of shachar bardavid (decisions delegated; slices accepted as proposed)
---

# Split proposal: add-text-stats-cli

Proposed by Grok Bot after /split-check (~400 lines > ~300). Library and CLI shell are independent (different capabilities, no dependency) so they can run in parallel; the stats command needs both and is the user-visible part that ships dark behind a flag, so a cleanup slice removes the flag.

## Slices

### Slice: add-text-stats-core
- goal: Count words and sentences in a text (library)
- capabilities: text-stats
- requirements: Word count; Sentence count
- depends_on: none
- flag: none
- estimate: 100

### Slice: add-cli
- goal: textkit command-line tool with the slugify command and usage errors
- capabilities: cli
- requirements: Slugify command; Command errors
- depends_on: none
- flag: none
- estimate: 190

### Slice: add-stats-cli
- goal: textkit stats command (text and JSON), behind the stats-cli flag
- capabilities: stats-cli
- requirements: Stats command; Stats JSON output
- depends_on: add-text-stats-core, add-cli
- flag: stats-cli
- estimate: 135

### Slice: remove-stats-cli-flag
- goal: Release the stats command by removing the stats-cli flag
- capabilities: stats-cli
- depends_on: add-stats-cli
- removes_flag: stats-cli
- estimate: 25

## Amendments

- Requirement "Stats command flag" added in add-stats-cli: keeps the user-visible stats command off until remove-stats-cli-flag ships
