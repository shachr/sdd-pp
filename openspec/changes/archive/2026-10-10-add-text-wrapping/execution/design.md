> Source of truth: [proposal](../proposal.md) · [specs/text-wrapping/spec.md](../specs/text-wrapping/spec.md) · [handoff](../handoff.md)

# Design: add-text-wrapping (AI Hero `grill-with-docs` output)

The user delegated every decision for this run; each answer below was given by the implementer on the user's behalf (recommended answer accepted unless marked otherwise). Vocabulary follows [GLOSSARY.md](../../../../GLOSSARY.md) (written by `domain-modeling` during this session).

## Grilling record

### Round 1

- **Q1 Module boundary** - New module `src/text-wrapping.mjs` exporting `wrapText`, named after the capability (like a future `text-statistics` module), rather than a generic `src/wrap.mjs`? -> Yes (on the user's behalf).
- **Q2 Algorithm** - Greedy first-fit per Paragraph, rather than minimum-raggedness (Knuth-Plass)? The delta asks for greedy filling; Knuth-Plass would also change which Words share a Line. -> Yes, greedy.
- **Q3 Test seam** - Test only through the public `wrapText` export with `node:test`, one test per scenario named after it, like the existing slugify tests? -> Yes.
- **Q4 Vocabulary** - Call the second argument the Width (not "column" or "limit") everywhere, including the parameter name and error message? -> Yes; added Width, Word, Paragraph and Line to GLOSSARY.md.

### Round 2 (unlocked by Q2)

- **Q5 Remainder of a split Word** - after cutting an overlong Word, may the following Words join the Line that holds the remainder? The delta did not say. This changes output, so it is a behaviour question, not design. -> Yes, they may join (on the user's behalf). **Recorded in the delta**, not here: the overlong-words requirement now says so and has the new scenario "Remainder shares its line"; `openspec validate add-text-wrapping --strict` re-run and passing.
- **Q6 Where the Width check happens** - validate the Width once at the top of `wrapText`, before any splitting, so an empty text with a bad Width still throws? -> Yes.

### Round 3

Frontier empty. Shared understanding confirmed on the user's behalf. No ADR: none of the decisions is hard to reverse (domain-modeling's three ADR conditions are not all met).

## Decisions

- **Shape**: `src/text-wrapping.mjs` exports `wrapText(text, width)`; `test/text-wrapping.test.mjs` holds the tests.
- **Algorithm**: split the text on `"\n"` into Paragraphs; per Paragraph, split on `/ +/` dropping empty strings, then fill a current Line greedily. A Word wider than the Width flushes the current Line and is cut into Width-sized pieces with `slice`; the last piece becomes the current Line. An empty Paragraph yields `""`.
- **Validation**: `Number.isInteger(width) && width >= 1` checked first; failure throws `RangeError` naming the received Width.
- **No options object** and no dependencies.

## Ticket breakdown review (to-tickets step 4)

Breakdown approved on the user's behalf: three tickets, linear (02 and 03 blocked by 01). Granularity checked against the vertical-slice rules: each ticket is demoable through the public export.
