> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/text-excerpt/spec.md) · [spec](../spec.md) · [grill session](../grill.md)

# 01: Word-safe excerpt with the default ellipsis

**What to build:** an app can shorten any text into a one-line **Excerpt** through the package entry point - [delta](../../specs/text-excerpt/spec.md) "Requirement: Excerpt within a length limit", [delta](../../specs/text-excerpt/spec.md) "Requirement: Whitespace normalisation", [delta](../../specs/text-excerpt/spec.md) "Requirement: Length counted in characters", and the default case of [delta](../../specs/text-excerpt/spec.md) "Requirement: Ellipsis option". Path: new helper module -> entry-point export -> tests through the entry point.

**Blocked by:** None (can start immediately)

**Status:** done

Estimate: ~90 lines

- [x] Scenario "Text that fits" passes
- [x] Scenario "Cut at a word boundary" passes
- [x] Scenario "First word too long" passes
- [x] Scenario "Trailing punctuation dropped" passes
- [x] Scenario "Default ellipsis" passes
- [x] Scenario "Whitespace collapsed" passes
- [x] Scenario "Emoji count as one character" passes
