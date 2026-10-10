---
tool: superpowers
session: brainstorming
---

> Source of truth: [proposal](../proposal.md) · specs: ../specs/<capability>/spec.md

# brainstorming session: add-text-stats-core

> Parent session (shared, read first): [../add-text-stats-cli/execution/grill.md](../../add-text-stats-cli/execution/grill.md) · delta: [specs/text-stats/spec.md](../specs/text-stats/spec.md)

Narrowed session for slice `add-text-stats-core` of the split change [add-text-stats-cli](../../add-text-stats-cli/slices.md). Run with Superpowers `brainstorming`, limited to this slice; the parent settled the module layout (Q9: `src/stats.mjs`, pure functions, `String(text)` coercion) and the reading speed (Q3). Not re-decided here. Decisions were delegated: every answer is **Grok Bot's call on the user's behalf**.

## Conversation record

- First message: delegated - "the library half of the stats feature: pure functions the later stats slice will call".
- Q: What does this slice leave for later slices? -> exported `wordCount(text)`, `sentenceCount(text)` and `readingMinutes(text)` from `src/stats.mjs`; add-stats-cli imports them. (Grok Bot's call)
- Q: Unicode? -> letters/digits are `\p{L}` / `\p{N}`, so "café" and "日本" are words. (Grok Bot's call)
- Q: The split dropped one reading-time scenario (split note in this slice's proposal) - does the behaviour change? -> no: the requirement text still gives 0 minutes for 0 words; a review-focus test pins it. (Grok Bot's call)
- Approaches: (A) regex split + filter, (B) character scanner. Chosen A (smaller, matches slugify's style). (Grok Bot's call)

## Written design

### Intent and why
Callers need consistent length facts; the CLI stats slice needs a library to call. Behaviour: the [delta](../specs/text-stats/spec.md).

### Goals
- `wordCount` covering "Requirement: Word count"; `sentenceCount` covering "Requirement: Sentence count"; `readingMinutes` covering "Requirement: Reading time".

### Non-goals
- No abbreviation handling ("e.g."), no CLI (other slices), no configurable reading speed.

### Constraints
- Node >= 18, ES modules, no dependencies; `String(text)` coercion.

### Decided how
- `wordCount`: split on `/\s+/`, count parts matching `/[\p{L}\p{N}]/u`.
- `sentenceCount`: split on `/[.!?]+/` (a run of marks is one boundary), count parts that contain a word; the part after the last mark is the trailing text, so it counts when it has a word.
- `readingMinutes`: `Math.ceil(wordCount(text) / 200)`, the speed as a named constant `WORDS_PER_MINUTE`.
- Module `src/stats.mjs`, tests `test/stats.test.mjs`, one test per delta scenario.

### Left to the builder
- Helper names and test layout.

## Scenarios found

Names only - each is a scenario in the delta:
- Words in a sentence; Whitespace only
- Sentences ending in punctuation; No terminal punctuation
- Short text reads in one minute

## Builder check result

Fresh context: local Ollama `qwen3:4b-instruct` with `builder-check-prompt.md` filled in (this document + the slice delta), run 12:05-12:08 PT, 194 s, cut at OLLAMA_NUM_PREDICT 1200 (a weak model - no sub-agent in this harness). Output not kept in the change folder (it restates delta values); question headlines verbatim: "What is the exact definition of \"trailing text\" in sentence counting, and how is it determined when it contains a word?", "Is the reading time calculation based on word count from the same function (`wordCount`) or a separate, independent word count?", "How are Unicode letters and digits handled ...?", "Are there any edge cases in the delta scenarios that are not covered by the current design (e.g., mixed punctuation, nested punctuation, or empty strings)?", "Is the `WORDS_PER_MINUTE` constant defined as 200 in all cases, or is it configurable ...?".

Piles:
- Answered already: (1) trailing text - "Decided how" (part after the last mark, counted when it has a word); (2) reading time uses `wordCount` - "Decided how"; (3) Unicode - conversation record (`\p{L}`/`\p{N}`; emoji are not letters, so an emoji-only run is not a word); (5) fixed 200 - parent Q3 and Non-goals (no configurable speed).
- Minor: (4) a run of marks ("Hello... how are you?") - "Decided how" already says a run is one boundary; a review-focus test pins "?!" -> 0. No question round needed.

## Approval

Written design approved by Grok Bot on the user's behalf (decisions delegated).
