# Spec: add-word-wrap

Status: ready-for-agent

Seams (to-spec step 2): answered from [grill.md](grill.md) Decisions - one seam, the public `wordWrap` function at the package entry point; no re-grill.

## Problem Statement

See [proposal.md - Why](../proposal.md).

## Solution

See [proposal.md - What Changes](../proposal.md); behaviour is in the [text-wrap delta](../specs/text-wrap/spec.md).

## User Stories

1. As a caller laying out terminal text, I want lines broken between words at my width, so that output fits a fixed-width screen. [delta](../specs/text-wrap/spec.md) - "Requirement: Wrap at word boundaries" (Scenarios "Short text unchanged", "Wraps at the width", "Default width", "Spaces collapsed").
2. As a caller wrapping text with URLs or long identifiers, I want overlong words cut, so that no line is wider than my width. [delta](../specs/text-wrap/spec.md) - "Requirement: Long words broken" (Scenario "Word longer than the width").
3. As a caller wrapping multi-paragraph text, I want my line breaks kept, so that paragraphs and blank lines survive. [delta](../specs/text-wrap/spec.md) - "Requirement: Paragraphs kept" (Scenarios "Paragraphs wrapped separately", "Empty text").
4. As a caller passing bad arguments, I want an immediate typed error, so that bugs surface at the call site. [delta](../specs/text-wrap/spec.md) - "Requirement: Input checked" (Scenarios "Text is not a string", "Width is not a positive integer").

## Implementation Decisions

Summary of [grill.md - Decisions](grill.md#decisions):
- One new module exporting a single pure function `wordWrap(text, width = 80)` returning a string, re-exported from the package entry point; no dependencies.
- Greedy line fill per input line; words are runs of non-space characters (glossary: **Word**); overlong words are cut so each cut piece plus its hyphen fits the line width (the delta's Scenario "Word longer than the width" supersedes the plain-chunk decision in grill.md, which predates the delta edit).
- Validation runs before any wrapping, with the same error style as `slugify` (message prefixed with the function name).

## Testing Decisions

- Test only the public function's observable output (returned string, thrown error type), never internal helpers.
- One node:test case per delta scenario, named after the scenario, in a new test file next to the existing slugify tests (prior art: the slugify test file).
- `npm test` must stay green after each ticket.

## Out of Scope

- Unicode-aware width (grapheme clusters, East Asian wide characters): width counts `String.length`.
- Hyphenation, justification, indentation, and preserving runs of spaces.
- CRLF handling beyond splitting on `\n`.

## Further Notes

- Glossary terms used: Line width, Word, Paragraph ([GLOSSARY.md](../../../../GLOSSARY.md)).
