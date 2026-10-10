# 02: Break long words and check input

**What to build:** overlong words cut at the line width with a hyphen on each cut piece, and bad arguments rejected. [delta](../../specs/text-wrap/spec.md) - "Requirement: Long words broken", "Requirement: Input checked". Path: the wrap module's word loop and its argument guard, plus tests.

**Blocked by:** 01: Wrap text at word boundaries

**Status:** done

Estimate: ~60 lines

- [x] Scenario "Word longer than the width" passes
- [x] Scenario "Text is not a string" passes
- [x] Scenario "Width is not a positive integer" passes
