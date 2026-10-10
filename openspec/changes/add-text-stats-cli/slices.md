---
parent: add-text-stats-cli
approved_by: Grok Bot on behalf of shachar bardavid (decisions delegated; proposed slices accepted unchanged)
split_at: 2026-10-10
split_commit: 5d25153780bfcf23f81f92c6ea8f4af879f6c500
---

# Slices: add-text-stats-cli

Control plane of a split change (schema split-plan): why/scope is in proposal.md, the slices are below. No requirement or scenario names and no behaviour here - they live in the child deltas; deliberate differences are "## Split notes" in the child proposals.
Loss-check baseline: the original deltas at split_commit (`git show 5d25153:openspec/changes/add-text-stats-cli/specs/...`).
Status: mark a slice "in-progress" when you take it (`split.mjs mark add-text-stats-cli <slice> in-progress`); it is done when its archived folder is on main.
Archive this parent last: `split.mjs loss add-text-stats-cli --final`, then `openspec archive add-text-stats-cli --skip-specs --yes`. Never run /opsx:verify on it.

## Slices

### Slice: add-text-stats-core
- goal: Library functions that measure a text
- capabilities: text-stats
- depends_on: none
- flag: none
- ticket: tickets/add-text-stats-core.md
- status: planned

### Slice: add-cli
- goal: The textkit command-line tool with slugify and usage errors
- capabilities: cli
- depends_on: none
- flag: none
- ticket: tickets/add-cli.md
- status: planned

### Slice: add-stats-cli
- goal: The stats sub-command, dark behind a flag
- capabilities: stats-cli
- depends_on: add-text-stats-core, add-cli
- flag: stats-cli
- ticket: none
- status: planned

### Slice: remove-stats-cli-flag
- goal: Release the stats sub-command by removing its flag
- capabilities: stats-cli
- depends_on: add-stats-cli
- flag: none
- removes_flag: stats-cli
- ticket: none
- status: planned
