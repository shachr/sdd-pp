# 01: Wrap text at word boundaries

**What to build:** `wordWrap` exported from the package, wrapping each paragraph at the line width. [delta](../../specs/text-wrap/spec.md) - "Requirement: Wrap at word boundaries", "Requirement: Paragraphs kept". Path: new wrap module, re-export from the entry point, new test file.

**Blocked by:** None (can start immediately)

**Status:** done

Estimate: ~90 lines

- [x] Scenario "Short text unchanged" passes
- [x] Scenario "Wraps at the width" passes
- [x] Scenario "Default width" passes
- [x] Scenario "Spaces collapsed" passes
- [x] Scenario "Paragraphs wrapped separately" passes
- [x] Scenario "Empty text" passes
