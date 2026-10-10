> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/text-truncation/spec.md) · [design](../design.md)

# 01: truncate - shortening path

**What to build:** [delta](../../specs/text-truncation/spec.md) - "Requirement: Text within the limit is unchanged", "Requirement: Long text is shortened with an ellipsis" and "Requirement: Cuts at a word boundary when possible", as one new module with its node:test file (see [design](../design.md) for the module boundary).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Scenario "Shorter than the limit" passes
- [ ] Scenario "Exactly the limit" passes
- [ ] Scenario "Result fits the limit" passes
- [ ] Scenario "Limit of one" passes
- [ ] Scenario "Word boundary available" passes
- [ ] Scenario "Single long word" passes
