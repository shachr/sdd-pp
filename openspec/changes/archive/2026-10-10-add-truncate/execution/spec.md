> Source of truth: [proposal](../proposal.md) · [spec delta](../specs/truncation/spec.md) · [grill session](grill.md)

Status: ready-for-agent

## Problem Statement

See [proposal.md](../proposal.md) - "Why".

## Solution

A single `truncate` function in textkit, behaving as the [truncation delta](../specs/truncation/spec.md) says.

## User Stories

1. As an app developer, I want short text returned as-is, so that previews of short titles look untouched - [delta](../specs/truncation/spec.md) "Requirement: Short text unchanged" (Scenarios "Fits already", "Exact length").
2. As an app developer, I want long text cut to fit my limit with a visible marker, so that previews never overflow - [delta](../specs/truncation/spec.md) "Requirement: Truncation with ellipsis" (Scenarios "Cut at word boundary", "Long single word").
3. As an app developer, I want to pick my own marker, so that previews match my UI's style - [delta](../specs/truncation/spec.md) "Requirement: Truncation with ellipsis" (Scenario "Custom ellipsis").
4. As an app developer, I want bad limits refused loudly, so that bugs in my layout code surface early - [delta](../specs/truncation/spec.md) "Requirement: Limit validation" (Scenario "Invalid limit rejected").

## Implementation Decisions

- One new module exporting `truncate(text, maxLength, { ellipsis })`, sibling to `slugify`; input coerced with `String()` like `slugify` (grill Q6).
- Validation happens before any cutting (grill Decisions).
- Cutting algorithm: keep `maxLength - ellipsis.length` code units, back off to the last whitespace when the cut lands mid-word and the kept part has whitespace, trim trailing whitespace, append the ellipsis (grill Q7).
- Length is measured in UTF-16 code units (grill Q8).

## Testing Decisions

- Test only the public function's output, one test per delta scenario, named after the scenario (grill Q10).
- Prior art: `test/slugify.test.mjs` (node:test + assert/strict).

## Out of Scope

- Grapheme-aware or display-width-aware cutting.
- Cutting at sentence or punctuation boundaries.
- Changes to `slugify`.

## Further Notes

Decisions were delegated to Grok Bot during the grill; see [grill.md](grill.md).
