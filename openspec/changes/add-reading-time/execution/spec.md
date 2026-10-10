> Source of truth: [proposal](../proposal.md) · [spec delta](../specs/reading-time/spec.md) · [grill session](grill.md)

Status: ready-for-agent

# Spec: add-reading-time (AI Hero `to-spec`, synthesised from the grill session)

## Problem Statement

See [proposal - Why](../proposal.md#why).

## Solution

A **Reading time** estimate for any text, as described in [proposal - What Changes](../proposal.md#what-changes) and the [delta](../specs/reading-time/spec.md).

## User Stories

1. As a blog author, I want a "min read" label computed for me, so that every article shows a consistent estimate - "Requirement: Reading time estimate" ([delta](../specs/reading-time/spec.md)); scenarios "Default reading speed", "Partial minute rounds up".
2. As a docs-site maintainer whose readers skim technical text, I want to pass my own reading speed, so that the label fits my audience - "Requirement: Reading time estimate"; scenario "Custom reading speed".
3. As a caller rendering drafts, I want an empty draft to show no reading time, so that I can hide the label - "Requirement: Reading time estimate"; scenario "Empty text".
4. As an author who writes with dashes and ellipses, I want punctuation not to inflate the estimate - "Requirement: Word counting"; scenario "Punctuation-only tokens ignored".
5. As a caller passing text from editors and files, I want tabs, line breaks and runs of spaces handled, and accented or non-Latin **Words** counted - "Requirement: Word counting"; scenario "Mixed whitespace".
6. As a developer wiring configuration, I want a broken reading speed to fail loudly, so that I find the misconfiguration instead of shipping "0 min read" - "Requirement: Reading speed validation"; scenario "Invalid speed rejected".

## Implementation Decisions

- One new deep-enough module next to the slug module: a single pure function taking the text and an options object with the reading speed; returns a number of minutes. Settled in [grill.md - Decisions](grill.md#decisions).
- Order inside the function: validate the speed, count words, short-circuit zero words, divide and round up.
- Word counting is a private helper (whitespace split, keep tokens with a Unicode letter or digit); not exported (grill Q9).
- Input coercion matches the slug module (stringify whatever is passed); deliberately not specified in the delta.
- No dependencies, no changes to existing exports.

## Testing Decisions

- Seam: the public function only - the highest seam, and the only one (grill Q10, confirmed on the user's behalf).
- One test per delta scenario, named after the scenario, asserting the returned minutes or the thrown RangeError; no tests of the private helper.
- Prior art: the slug module's tests (`node:test` + strict assert).

## Out of Scope

- Reading time for non-prose (code blocks, images), seconds-level precision, localisation of the label text.

## Further Notes

- Glossary terms **Reading time** and **Word** were added during the grill (`GLOSSARY.md`). No ADR.
