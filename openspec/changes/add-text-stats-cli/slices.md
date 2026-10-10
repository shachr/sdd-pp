---
parent: add-text-stats-cli
approved_by: Grok Bot on behalf of shachar bardavid (decisions delegated; slices accepted as proposed)
split_at: 2026-10-10
---

# Slices: add-text-stats-cli

Parent of a split change (schema split-plan). Names only - behaviour lives in the child deltas. Never edit behaviour here; record changes as amendments.
Archive this parent last: `openspec archive add-text-stats-cli --skip-specs --yes` after `split.mjs loss add-text-stats-cli --final` passes. Never run /opsx:verify on it.

## Slices

### Slice: add-text-stats-core
- goal: Count words and sentences in a text (library)
- capabilities: text-stats
- requirements: Word count; Sentence count
- depends_on: none
- flag: none
- estimate: 100
- ticket: tickets/add-text-stats-core.md

### Slice: add-cli
- goal: textkit command-line tool with the slugify command and usage errors
- capabilities: cli
- requirements: Slugify command; Command errors
- depends_on: none
- flag: none
- estimate: 190
- ticket: tickets/add-cli.md

### Slice: add-stats-cli
- goal: textkit stats command (text and JSON), behind the stats-cli flag
- capabilities: stats-cli
- requirements: Stats command; Stats JSON output
- depends_on: add-text-stats-core, add-cli
- flag: stats-cli
- estimate: 135
- ticket: none

### Slice: remove-stats-cli-flag
- goal: Release the stats command by removing the stats-cli flag
- capabilities: stats-cli
- depends_on: add-stats-cli
- flag: none
- removes_flag: stats-cli
- estimate: 25
- ticket: none

## Checklist (original requirement and scenario names)

- [ ] Requirement: Slugify command
  - [ ] Scenario: Slugify argument
  - [ ] Scenario: Slugify from stdin
- [ ] Requirement: Command errors
  - [ ] Scenario: Unknown command
  - [ ] Scenario: Missing argument
- [ ] Requirement: Stats command
  - [ ] Scenario: Stats summary
- [ ] Requirement: Stats JSON output
  - [ ] Scenario: JSON flag
- [ ] Requirement: Word count
  - [ ] Scenario: Words in a sentence
  - [ ] Scenario: Whitespace only
- [ ] Requirement: Sentence count
  - [ ] Scenario: Sentences ending in punctuation
  - [ ] Scenario: No terminal punctuation

## Amendments

- Requirement "Stats command flag" added in add-stats-cli: keeps the user-visible stats command off until remove-stats-cli-flag ships
- Scenario "Slugify from stdin" dropped: slugify takes its text as an argument only in this feature (add-cli narrowed session; deliberate loss-check test, Grok Bot's call on the user's behalf)
- Requirement "Slugify command" changed, see change add-cli: no standard-input fallback; a missing text is a usage error ("Requirement: Command errors")
- Requirement "Command errors" changed, see change add-cli: also covers a command missing its argument
