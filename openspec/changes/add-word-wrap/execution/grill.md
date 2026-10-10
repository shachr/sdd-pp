---
tool: ai-hero
session: grill-with-docs
---

# Design session: add-word-wrap (grill-with-docs)

Request (user): "Add a `wordWrap(text, width)` helper that wraps text to lines of at most `width` characters at word boundaries."

The user delegated the decisions for this run: every answer below is the agent's recommended answer, accepted on the user's behalf (marked **[agent]**). Facts were looked up in-session (no sub-agent mechanism in this harness).

## Grilling record

### Round 1

- **Q1 Output shape** - one string joined with `\n`, or an array of lines? **[agent]** One string with `\n` between lines (matches `slugify`: string in, string out).
- **Q2 Width** - what does `width` count? **[agent]** Characters per line (UTF-16 code units, as `String.length`), the `\n` not included. -> delta Requirement "Wrap at word boundaries"
- **Q3 Default width** - what if `width` is omitted? **[agent]** -> delta Scenario "Default width"
- **Q4 Words longer than the width** - overflow or break? **[agent]** Break them. -> delta Scenario "Word longer than the width"
- **Q5 Existing line breaks** - **[agent]** Kept. -> delta Scenario "Paragraphs wrapped separately"
- **Q6 Invalid input** - **[agent]** Same error style as `slugify`. -> delta Scenarios "Text is not a string", "Width is not a positive integer"

### Round 2 (depends on Q4, Q5)

- **Q7 Spaces inside a line** - **[agent]** Collapse. -> delta Scenario "Spaces collapsed"
- **Q8 Empty text** - **[agent]** -> delta Scenario "Empty text"
- **Q9 Module boundary** - **[agent]** New module `src/wrap.mjs` exporting `wordWrap`, re-exported from `src/index.mjs`; no dependencies.

Frontier empty after round 2; shared understanding confirmed by the agent on the user's behalf.

## Decisions

- `wordWrap(text, width = 80)` in `src/wrap.mjs`, re-exported from `src/index.mjs`; returns a string.
- Algorithm: split on `\n`; per line, split words on `/[ \t]+/` (dropping empties), greedy fill: append a word if `current.length + 1 + word.length <= width`, else start a new line; a word longer than `width` is cut into `width`-sized chunks (the last chunk continues the greedy fill). Join lines with `\n`.
- Validation first: `typeof text !== 'string'` -> `TypeError('wordWrap: text must be a string')`; `!Number.isInteger(width) || width < 1` -> `RangeError('wordWrap: width must be a positive integer')`.
- Tests: `test/wrap.test.mjs`, node:test, one test per delta scenario, named after the scenario.

## Scenarios found

- Short text unchanged
- Wraps at the width
- Default width
- Spaces collapsed
- Word longer than the width
- Paragraphs wrapped separately
- Empty text
- Text is not a string
- Width is not a positive integer

## Domain docs

- [GLOSSARY.md](../../../../GLOSSARY.md): Line width, Word, Paragraph. No ADR (nothing hard to reverse).
