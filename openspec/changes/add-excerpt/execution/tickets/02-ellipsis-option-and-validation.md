> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/text-excerpt/spec.md) · [spec](../spec.md) · [grill session](../grill.md)

# 02: Caller-chosen ellipsis and input validation

**What to build:** an app can pass its own ellipsis (or none), and wrong arguments are rejected - [delta](../../specs/text-excerpt/spec.md) "Requirement: Ellipsis option" (custom and empty), [delta](../../specs/text-excerpt/spec.md) "Requirement: Input validation". Path: options handling and argument checks in the helper -> tests through the entry point.

**Blocked by:** 01 (Word-safe excerpt with the default ellipsis)

**Status:** ready-for-agent

Estimate: ~50 lines

- [ ] Scenario "Custom ellipsis" passes
- [ ] Scenario "No ellipsis" passes
- [ ] Scenario "Text is not a string" passes
- [ ] Scenario "Invalid maximum length" passes
