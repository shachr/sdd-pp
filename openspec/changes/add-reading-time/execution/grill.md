---
tool: ai-hero
session: grill-with-docs
---

> Source of truth: [proposal](../proposal.md) · specs: ../specs/<capability>/spec.md

# grill-with-docs session: add-reading-time

Request (user, via the parent): "add a reading-time estimate to textkit". Run with AI Hero `grill-with-docs` (= `grilling` + `domain-modeling`) before any OpenSpec artifact existed. Decisions were delegated: every answer below is **Grok Bot's call on the user's behalf** (the recommended answer, accepted). The sub-agent fact-finding the skill describes was done by reading the repo directly (no sub-agent tool).

## Grilling record

### Round 1 (frontier: shape of the estimate)

- **Q1 - What counts as a word?** Whitespace-separated runs, but only runs containing at least one letter or digit; a bare dash or ellipsis is not a word. -> accepted (behaviour: goes to the delta).
- **Q2 - How is the estimate rounded?** Whole minutes, rounded up, so any non-empty text reads in at least one minute. -> accepted (behaviour: delta).
- **Q3 - What does text with no words give?** Zero minutes, not one. -> accepted (behaviour: delta).
- **Q4 - Is reading speed configurable, and what is the default?** Yes, words per minute, default 200 (the common figure for adult silent reading of prose). -> accepted (behaviour: delta).
- **Q5 - What happens with a nonsensical speed (0, negative, NaN, Infinity)?** Reject it with a RangeError rather than return 0 or Infinity. -> accepted (behaviour: delta).

### Round 2 (frontier unlocked by Q1, Q4)

- **Q6 - Where does it live?** New module `src/reading-time.mjs` exporting `readingTime(text, { wordsPerMinute } = {})`, returning a number; tests in `test/reading-time.test.mjs`. Mirrors `src/slugify.mjs` (one pure function per module, no dependencies). -> accepted.
- **Q7 - How are words counted?** `String(text).split(/\s+/)` then keep tokens matching `/[\p{L}\p{N}]/u`. Unicode-aware so accented and non-Latin words count. -> accepted.
- **Q8 - Non-string input?** Coerce with `String(text)`, consistent with `slugify` (code check: `slugify` does `String(text)`). Not a requirement - left unspecified in the delta. -> accepted.
- **Q9 - Is word counting exported separately?** No: one public function; the counter stays module-private until another capability needs it. -> accepted.
- **Q10 - Test seams?** Unit tests on `readingTime` only, one per delta scenario, named after the scenario. -> accepted.

Frontier empty after round 2; shared understanding confirmed (on the user's behalf).

## Decisions

- Module `src/reading-time.mjs`, single export `readingTime(text, { wordsPerMinute = 200 } = {})`.
- Validate `wordsPerMinute` first (`Number.isFinite(wpm) && wpm > 0`, else `RangeError`), then count words, then `Math.ceil(words / wpm)`; zero words short-circuits to `0`.
- Word count: split on `/\s+/`, filter by `/[\p{L}\p{N}]/u`; module-private helper.
- `String(text)` coercion (same as `slugify`).
- Tests: `node:test` + `assert/strict`, one test per scenario named after it.

## Scenarios found

Names only - each is a requirement or scenario in the delta (`../specs/reading-time/spec.md`):
- Default reading speed; Partial minute rounds up; Custom reading speed; Empty text
- Punctuation-only tokens ignored; Mixed whitespace
- Invalid speed rejected

## Domain docs

- `GLOSSARY.md`: added **Reading time** and **Word** (domain-modeling, created lazily).
- ADRs: none - nothing here is hard to reverse.
