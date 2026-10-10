> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/text-wrapping/spec.md) · [design](../design.md)

# 02: text-wrapping module - overlong Words

**What to build:** [delta](../../specs/text-wrapping/spec.md) - "Requirement: Overlong words are split", added to the line-filling loop from ticket 01 (piece cutting per [design](../design.md#decisions)).

**Blocked by:** 01

**Status:** done

- [x] Scenario "Word wider than the column" passes
- [x] Scenario "Overlong word after a short one" passes
- [x] Scenario "Remainder shares its line" passes
