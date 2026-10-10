> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/text-wrapping/spec.md) · [design](../design.md)

# 03: text-wrapping module - Width validation

**What to build:** [delta](../../specs/text-wrapping/spec.md) - "Requirement: Invalid widths are rejected", as the guard at the top of `wrapText` (see [design](../design.md#decisions), Q6).

**Blocked by:** 01

**Status:** done

- [x] Scenario "Zero width" passes
- [x] Scenario "Fractional width" passes
