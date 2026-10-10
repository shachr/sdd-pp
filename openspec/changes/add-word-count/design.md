# Design

## Context

textkit has two single-function modules (`slugify`, `truncate`), each in its own file under `src/` with a `node:test` file under `test/`. "What is a word" is ambiguous enough that the choices are recorded here before planning (see proposal.md - Why).

## Goals / Non-Goals

**Goals:**
- One small pure function whose counting rule fits in one sentence.

**Non-Goals:**
- Language-aware segmentation (CJK text without spaces counts as one word per whitespace-separated run).
- Counting characters, sentences or reading time (later requirements of `text-statistics`).

## Decisions

- **Split on `/\s+/` after trimming, then filter with `/[\p{L}\p{N}]/u`.** Alternatives: `Intl.Segmenter` with `granularity: 'word'` handles CJK but splits "don't" and "over-think" differently across engines and is not needed for the stated callers; a `\b\w+\b` regex misses accented letters and splits on apostrophes. Chosen rule is predictable and engine-independent.
- **Module name `src/text-statistics.mjs`, export `countWords`.** Named after the capability so later measurements (character count, sentences) join the same module instead of new files per function.
- **Reject non-strings with `TypeError`.** `slugify` coerces with `String(text)`; counting words in `"undefined"` would silently return 1, which is worse than an error for a word-limit check.

## Risks / Trade-offs

- [CJK text is under-counted] → documented non-goal; `Intl.Segmenter` can be added behind a new requirement later.
- [Inconsistent input handling vs `slugify`] → deliberate, recorded above.
