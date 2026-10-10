> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/text-wrapping/spec.md) · [design](../design.md)

# 01: text-wrapping module - line filling

**What to build:** [delta](../../specs/text-wrapping/spec.md) - "Requirement: Lines fit the width" and "Requirement: Existing line breaks are kept", as the new module and its test file with the greedy per-Paragraph loop from [design](../design.md#decisions).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Scenario "Two lines" passes
- [ ] Scenario "Already fits" passes
- [ ] Scenario "Space runs collapse" passes
- [ ] Scenario "Blank line between paragraphs" passes
- [ ] Scenario "Empty text" passes
