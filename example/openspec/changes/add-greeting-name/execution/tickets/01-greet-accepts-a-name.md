# 01: greet() accepts a name

> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/greeting/spec.md) · [execution spec](../spec.md)

**What to build:** `greet()` greets a given name and falls back to the default greeting for missing or blank names, covered by unit tests at the `greet()` seam.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Scenarios "Name given" and "Name with surrounding spaces" pass as `greet()` unit tests
- [x] Scenario "Whitespace-only name" passes as a `greet()` unit test
- [x] Existing "Default greeting" test still passes
