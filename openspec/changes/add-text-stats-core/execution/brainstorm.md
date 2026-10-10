---
tool: superpowers
session: brainstorming
---

> Source of truth: [proposal](../proposal.md) · specs: ../specs/<capability>/spec.md

# brainstorming session: add-text-stats-core

> Parent session (shared, read first): [../add-text-stats-cli/execution/grill.md](../../add-text-stats-cli/execution/grill.md) · delta: [specs/text-stats/spec.md](../specs/text-stats/spec.md)

Narrowed session for slice `add-text-stats-core` of the split change [add-text-stats-cli](../../add-text-stats-cli/slices.md). Run with Superpowers `brainstorming`, limited to this slice; the parent settled the module layout (Q8: `src/stats.mjs`, pure `wordCount` / `sentenceCount`, `String(text)` coercion). Not re-decided here. Decisions were delegated: every answer is **Grok Bot's call on the user's behalf**.

## Conversation record

- First message: delegated - "the library half of the stats feature: two pure counting functions the later stats slice will call".
- Q: What does this slice leave for later slices? -> exported `wordCount(text)` and `sentenceCount(text)` from `src/stats.mjs`; add-stats-cli (later slice) imports them. Nothing else. (Grok Bot's call)
- Q: Repeated terminal marks ("Wait... really?!")? -> a run of marks ends one sentence, and a run with no word in it is not a sentence. This is behaviour the parent did not settle -> added to the slice delta as Scenario "Repeated punctuation" and recorded as an amendment in the parent. (Grok Bot's call)
- Q: Unicode? -> letters/digits are `\p{L}` / `\p{N}` so "café" and "日本" are words. (Grok Bot's call)
- Approaches: (A) regex split + filter, (B) char scanner. Chosen A (smaller, matches slugify's style). (Grok Bot's call)

## Written design

### Intent and why
Callers need consistent length facts; the CLI stats slice needs a library to call. Behaviour: the [delta](../specs/text-stats/spec.md).

### Goals
- `wordCount` covering "Requirement: Word count"; `sentenceCount` covering "Requirement: Sentence count".

### Non-goals
- No abbreviations handling ("e.g."), no CLI (other slices), no reading time.

### Constraints
- Node >= 18, ES modules, no dependencies; `String(text)` coercion.

### Decided how
- `wordCount`: split on `/\s+/`, count parts matching `/[\p{L}\p{N}]/u`.
- `sentenceCount`: split on `/[.!?]+/` (a run of marks is one boundary), count parts that contain a word (same test as `wordCount`); the part after the last mark is the trailing text, so it is counted when it has a word. Commas, dashes and other punctuation are not boundaries.
- Module `src/stats.mjs`, tests `test/stats.test.mjs`, one test per delta scenario.

### Left to the builder
- Helper names and test layout.

## Scenarios found

Names only - each is a scenario in the delta:
- Words in a sentence; Whitespace only
- Sentences ending in punctuation; No terminal punctuation; Repeated punctuation

## Builder check result

Fresh context: local Ollama `qwen3:4b-instruct` with `builder-check-prompt.md` filled in (this document, the slice delta, the parent's Decisions), run ~11:00 PT, 194 s, cut at OLLAMA_NUM_PREDICT 1500. Output (1500 tokens, four questions, ranked) not kept in the change folder (it restates delta values; check-handoff would flag it as paraphrase); question headlines verbatim: "Does the sentence count include trailing text with no terminal punctuation?", "How should \"repeated punctuation\" be interpreted in the sentence count?", "What constitutes a \"word\" in the Unicode case (e.g., \"café\", \"日本\")?", "What happens when a sentence ends with a word and punctuation, but the punctuation is not a terminal mark (e.g., \"Hello, world!\")?".

Piles:
- Answered already: (1) repeated punctuation - Scenario "Repeated punctuation" + "Decided how"; (2) hyphenated / Unicode words - words are whitespace-separated runs (delta "Requirement: Word count"), so "café-é" is one word; (3) trailing text - the part after the last mark is counted (made explicit in "Decided how"); (4) commas are not sentence marks (delta lists only ".", "!", "?"; made explicit).
- Minor: none. Theirs: none. No question round needed.

## Approval

Written design approved by Grok Bot on the user's behalf (decisions delegated).

Next: OpenSpec proposal + specs + /handoff; writing-plans is the engineer's first next step after it.
