---
tool: superpowers
session: brainstorming
---

> Links: [proposal](../proposal.md) · specs: ../specs/<capability>/spec.md

# brainstorming session: add-text-stats

Request (user): "Add text statistics to textkit - word count and an estimated reading time for a blog post preview."

The user delegated the conversation for this run: the partner answers below are the agent's calls on the user's behalf (marked **[agent]**). No visual companion (nothing to look at); no spike.

## Conversation record

1. Agent (first message): offered to skip the questions; asked "What's the moment you find yourself wishing this existed?" **[agent]** "Rendering a post card: '1,240 words · 7 min read' under the title."
2. Agent: "Walk me through what counts as a word in that card?" **[agent]** "Whatever the wrap helper calls a word - runs of non-space characters; punctuation sticks to its word."
3. Agent: "What reading speed do you picture, and should a reader be able to change it?" **[agent]** "200 words a minute by default; a caller can pass another speed."
4. Agent: "If a post is 201 words, would you say 1 min or 2 min read?" **[agent]** "2 - always round up; an empty post is 0 min."
5. Agent: "What should happen with bad input, like a number instead of text?" **[agent]** "Throw, the same way slugify and wordWrap do."
6. Playback (agent): two small pure functions next to the other text helpers - a word counter and a reading-time estimate built on it; defaults as above; errors like the existing helpers. Partner **[agent]**: "Right, nothing missing."

Size (Size the Work): **a project with a written design** - the engineer plans it with writing-plans after /handoff (wrapper rule).

## Written design

### Intent and why
Post previews need "N words · M min read". Today callers count words with ad-hoc regexes that disagree with how textkit splits words for wrapping.

### Goals
- Count words the same way the wrap helper defines a Word (GLOSSARY.md). -> delta "Requirement: Word count"
- Estimate whole-minute reading time from that count, with a caller-chosen speed. -> delta "Requirement: Reading time"
- Reject bad input like the other helpers. -> delta "Requirement: Input checked"

### Non-goals / anti-goals
- No sentence, syllable or readability scores; no locale-aware word segmentation (CJK has no spaces - out of scope).
- Anti-goal: a second, different definition of "word" in the library.

### Constraints
- Node >= 18, ES modules, no dependencies; node:test.

### Decided how (partner's calls, made by the agent on their behalf)
- Two exports: `countWords(text)` and `readingTime(text, wordsPerMinute = 200)`, from a new `src/stats.mjs`, re-exported from `src/index.mjs`.
- Word split: `/[ \t\n\r]+/`, empty pieces dropped (glossary **Word**, line breaks also separate words).
- Reading time = `Math.ceil(countWords(text) / wordsPerMinute)`.
- Errors: non-string text -> `TypeError`; `wordsPerMinute` not a finite number > 0 -> `RangeError`; messages prefixed with the function name.

### Left to the builder
- Whether `readingTime` reuses `countWords` or shares a private splitter (my call: reuse `countWords`).
- Test file layout (my call: `test/stats.test.mjs`, one test per delta scenario).

### Builder check
No sub-agent tool in this harness: the agent read the document as the builder (the skill allows this).
- Answered already: what a word is (glossary), rounding (always up), default speed (200).
- Minor (my call): non-integer speeds such as 250.5 are allowed (finite > 0).
- Theirs: none.

### Approval
Approved by the agent on the user's behalf (decisions delegated) - HARD-GATE satisfied for the written design only.

## Scenarios found

- Counts words
- No words
- Rounds up to whole minutes
- Empty text reads in zero minutes
- Custom reading speed
- Text is not a string
- Reading speed is not positive

Next: OpenSpec proposal + specs + /handoff; writing-plans is the engineer's first next step after it.
