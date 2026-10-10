---
tool: superpowers
session: brainstorming
---

> Source of truth: [proposal](../proposal.md) · [specs/initials/spec.md](../specs/initials/spec.md)

# brainstorming session: add-initials (Superpowers, proposal phase)

Request (user, via the parent): "textkit should give me someone's initials". Execution tool for this change: **superpowers** (per-change override of the project default ai-hero, recorded by `execution-tool.mjs add-initials --set superpowers`). Run with Superpowers `brainstorming` before any OpenSpec artifact existed. Decisions were delegated: every partner answer below is **Grok Bot's call on the user's behalf**.

## Conversation

1. **First message** (as the skill prescribes): "If you'd rather skip the questions and have me just start, say so. - What's the moment you find yourself wishing textkit could do this?"
   - Partner (on their behalf): "Avatars in a comments list: when someone has no profile picture we show a coloured circle with their initials, and every app we build hand-rolls it slightly differently."
2. **Q**: "Walk me through the names that broke the last hand-rolled version?"
   - Partner (on their behalf): "Hyphenated first names came out as one letter, lowercase sign-ups looked wrong, and a name with an emoji or bracket in front produced a blank circle."
3. **Playback 1 - what it's for** (my words, guesses marked): a function that turns a display name into the letters for an avatar circle. Every name part contributes its first letter; hyphenated parts count as separate parts; letters come out uppercase; anything in front of the first letter of a part (brackets, emoji, quotes) is skipped; a part with no letters contributes nothing; a blank name gives an empty result so the caller can fall back to an icon. *My guess:* no length cap in the function - the avatar component decides how many letters to show. *My guess:* accented letters stay accented ("É", not "E"). "What's wrong or missing?"
   - Partner (on their behalf): "Right, including both guesses. Keep it a plain function like slugify."
4. **How it gets made** (existing work: textkit is plain ES modules with node:test and no dependencies): build on that - my call, said plainly.
5. **Size the Work**: "a project with a written design" -> this document, then a full plan with writing-plans. Partner preference (this workflow): the design goes to `execution/brainstorm.md` in the OpenSpec change, not `docs/superpowers/specs/`, and writing-plans runs later at `/handoff`.

## The Written Design

### Intent and why
See [proposal - Why](../proposal.md#why): one shared, predictable way to get avatar initials from a display name.

### Goals, non-goals, anti-goals
- Goals: the behaviours in the [delta](../specs/initials/spec.md) - Requirement "Initials from name parts", Requirement "Letters only", Requirement "Blank name".
- Non-goals: culture-specific rules (particles like "van", CJK given/family order), a length cap, colours.
- Anti-goal: a blank circle for a non-blank name that contains letters (the bug that motivated this).

### Constraints
- Same shape as `slugify`: one pure function per module, ES module, no runtime dependencies, Node >= 18, tests with `node:test`.

### The parts of the how they decided
- Plain exported function `initials(name)` returning a string (partner: "a plain function like slugify").
- Hyphen splits parts the same way whitespace does (partner: hyphenated first names).

### What's left to the builder (my calls, marked)
- *My call:* new module `src/initials.mjs`, tests in `test/initials.test.mjs`.
- *My call:* split on whitespace and hyphens (`/[\s-]+/`), take the first Unicode letter of each part (`/\p{L}/u`), uppercase with `toUpperCase()` (keeps accents), join with no separator.
- *My call:* `String(name)` coercion like `slugify`; not part of the behaviour contract.
- *My call:* plan size: one task per requirement is too fine; two tasks (core extraction, then the edge rules) is enough.

### Scenarios found
Names only - each is a requirement or scenario in the delta (`../specs/initials/spec.md`):
- Two-part name; Hyphenated name; Lowercase input; Accented initial
- Leading punctuation; Part without letters
- Blank name

## Builder check

No subagent tool in this harness. The builder check ran in a fresh context instead: the skill's `builder-check-prompt.md`, filled in, sent to a separate local model (qwen3:4b-instruct via Ollama) that sees only this document - see "Builder check result" below.

## Approval (HARD-GATE)

Approved on the partner's behalf by Grok Bot (decisions delegated) after the builder check.

## STOP - brainstorming ends here

Brainstorming's terminal step ("invoke superpowers:writing-plans") is **deferred**: in this workflow writing-plans runs at `/handoff`, reading this file. No plan was written and no implementation skill was invoked.
Next: OpenSpec proposal + specs; writing-plans runs at /handoff.
