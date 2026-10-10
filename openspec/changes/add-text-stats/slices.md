---
parent: add-text-stats
approved_by: Grok Bot on behalf of shachar bardavid (decisions delegated; proposed slices accepted unchanged)
split_at: 2026-10-10
split_commit: 8e87bd9a00e3357f117884e72e2e132632b59288
---

# Slices: add-text-stats

Control plane of a split change (schema split-plan): why/scope is in proposal.md, the slices are below. No requirement or scenario names and no behaviour here - they live in the child deltas; deliberate differences are "## Split notes" in the child proposals.
Loss-check baseline: the original deltas at split_commit (`git show 8e87bd9:openspec/changes/add-text-stats/specs/...`).
Status: mark a slice "in-progress" when you take it (`split.mjs mark add-text-stats <slice> in-progress`); it is done when its archived folder is on main.
Archive this parent last: `split.mjs loss add-text-stats --final`, then `openspec archive add-text-stats --skip-specs --yes`. Never run /opsx:verify on it.

## Slices

### Slice: add-text-stats-core
- goal: Library functions that measure a text
- capabilities: text-stats
- depends_on: none
- flag: none
- ticket: tickets/add-text-stats-core.md
- status: in-progress

### Slice: add-stats-cli
- goal: A terminal command that prints a text's measurements
- capabilities: stats-cli
- depends_on: add-text-stats-core
- flag: none
- ticket: tickets/add-stats-cli.md
- status: planned
