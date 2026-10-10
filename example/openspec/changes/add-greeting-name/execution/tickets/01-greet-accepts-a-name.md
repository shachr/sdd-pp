> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/greeting/spec.md) · [design](../design.md)

# 01: greet() - name parameter

**What to build:** [delta](../../specs/greeting/spec.md) - "Requirement: Greeting by name" and "Requirement: Blank name falls back to default", implemented in `greet()` and proven at the `greet()` seam (see [design](../design.md)).

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Scenario "Name given" passes (greet unit test)
- [x] Scenario "Name with surrounding spaces" passes (greet unit test)
- [x] Scenario "Whitespace-only name" passes (greet unit test)
- [x] Existing "Default greeting" test still passes
