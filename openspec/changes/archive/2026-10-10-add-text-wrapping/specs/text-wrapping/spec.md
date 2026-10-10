# Spec Delta

## Purpose

Fitting text into a fixed column width as a list of lines, for terminal output and fixed-width log columns.

## ADDED Requirements

### Requirement: Lines fit the width
`wrapText(text, width)` SHALL return an array of lines, each at most `width` characters long, filled greedily with as many words as fit. Words are separated by runs of spaces in the input and by exactly one space in the output.

#### Scenario: Two lines
- **WHEN** `wrapText("the quick brown fox", 10)` is called
- **THEN** it returns `["the quick", "brown fox"]`

#### Scenario: Already fits
- **WHEN** `wrapText("hello", 10)` is called
- **THEN** it returns `["hello"]`

#### Scenario: Space runs collapse
- **WHEN** `wrapText("a   b", 10)` is called
- **THEN** it returns `["a b"]`

### Requirement: Overlong words are split
A word longer than `width` SHALL start on a new line and be split into pieces of `width` characters; the last piece keeps the remainder and later words may join its line when they fit.

#### Scenario: Word wider than the column
- **WHEN** `wrapText("abcdefghij", 4)` is called
- **THEN** it returns `["abcd", "efgh", "ij"]`

#### Scenario: Overlong word after a short one
- **WHEN** `wrapText("go abcdefgh", 4)` is called
- **THEN** it returns `["go", "abcd", "efgh"]`

#### Scenario: Remainder shares its line
- **WHEN** `wrapText("abcdefghij x", 4)` is called
- **THEN** it returns `["abcd", "efgh", "ij x"]`

### Requirement: Existing line breaks are kept
Each `\n`-separated paragraph of `text` SHALL be wrapped independently, and an empty paragraph SHALL produce an empty line.

#### Scenario: Blank line between paragraphs
- **WHEN** `wrapText("one\n\ntwo", 10)` is called
- **THEN** it returns `["one", "", "two"]`

#### Scenario: Empty text
- **WHEN** `wrapText("", 5)` is called
- **THEN** it returns `[""]`

### Requirement: Invalid widths are rejected
`wrapText` SHALL throw a `RangeError` when `width` is not an integer or is less than 1.

#### Scenario: Zero width
- **WHEN** `wrapText("abc", 0)` is called
- **THEN** a `RangeError` is thrown

#### Scenario: Fractional width
- **WHEN** `wrapText("abc", 2.5)` is called
- **THEN** a `RangeError` is thrown
