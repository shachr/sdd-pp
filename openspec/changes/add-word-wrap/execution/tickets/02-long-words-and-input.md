# 02: Break long words and check input

**What to build:** overlong words cut at the line width, and bad arguments rejected. [delta](../../specs/text-wrap/spec.md) - "Requirement: Long words broken", "Requirement: Input checked". Path: the wrap module's word loop and its argument guard, plus tests.

**Blocked by:** 01: Wrap text at word boundaries

**Status:** ready-for-agent

Estimate: ~50 lines

- [ ] Scenario "Word longer than the width" passes
- [ ] Scenario "Text is not a string" passes
- [ ] Scenario "Width is not a positive integer" passes
