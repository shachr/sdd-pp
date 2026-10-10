---
tool: ai-hero
session: grill-with-docs
---

> Source of truth: [proposal](../proposal.md) · specs: ../specs/<capability>/spec.md

# grill-with-docs session: add-truncate

Request (user, via the parent): "textkit needs a way to shorten text for previews". Run with AI Hero `grill-with-docs` (`grilling` + `domain-modeling`) before any OpenSpec artifact existed. Decisions were delegated: every answer is **Grok Bot's call on the user's behalf** (recommended answer accepted). Fact-finding was done by reading the repo (no sub-agent tool).

## Grilling record

### Round 1 (frontier: what a shortened text looks like)

- **Q1 - Is the limit counted with the ellipsis included?** -> yes, the result never exceeds the limit; delta Requirement "Truncation with ellipsis".
- **Q2 - Cut mid-word or at a word boundary?** -> boundary first, hard cut as fallback; delta Scenarios "Cut at word boundary", "Long single word".
- **Q3 - Text that already fits?** -> left alone; delta Requirement "Short text unchanged".
- **Q4 - Configurable ellipsis?** -> yes, default the single character "…"; delta Scenario "Custom ellipsis".
- **Q5 - Nonsense limits (0, negative, fractional, NaN)?** -> RangeError; delta Requirement "Limit validation".

### Round 2 (frontier unlocked by Q1, Q2)

- **Q6 - Where does it live?** `src/truncate.mjs`, single export `truncate(text, maxLength, { ellipsis = '…' } = {})`, tests in `test/truncate.test.mjs`; mirrors `slugify`. -> accepted.
- **Q7 - How is the boundary found?** Keep `maxLength - ellipsis.length` characters; if the next character is not whitespace and the kept part contains whitespace, cut back to the last whitespace; `trimEnd()`; append the ellipsis. -> accepted.
- **Q8 - Length unit?** UTF-16 code units (`String.length`), like the rest of textkit; grapheme-aware cutting is out of scope. -> accepted.
- **Q9 - Limit shorter than the ellipsis?** Rejected too (part of Q5's rule: the limit must leave room for the ellipsis). -> accepted; delta Scenario "Invalid limit rejected".
- **Q10 - Test seams?** The public function only; one test per delta scenario, named after it. -> accepted.

Frontier empty after round 2; shared understanding confirmed on the user's behalf.

## Decisions

- Module `src/truncate.mjs`, export `truncate(text, maxLength, { ellipsis = '…' } = {})`; `String(text)` coercion like `slugify`.
- Validate first: `Number.isInteger(maxLength) && maxLength >= ellipsis.length && maxLength >= 1`, else RangeError.
- Algorithm as Q7; length in UTF-16 code units (Q8).
- Tests: node:test + assert/strict, one per scenario.

## Scenarios found

Names only - each is a scenario in the delta (`../specs/truncation/spec.md`):
- Fits already; Exact length
- Cut at word boundary; Long single word; Custom ellipsis
- Invalid limit rejected

## Domain docs

- `GLOSSARY.md`: **Ellipsis** added. No ADR (nothing hard to reverse).
