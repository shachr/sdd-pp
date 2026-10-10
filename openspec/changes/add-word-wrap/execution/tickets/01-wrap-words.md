# 01: Wrap text at word boundaries

**What to build:** `wordWrap` exported from the package, wrapping each paragraph at the line width. [delta](../../specs/text-wrap/spec.md) - "Requirement: Wrap at word boundaries", "Requirement: Paragraphs kept". Path: new wrap module, re-export from the entry point, new test file.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

Estimate: ~90 lines

- [ ] Scenario "Short text unchanged" passes
- [ ] Scenario "Wraps at the width" passes
- [ ] Scenario "Default width" passes
- [ ] Scenario "Spaces collapsed" passes
- [ ] Scenario "Paragraphs wrapped separately" passes
- [ ] Scenario "Empty text" passes
