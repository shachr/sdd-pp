# Remove stats-cli flag Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Release `textkit stats` as the [delta](../specs/stats-cli/spec.md) says (REMOVED "Requirement: Stats command flag").

**Architecture:** Delete the gate in `src/cli.mjs` ([brainstorm](brainstorm.md) "Decided how").

**Tech Stack:** Node >= 18 ES modules, node:test.

**Spec:** [proposal](../proposal.md) · [specs/stats-cli/spec.md](../specs/stats-cli/spec.md) · [brainstorm](brainstorm.md) · [handoff](../handoff.md)

## Global Constraints

- [delta](../specs/stats-cli/spec.md) - "Requirement: Stats command flag" (REMOVED)
- The remaining stats behaviour stays as main `openspec/specs/stats-cli/spec.md` describes.

## File Structure

- Modify `src/cli.mjs`, `test/cli-stats.test.mjs`.

## Review Focus

1. No `TEXTKIT_STATS` left anywhere (`rg TEXTKIT_STATS src test` is empty).
2. Usage lists `slugify, stats`.

---

### Task 1: remove the gate

**Covers:** [delta](../specs/stats-cli/spec.md) - "Requirement: Stats command flag" (REMOVED)
**Estimate:** ~25 lines

**Files:**
- Modify: `src/cli.mjs`, `test/cli-stats.test.mjs`

- [ ] **Step 1: Change the tests first** - drop the "Flag off" / "Flag on" tests and `env: ON`; add a test that the usage lists `stats`. Run `npm test`: expected FAIL (stats is still hidden without the variable).
- [ ] **Step 2: Delete `STATS_FLAG`, `visible`, `commandNames`** and use `Object.keys(COMMANDS)` in the usage and the lookup.
- [ ] **Step 3: Run `npm test`** - expected PASS; `rg TEXTKIT_STATS src test` empty.
- [ ] **Step 4: Commit** - `git commit -m "feat(stats-cli): release stats - remove the flag (plan task 1)"`

## Execution Handoff

Choice: executing-plans (inline; no sub-agent tool) = `apply_mode` in handoff.md.
