---
tool: superpowers
session: brainstorming
---

> Source of truth: [proposal](../proposal.md) · [specs/case-conversion/spec.md](../specs/case-conversion/spec.md)

# brainstorming session: add-case-conversion

Request (engineer, on the user's behalf): "textkit should convert identifiers between camelCase, snake_case and kebab-case."
Design decisions were delegated: every partner answer below is marked **agent for user** (my call on shachar's behalf, not something the user said).

## Conversation record

1. Me: If you'd rather skip the questions and have me just start, say so. What's the moment you find yourself wishing this existed?
   Partner (agent for user): Mapping JSON API fields (`user_id`) to JS properties (`userId`) and to CSS/URL names (`user-id`); every service hand-rolls a regex and they disagree on `HTMLParser` and `version2`.
2. Me: How it gets made - I'm guessing it lives in textkit next to `slugify`/`excerpt`, plain ESM, no dependencies, `node:test` - is that your call or mine?
   Partner (agent for user): Yours; build on what textkit already uses.
3. Me: Walk me through an input that bit you last time.
   Partner (agent for user): `XMLHttpRequest` became `x_m_l_http_request`; it should be `xml_http_request`.
4. Playback (words and acronyms) - see "Playback 1" below. What's wrong or missing?
   Partner (agent for user): Digits stay attached to the word before them (`version2Beta` -> `version2_beta`), never split `v2`.
5. Me: What would make you wince if I got it wrong?
   Partner (agent for user): Silently dropping letters like `é` or turning garbage into something that looks valid; accents stay, and non-strings fail loudly.
6. Me: If it could only do one of these well, which - round-tripping exact original casing, or one predictable normal form?
   Partner (agent for user): Predictable normal form; acronyms come out as ordinary words (`xmlHttpRequest`), no round-trip guarantee.
7. Playback 2 (outputs and edges) - see below. What's wrong or missing?
   Partner (agent for user): Empty or separator-only input gives an empty string, not an error. Nothing else.

### Playback 1 (words)
Everything is built on one idea: split the input into words, then join them in the target style. A word boundary is any run of characters that are not letters or digits (spaces, `_`, `-`, `.`, `/`), a lower-case letter or digit followed by an upper-case letter (`userId`), and the last capital of an upper-case run that is followed by a lower-case letter (`XMLHttp` -> `XML` + `Http`). Digits are not a boundary on their own: `version2` is one word. Letters outside ASCII count as letters (`café`). (My guess, marked: separators are dropped entirely, they are never kept in the output.)

### Playback 2 (outputs)
`snakeCase` lowercases every word and joins with `_`; `kebabCase` lowercases and joins with `-`; `camelCase` lowercases the first word and capitalises the first letter of each following word (rest lower-case). Input that is already in the target style comes back unchanged. Empty input or input with no letters/digits returns `""`. A non-string throws a TypeError, like `slugify`.

## Size the Work

A project with a written design (agent for user: accepted): the engineer plans it with writing-plans after /handoff.

## Written Design

### Intent and why
One shared, predictable way to move identifiers between the three common styles, so services stop disagreeing on acronyms and digits.

### Goals
- Shared word splitting - delta "Requirement: Word splitting"
- Three converters - delta "Requirement: snake_case conversion", "Requirement: kebab-case conversion", "Requirement: camelCase conversion"
- Loud failure on bad input, quiet empty result on empty input - delta "Requirement: Input handling"

### Non-goals
- PascalCase, CONSTANT_CASE, Title Case (later change if asked).
- Round-tripping original acronym casing.
- Locale-specific casing (Turkish dotless i).

### Anti-goals
- Splitting acronyms letter by letter; dropping non-ASCII letters.

### Constraints
- textkit conventions: ESM, no dependencies, exported from `src/index.mjs`, `node:test`.

### Decided how (agent for user)
- One internal word splitter shared by the three exports.
- Unicode-aware letter/digit classes.

### Left to the builder
- Module layout and splitter implementation (regex vs. scanner); error message wording.

### Builder check (no subagent available - read as the builder myself, as the skill allows)
- Answered already: "Are separators kept?" -> no (Playback 1, now stated in the delta). "What does `XMLHttpRequest` give in camelCase?" -> `xmlHttpRequest` (answer 6).
- Minor (my call): a digit followed by an upper-case letter is a boundary (`version2Beta` -> `version2`, `Beta`), consistent with answer 4; `toLowerCase()` without locale.
- Theirs: none.

### Approval
Approved by the agent on the user's behalf (decisions delegated) - HARD-GATE satisfied for the written design only; nothing built yet.

## Scenarios found
- Separators split words
- Lower-to-upper boundary
- Acronym kept as one word
- Digits stay with their word
- Non-ASCII letters kept
- snake_case output
- kebab-case output
- camelCase output
- Already converted input unchanged
- Empty or separator-only input
- Text is not a string

Next: OpenSpec proposal + specs + /handoff; writing-plans is the engineer's first next step after it.
