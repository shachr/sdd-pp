> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/reading-time/spec.md) · [spec](../spec.md) · [grill session](../grill.md)

# 01: reading-time module - estimate from counted words

**What to build:** makes [delta](../../specs/reading-time/spec.md) - "Requirement: Reading time estimate" and "Requirement: Word counting" work end to end: the new public function, its private word counter and the rounding, with tests at the public seam (spec User Stories 1-5).

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Scenario "Default reading speed" passes
- [ ] Scenario "Partial minute rounds up" passes
- [ ] Scenario "Custom reading speed" passes
- [ ] Scenario "Empty text" passes
- [ ] Scenario "Punctuation-only tokens ignored" passes
- [ ] Scenario "Mixed whitespace" passes
