# Spec Delta

## Purpose

Shortens text to a character limit for previews such as list views and link cards, without overshooting the limit or cutting words in half.

## ADDED Requirements

### Requirement: Text within the limit is unchanged
`truncate(text, maxLength)` SHALL return `text` unchanged when its length is less than or equal to `maxLength`. Length is measured as the JavaScript string length.

#### Scenario: Shorter than the limit
- **WHEN** `truncate("hello", 10)` is called
- **THEN** it returns `hello`

#### Scenario: Exactly the limit
- **WHEN** `truncate("hello", 5)` is called
- **THEN** it returns `hello`

### Requirement: Long text is shortened with an ellipsis
When `text` is longer than `maxLength`, `truncate` SHALL return a string of at most `maxLength` characters that ends with a single `…` (U+2026), with any whitespace immediately before the ellipsis removed.

#### Scenario: Result fits the limit
- **WHEN** `truncate("abcdefghij", 5)` is called
- **THEN** it returns `abcd…`

#### Scenario: Limit of one
- **WHEN** `truncate("abc", 1)` is called
- **THEN** it returns `…`

### Requirement: Cuts at a word boundary when possible
When shortening, `truncate` SHALL end the kept text at the last space inside the allowed length if the kept text contains a space; otherwise it SHALL cut at the allowed length.

#### Scenario: Word boundary available
- **WHEN** `truncate("The quick brown fox", 12)` is called
- **THEN** it returns `The quick…`

#### Scenario: Single long word
- **WHEN** `truncate("Supercalifragilistic", 8)` is called
- **THEN** it returns `Superca…`

### Requirement: Invalid limits are rejected
`truncate` SHALL throw a `RangeError` when `maxLength` is not an integer or is less than 1.

#### Scenario: Zero limit
- **WHEN** `truncate("abc", 0)` is called
- **THEN** a `RangeError` is thrown

#### Scenario: Fractional limit
- **WHEN** `truncate("abc", 2.5)` is called
- **THEN** a `RangeError` is thrown
