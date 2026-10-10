---
tool: ai-hero
session: grill-with-docs
---

# grill-with-docs session: add-text-stats-core

> Source of truth: [proposal](../proposal.md) · [specs/text-stats/spec.md](../specs/text-stats/spec.md) · parent session (read first): [../add-text-stats/execution/grill.md](../../add-text-stats/execution/grill.md)

Narrowed session for slice `add-text-stats-core` of the split change [add-text-stats](../../add-text-stats/slices.md), run with AI Hero `grill-with-docs` limited to this slice. The parent settled the word and sentence rules and the module layout (parent Q1, Q2, Q7: pure functions in `src/stats.mjs`); not re-decided here. Where the parent session and this slice's delta differ, the delta and this slice's proposal split notes win. Decisions were delegated: every answer is **Grok Bot's call on the user's behalf**.

## Grilling record

- **Q1 - The reading-time requirement's name?** -> "Reading time estimate" (renamed; same behaviour). Recorded as `renamed_from` in this slice's proposal split notes.
- **Q2 - Keep a separate scenario for a text with no words?** -> no; it follows from the formula. Recorded as `dropped` in the split notes; no test is named after it.
- **Q3 - What does this slice leave for add-stats-cli?** -> one `textStats(text)` helper returning `{ words, sentences, readingMinutes }` next to the three functions, so the command only formats.
- **Q4 - Non-string input?** -> `String(text)` coercion, like `slugify` (parent decision).

## Scenarios found

Names only - each is a scenario in the delta:
- Words in a sentence; Whitespace only
- Sentences ending in punctuation; No terminal punctuation
- Short text reads in one minute

## Domain docs

- No new glossary terms.
