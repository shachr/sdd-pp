> Source of truth: [proposal](../proposal.md) · [spec delta](../specs/text-excerpt/spec.md) · [grill session](grill.md)

Status: ready-for-agent

# Spec: excerpt helper

## Problem Statement

See [proposal.md - Why](../proposal.md): previews are cut by hand today, inconsistently.

## Solution

See [proposal.md - What Changes](../proposal.md): one shared **Excerpt** helper (GLOSSARY.md) whose behaviour is the [text-excerpt delta](../specs/text-excerpt/spec.md).

## User Stories

1. As an app developer, I want short texts returned untouched, so that previews never gain a needless ellipsis - [delta](../specs/text-excerpt/spec.md) "Requirement: Excerpt within a length limit", Scenario "Text that fits".
2. As an app developer, I want long texts to end on a whole word, so that previews stay readable - [delta](../specs/text-excerpt/spec.md) "Requirement: Excerpt within a length limit", Scenarios "Cut at a word boundary", "Trailing punctuation dropped".
3. As an app developer, I want a sensible result even when one word is longer than the limit, so that a preview is never just an ellipsis - [delta](../specs/text-excerpt/spec.md) "Requirement: Excerpt within a length limit", Scenario "First word too long".
4. As an app developer, I want a standard ellipsis by default, so that I don't have to pass one every time - [delta](../specs/text-excerpt/spec.md) "Requirement: Ellipsis option", Scenario "Default ellipsis".
5. As an app developer, I want to choose my own ellipsis or none, so that previews match my UI - [delta](../specs/text-excerpt/spec.md) "Requirement: Ellipsis option", Scenarios "Custom ellipsis", "No ellipsis".
6. As an app developer, I want multi-line input turned into a single line, so that previews fit one-line layouts - [delta](../specs/text-excerpt/spec.md) "Requirement: Whitespace normalisation", Scenario "Whitespace collapsed".
7. As an app developer, I want emoji and other non-BMP characters never split, so that previews never show broken glyphs - [delta](../specs/text-excerpt/spec.md) "Requirement: Length counted in characters", Scenario "Emoji count as one character".
8. As an app developer, I want bad arguments rejected loudly, so that bugs surface during development - [delta](../specs/text-excerpt/spec.md) "Requirement: Input validation", Scenarios "Text is not a string", "Invalid maximum length".

## Implementation Decisions

Summarised from [grill.md - Decisions](grill.md#decisions) (the record there is authoritative):

- One new module beside the existing slug helper, exported from the package entry point; no dependencies; the slug helper is untouched.
- Interface: `excerpt(text, maxLength, options)` where `options.ellipsis` defaults to the single-character ellipsis.
- Order of work inside the helper: validate, normalise whitespace, measure in code points, return early when it fits, otherwise cut to the budget left after the ellipsis, back off to the last word boundary (hard cut when there is none), strip dangling separators, append the ellipsis.
- Errors are thrown synchronously with messages prefixed by the helper name, matching the slug helper's style.

## Testing Decisions

- Test external behaviour only: call the public helper through the package entry point and compare strings / thrown error types.
- One seam: the exported function (pure, no I/O). One `node:test` test per delta scenario, named after the scenario, so verify can map them.
- Prior art: the existing slug helper tests (`assert.equal`, `assert.throws` with the error class).

## Out of Scope

- Excerpts that end on sentence boundaries, HTML/Markdown-aware excerpts, grapheme-cluster counting (a family emoji made of several code points counts as several), locale-specific word breaking.

## Further Notes

- Seams check (to-spec step 2) answered from grill.md Q8 (single pure function); no re-grill (delegated decisions).
