> Source of truth: [proposal](../proposal.md) · [spec delta](../specs/title-case/spec.md) · [handoff](../handoff.md)

# Design: add-title-case (Superpowers `brainstorming` written design)

The user delegated every decision for this run. The conversation below was held by the implementer, answering on the user's behalf from the proposal + delta; every such answer is marked **(my call)**. Approval at the HARD-GATE was also given on the user's behalf.

## Conversation record

1. Opening (skill's first message): offered to skip the questions; asked for the moment this is needed. -> Not skipped; the moment is the proposal's [Why](../proposal.md#why) (titles built from user input). **(my call: not skipping, so the skill runs as written)**
2. How it gets made: build on what textkit already uses? -> Yes: plain Node ES module, no dependencies, `node:test`; one module named after the capability, like `slugify` and `wrapText`. **(my call)**
3. What would make you wince if I got it wrong? -> Small words capitalised in the middle of a title, or the spacing of the input changing (both are delta requirements: "Minor words stay lowercase", "Spacing is preserved"). **(my call, read from the delta)**
4. Playback chunk (what it's for, how a word behaves) - nothing wrong or missing. **(my call)**
5. Size: "a project with a written design" -> plan with writing-plans (wrapper rule for handed-off OpenSpec changes). **(my call)**

## Intent and why

See [proposal - Why](../proposal.md#why). Success = every delta scenario of [specs/title-case/spec.md](../specs/title-case/spec.md) passes.

## Goals, non-goals, anti-goals

- Goals: the four requirements of the [delta](../specs/title-case/spec.md), by name: "Words are capitalised", "Minor words stay lowercase", "Spacing is preserved", "Non-string input is rejected".
- Non-goals: the out-of-scope list in [proposal - Impact](../proposal.md#impact).
- Anti-goal: a configurable casing engine (style guides, custom word lists). One fixed behaviour is the point.

## Constraints

- No runtime dependencies; Node >= 18 ES modules; tests run with `npm test` (`node --test`).
- `slugify` and `wrapText` stay untouched.

## The how, as decided

- **Module:** `src/title-case.mjs` exports `toTitleCase(text)`; tests in `test/title-case.test.mjs`. **(my call)**
- **Keeping the spacing:** split with a capturing regex on runs of spaces (`text.split(/( +)/)`), so separators come back as their own items and joining with `''` restores the input's spacing exactly. No trimming, no re-joining with a single space. **(my call)**
- **Position of a word:** first / last are counted among the non-space items only, so leading or trailing spaces do not make the first real word "middle". **(my call)**
- **Minor-word list:** a module-level `Set` holding exactly the delta's list, matched against the lowercased word. **(my call)**
- **Casing a word:** uppercase the first character, lowercase the rest (`toUpperCase` / `toLowerCase`, default locale-independent behaviour of JS). **(my call)**
- **Type check first**, before any splitting: `typeof text !== 'string'` -> `TypeError` whose message names the received type. **(my call)**

## Left to the builder

- Test names: one per delta scenario, named after it.
- Internal helper names.

## Builder check

No subagent tool in this harness, so I read the document as the builder (the skill allows this). Piles:

- **Answered already:** where leading/trailing spaces go (spacing decision above); what counts as first/last (position decision).
- **Minor (my call):** "Shouting is calmed" implies lowercasing the rest of the word even for minor words in first position (`"THE"` -> `"The"`); follows from the casing decision.
- **Theirs (answered on the user's behalf):** what happens to a word that starts with punctuation, such as `(draft)`? This changes what gets built, so it is a behaviour question: answered by adding it to the out-of-scope list in [proposal - Impact](../proposal.md#impact) (OpenSpec owns it), `openspec validate add-title-case --strict` re-run and passing.

Approved on the user's behalf. Next: writing-plans.
