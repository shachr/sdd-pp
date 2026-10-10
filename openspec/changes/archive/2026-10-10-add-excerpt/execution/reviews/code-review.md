self-review (same session as the implementation - no sub-agent or second session is available in this run, so the Standards and Spec axes were run here one after the other, not in parallel fresh sub-agents)

> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/text-excerpt/spec.md) · [spec](../spec.md) · [tickets](../tickets/)

# Code review (AI Hero `code-review`) - add-excerpt

- Fixed point: handoff `base_ref` 3e0e686; diff `git diff 3e0e686...HEAD -- . ':!openspec'` (3 files, +76 lines: helper, entry-point export, tests).
- Commits: ticket 01 and ticket 02 implementation commits (plus planning commits under openspec/).
- Spec source: the change folder (proposal + delta = requirements; spec.md, tickets, grill.md = implementation context).
- Standards sources: `AGENTS.md` (Node >= 18, ES modules, no runtime dependencies, node:test). No CODING_STANDARDS.md / CONTRIBUTING.md. Plus the skill's smell baseline.

## Standards

- No documented-standard violations: ES module, no dependency added, tests use `node:test` + `assert/strict` like the existing slug tests, error messages prefixed with the helper name like `slugify`.
- Baseline smells (judgement calls): none found. Names (`line`, `chars`, `budget`, `cut`) match the grill.md algorithm; no speculative options (only `ellipsis`, which the delta asks for).

## Spec

- (a) Missing / partial: none. Every scenario has a test named after it (11 tests); the full suite passes (15/15).
- (b) Scope creep: none.
- (c) Looks implemented but questionable (probed by hand, not covered by the delta):
  - Minor: a non-string `ellipsis` is not validated - `excerpt('one two three', 5, { ellipsis: 5 })` returns `"one5"` (length counted as 0). The delta only says "the caller's ellipsis"; suggest a follow-up requirement (type error) rather than widening this change.
  - Minor: when everything before the cut is punctuation, the result is the bare ellipsis (`excerpt('..... word', 4)` -> `"…"`). Consistent with "Requirement: Excerpt within a length limit" (empty prefix); noted only.
  - Note: `Text is not a string` passed before its guard was written (the whitespace step threw a native TypeError); the explicit guard now gives the documented message.

Summary: Standards 0 findings; Spec 0 Critical / 0 Important / 2 Minor (worst: unvalidated non-string ellipsis). Nothing to fix before merge.
