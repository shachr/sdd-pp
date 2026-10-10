---
tool: ai-hero
session: grill-with-docs
---

> Source of truth: [proposal](../proposal.md) · [specs/text-excerpt/spec.md](../specs/text-excerpt/spec.md)

Request (user): "Add an excerpt helper to textkit that shortens text for previews (cards, search results) without cutting words in half."

All answers below were given **by the agent on the user's behalf** (the user delegated the design decisions for this run); each is the recommended answer unless marked otherwise.

## Grilling record

### Round 1

- **Q1 - Unit of the length limit.** Code points vs UTF-16 units vs bytes; ellipsis inside or outside the limit? -> *agent for user:* code points, ellipsis inside -> delta Requirement "Length counted in characters" (Scenario "Emoji count as one character").
- **Q2 - Ellipsis.** Default to the single character "…" (U+2026), overridable per call, empty string allowed? -> *agent for user:* yes -> delta Requirement "Ellipsis option" (Scenarios "Default ellipsis", "Custom ellipsis", "No ellipsis").
- **Q3 - Where to cut.** Cut at the last word boundary that fits; if the first word alone does not fit, cut inside it rather than return only the ellipsis? -> *agent for user:* yes -> delta Scenarios "Cut at a word boundary", "First word too long".
- **Q4 - Short text.** Text that already fits comes back unchanged, with no ellipsis? -> *agent for user:* yes, but after whitespace normalisation (Q5) -> delta Scenario "Text that fits".
- **Q5 - Whitespace.** Keep line breaks, or make previews single-line? -> *agent for user:* single-line -> delta Requirement "Whitespace normalisation" (Scenario "Whitespace collapsed").
- **Q6 - Bad input.** Throw, or coerce/clamp silently? -> *agent for user:* throw (type error for the text, range error for the limit) -> delta Requirement "Input validation" (Scenarios "Text is not a string", "Invalid maximum length").

### Round 2 (unblocked by Q3/Q5)

- **Q7 - Dangling punctuation.** After a word-boundary cut, drop trailing spaces and the punctuation `, ; : - .` before appending the ellipsis ("Hello, world" at 7 -> "Hello…", not "Hello,…")? -> *agent for user:* yes -> delta Scenario "Trailing punctuation dropped".
- **Q8 - Where it lives.** A new module next to `slugify`, exported from `src/index.mjs`, no dependencies? -> *agent for user:* yes (decision below).
- **Q9 - Glossary / ADR.** Add "Excerpt" to a new `GLOSSARY.md`; no ADR (easy to reverse, no real trade-off)? -> *agent for user:* yes.

Frontier empty after round 2; shared understanding confirmed (agent for user).

## Decisions

- Module `src/excerpt.mjs` exporting `excerpt(text, maxLength, { ellipsis = '…' } = {})`; re-exported from `src/index.mjs`. No dependencies.
- Algorithm: validate -> normalise whitespace (`/\s+/g` -> ' ', trim) -> split into code points with `Array.from` -> if length <= maxLength return as is -> budget = maxLength - length(ellipsis) -> take the first `budget` code points; if the next code point is not a space, back off to the last space inside the slice (unless there is none: hard cut) -> strip trailing `[\s,;:.\-]+` -> append ellipsis.
- Errors: `TypeError('excerpt: text must be a string')`, `RangeError('excerpt: maxLength ...')`.
- Test seam: pure function; tests in `test/excerpt.test.mjs` with `node:test`, one test per delta scenario, named after it.

## Scenarios found

Text that fits · Cut at a word boundary · First word too long · Trailing punctuation dropped · Default ellipsis · Custom ellipsis · No ellipsis · Whitespace collapsed · Emoji count as one character · Text is not a string · Invalid maximum length

## Domain docs

- [GLOSSARY.md](../../../../GLOSSARY.md) - "Excerpt" (new). No ADR.
