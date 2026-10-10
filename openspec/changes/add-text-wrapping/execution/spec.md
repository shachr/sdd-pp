> Source of truth: [proposal](../proposal.md) · [spec delta](../specs/text-wrapping/spec.md) · [design](design.md)

# Spec: add-text-wrapping (AI Hero `to-spec` output)

**Status:** ready-for-agent

> Written after the tickets and the implementation in this run: the user asked mid-flow for `to-spec` to be run (with references instead of restated behaviour). In the normal order it sits between `grill-with-docs` and `to-tickets`; the tickets now link this file too.

## Problem Statement

See [proposal - Why](../proposal.md#why).

## Solution

See [proposal - What Changes](../proposal.md#what-changes); the behaviour is the [text-wrapping delta](../specs/text-wrapping/spec.md).

## User Stories

The delta's scenarios are the user stories (one per scenario, actor: a textkit caller printing to a fixed-width terminal or log):

1. [Requirement "Lines fit the width"](../specs/text-wrapping/spec.md): scenarios "Two lines", "Already fits", "Space runs collapse".
2. [Requirement "Overlong words are split"](../specs/text-wrapping/spec.md): scenarios "Word wider than the column", "Overlong word after a short one", "Remainder shares its line".
3. [Requirement "Existing line breaks are kept"](../specs/text-wrapping/spec.md): scenarios "Blank line between paragraphs", "Empty text".
4. [Requirement "Invalid widths are rejected"](../specs/text-wrapping/spec.md): scenarios "Zero width", "Fractional width".

No experience-level story was found that the scenarios miss.

## Implementation Decisions

- One new module for the capability, named after it, beside `slugify`; it exports a single function and nothing else (no options object, no class). Settled in [design](design.md#decisions) (grilling Q1).
- Greedy first-fit per Paragraph, not minimum-raggedness: simplest to reason about, linear, and matches how callers wrap by hand today (Q2).
- Only the space character separates Words; tabs and carriage returns are ordinary characters (Q3 in [design](design.md)).
- The Width is checked once, before any splitting, so a bad Width fails even for empty text; the error message names the Width it received (Q6).
- "Overlong words are split" is a piece-cutting loop inside the line-filling loop, not a separate pass over the output (Q5; its open behaviour question went into the delta).
- Vocabulary (Width, Word, Paragraph, Line) from [GLOSSARY.md](../../../../GLOSSARY.md).

## Testing Decisions

- A good test calls the public function with an input and asserts the exact array of Lines (or the thrown error type); no test reaches into helpers.
- One seam: the module's public export (confirmed in grilling Q3; no new seams).
- One `node:test` test per delta scenario, named exactly after the scenario, so a failing test points straight at the requirement.
- Prior art: the existing slugify tests (same runner, same `assert.deepEqual` style).
- Error tests check the error type and that the message mentions the Width, so an incidental `RangeError` from elsewhere cannot make them pass.

## Out of Scope

See [proposal - Impact](../proposal.md#impact); additionally no hyphenation, no Unicode display-width handling (each UTF-16 code unit counts as one character), no CRLF normalisation.

## Further Notes

Single-session `implement` (no subagents); tickets in [tickets/](tickets/).
