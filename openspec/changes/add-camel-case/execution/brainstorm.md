---
tool: superpowers
session: brainstorming
---

> Source of truth: [proposal](../proposal.md) · specs: ../specs/<capability>/spec.md

# brainstorming session: add-camel-case

Request (user, via the parent): "textkit should turn phrases into camelCase identifiers". Run with Superpowers `brainstorming` before any OpenSpec artifact existed. Decisions were delegated: every answer below is **Grok Bot's call on the user's behalf**.

## Conversation record

- First message (ask them to describe it): delegated - Grok Bot described it: "a function that turns a free-text phrase such as a form label into a camelCase identifier, the way `slugify` turns it into a URL slug".
- Q: What counts as a word break? -> any run of characters that are not letters or digits (spaces, hyphens, underscores, punctuation). (Grok Bot's call)
- Q: Shouting or mixed-case input? -> normalise: words are lower-cased before capitalising. (Grok Bot's call)
- Q: Non-ASCII letters? -> kept, e.g. accented letters stay as they are; Unicode letters and digits are word characters. (Grok Bot's call)
- Q: Already-camelCase input ("helloWorld")? -> no case-boundary detection; it is one word. Non-goal. (Grok Bot's call)
- Q: Nothing to convert? -> empty string, no error. (Grok Bot's call)
- Approaches considered: (A) regex split on non-letter/digit runs + map, (B) reuse `slugify` then split on "-", (C) a char-by-char state machine. Chosen: A - B would strip accents (slugify folds diacritics), C is more code for the same result. (Grok Bot's call)

## Written design

### Intent and why

Callers turn form labels and headings into identifiers (object keys, CSS-in-JS names) by hand, inconsistently. textkit already owns the URL-slug version of this; camelCase is the sibling. Behaviour: see the [delta](../specs/casing/spec.md).

### Goals

- One function `camelCase(text)` covering the delta's "Requirement: Word splitting", "Requirement: Word casing" and "Requirement: Empty result".

### Non-goals / anti-goals

- No detection of existing case boundaries ("helloWorld" stays one word).
- No PascalCase, snake_case or kebab-case variants in this change.
- No diacritic folding (that is slugify's job).

### Constraints

- Node >= 18, ES modules, no runtime dependencies (AGENTS.md); `String(text)` coercion like `slugify`.

### Decided how

- Approach A: one regex split `/[^\p{L}\p{N}]+/u`, drop empty parts, then a map applying "Requirement: Word casing" of the [delta](../specs/casing/spec.md), then `join("")`.
- Module `src/camel-case.mjs`, tests `test/camel-case.test.mjs`, one test per delta scenario.

### Left to the builder

- Test-file layout and helper names.

### Builder check

Run in a fresh context (local Ollama qwen3:4b-instruct with `builder-check-prompt.md`; no sub-agent tool). Output and the three piles: see "Builder check result" below.

## Scenarios found

Names only - each is a scenario in the delta (`../specs/casing/spec.md`):
- Mixed separators
- Shouting input; Unicode letters
- Nothing to convert

## Builder check result

Fresh context: local Ollama `qwen3:4b-instruct`, prompt = `builder-check-prompt.md` filled in with this document (run 01:04 PT). Output verbatim:

> Nothing important left.

Piles: answered already - none; minor - none; theirs - none. No question round needed.

## Approval

Written design approved by Grok Bot on the user's behalf (decisions delegated). Calls made on their behalf: the five Q answers and approach A above.

Next: OpenSpec proposal + specs + /handoff; writing-plans is the engineer's first next step after it.
