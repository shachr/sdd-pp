---
tool: ai-hero
session: grill-with-docs
---

> Source of truth: [proposal](../proposal.md) · specs: ../specs/<capability>/spec.md

# grill-with-docs session: add-reading-time

Request (user, via the parent): "add a reading-time estimate to textkit". Run with AI Hero `grill-with-docs` (= `grilling` + `domain-modeling`) before any OpenSpec artifact existed. Decisions were delegated: every answer below is **Grok Bot's call on the user's behalf** (the recommended answer, accepted). The sub-agent fact-finding the skill describes was done by reading the repo directly (no sub-agent tool).

## Grilling record

### Round 1 (frontier: shape of the estimate)

- **Q1 - What counts as a word?** -> recommended answer accepted; behaviour, so it lives in the delta as Requirement "Word counting" ([delta](../specs/reading-time/spec.md)).
- **Q2 - How is the estimate rounded?** -> accepted; delta Scenario "Partial minute rounds up".
- **Q3 - What does text with no words give?** -> accepted; delta Scenario "Empty text".
- **Q4 - Is reading speed configurable, and what is the default?** -> accepted; delta Scenarios "Default reading speed" and "Custom reading speed". Why that default: the common figure for adult silent reading of prose.
- **Q5 - What happens with a nonsensical speed?** -> accepted (reject rather than return a meaningless number); delta Requirement "Reading speed validation".

### Round 2 (frontier unlocked by Q1, Q4)

- **Q6 - Where does it live?** New module `src/reading-time.mjs` exporting `readingTime(text, { wordsPerMinute } = {})`, returning a number; tests in `test/reading-time.test.mjs`. Mirrors `src/slugify.mjs` (one pure function per module, no dependencies). -> accepted.
- **Q7 - How are words counted?** `String(text).split(/\s+/)` then keep tokens matching `/[\p{L}\p{N}]/u`. Unicode-aware so accented and non-Latin words count. -> accepted.
- **Q8 - Non-string input?** Coerce with `String(text)`, consistent with `slugify` (code check: `slugify` does `String(text)`). Not a requirement - left unspecified in the delta. -> accepted.
- **Q9 - Is word counting exported separately?** No: one public function; the counter stays module-private until another capability needs it. -> accepted.
- **Q10 - Test seams?** Unit tests on `readingTime` only, one per delta scenario, named after the scenario. -> accepted.

Behavioural answers (round 1) were moved into the delta when it was written and are cited here by name.

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

## to-tickets quiz (handoff)

Breakdown approved on the user's behalf by Grok Bot: 01 estimate + word counting (no blockers), 02 speed guard (blocked by 01). Granularity: two tracer bullets through one module is the smallest split that keeps each ticket green alone.
