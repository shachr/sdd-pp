# text-stats Specification

## Purpose

Gives callers word counts and whole-minute reading-time estimates for a text, using the same notion of a word as the rest of textkit.

## Requirements

### Requirement: Word count
The library SHALL count the words in a text, where a word is a run of characters other than spaces, tabs and line breaks.

#### Scenario: Counts words
- **WHEN** `countWords("one two\tthree\nfour, five")` is called
- **THEN** it returns `5`

#### Scenario: No words
- **WHEN** `countWords(" \t\n ")` is called
- **THEN** it returns `0`

### Requirement: Reading time
The library SHALL estimate the reading time of a text in whole minutes, rounding up, at a reading speed of 200 words per minute unless the caller gives another speed.

#### Scenario: Rounds up to whole minutes
- **WHEN** `readingTime` is called on a text of 201 words without a speed
- **THEN** it returns `2`

#### Scenario: Empty text reads in zero minutes
- **WHEN** `readingTime("")` is called
- **THEN** it returns `0`

#### Scenario: Custom reading speed
- **WHEN** `readingTime` is called on a text of 300 words with a speed of 300
- **THEN** it returns `1`

### Requirement: Input checked
The library SHALL reject text that is not a string with a TypeError and a reading speed that is not a finite number greater than zero with a RangeError.

#### Scenario: Text is not a string
- **WHEN** `countWords(null)` or `readingTime(42)` is called
- **THEN** it throws a TypeError

#### Scenario: Reading speed is not positive
- **WHEN** `readingTime("a b", 0)` or `readingTime("a b", -5)` is called
- **THEN** it throws a RangeError
