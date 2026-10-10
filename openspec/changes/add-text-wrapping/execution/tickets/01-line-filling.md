> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/text-wrapping/spec.md) · [spec](../spec.md) · [design](../design.md)

# 01: text-wrapping module - line filling

**What to build:** [delta](../../specs/text-wrapping/spec.md) - "Requirement: Lines fit the width" and "Requirement: Existing line breaks are kept", as the new module and its test file with the greedy per-Paragraph loop from [design](../design.md#decisions).

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Scenario "Two lines" passes
- [x] Scenario "Already fits" passes
- [x] Scenario "Space runs collapse" passes
- [x] Scenario "Blank line between paragraphs" passes
- [x] Scenario "Empty text" passes
