> Source of truth: [proposal](../proposal.md) · [specs/text-truncation/spec.md](../specs/text-truncation/spec.md) · [handoff](../handoff.md)

**Status:** ready-for-agent

## Problem Statement

People building previews with textkit (list rows, notification bodies, link cards) have no helper for shortening text. They hand-roll a slice plus three dots, which overshoots their length budget and leaves half-words like "infor..." on screen. See [proposal - Why](../proposal.md#why).

## Solution

textkit gains a `truncate` function: hand it text and a length budget and get back text that fits the budget, ends in a proper ellipsis when shortened, and avoids cutting words in half. The exact behavior is defined by the four requirements in the [text-truncation delta](../specs/text-truncation/spec.md).

## User Stories

1. As a developer rendering a list view, I want to shorten item titles to a fixed budget, so that rows never wrap or overflow.
2. As a developer, I want text that already fits to come back untouched, so that I can call `truncate` unconditionally.
3. As a reader of a preview, I want shortened text to end on a whole word, so that the preview is readable.
4. As a reader, I want a single ellipsis character marking the cut, so that I know the text continues.
5. As a developer with a tight budget, I want the ellipsis counted inside the budget, so that the result never exceeds the space I reserved.
6. As a developer passing a single very long word (a URL, a hash), I want it hard-cut rather than returned empty, so that something meaningful still shows.
7. As a developer who passes a bad limit by mistake (zero, negative, fractional), I want an immediate error, so that the bug surfaces in tests instead of as odd UI.

## Implementation Decisions

- One new module exporting a single pure function `truncate(text, maxLength)`, beside the existing `slugify` module; no shared code between them.
- Validation first: a limit that is not a positive integer raises `RangeError` before any text handling.
- The ellipsis is the single character U+2026, so it costs exactly one unit of the budget; the kept text may use `maxLength - 1` characters.
- Word boundary rule: take the first `maxLength - 1` characters; if that slice contains a space, cut at the last space; otherwise keep the hard slice. Then strip trailing whitespace before appending the ellipsis.
- Length is JavaScript string length (UTF-16 code units), matching the delta. Grapheme-aware counting is out of scope.
- No options object yet (custom ellipsis, word-boundary toggle): not asked for.

## Testing Decisions

- Test only external behavior: the return value (or thrown error) of `truncate` for given inputs.
- Seam: the module's public export, called directly with node:test; one test per scenario in the delta, named after the scenario.
- Prior art: the existing slugify unit tests (node:test + assert/strict).

## Out of Scope

- Grapheme clusters / emoji-safe cutting, HTML-aware truncation, custom ellipsis strings, truncating from the middle.

## Further Notes

- Design artifact skipped as conditional (single pure function); decisions above are the design record.
