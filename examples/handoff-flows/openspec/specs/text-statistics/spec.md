# text-statistics Specification

## Purpose
Measurements over a piece of text, such as how many words it contains, for word counters and word-limit checks.

## Requirements

### Requirement: Words are separated by whitespace
`countWords(text)` SHALL return the number of words in `text`, where words are separated by one or more whitespace characters (any character matched by JavaScript `\s`), and leading or trailing whitespace adds no words.

#### Scenario: Single spaces
- **WHEN** `countWords("the quick brown fox")` is called
- **THEN** it returns `4`

#### Scenario: Mixed whitespace
- **WHEN** `countWords("  one\ttwo\n\nthree  ")` is called
- **THEN** it returns `3`

#### Scenario: Empty or blank text
- **WHEN** `countWords("")` or `countWords(" \n ")` is called
- **THEN** it returns `0`

### Requirement: Only tokens with a letter or digit count
`countWords` SHALL count a whitespace-separated token only if it contains at least one Unicode letter or digit. Punctuation inside or around a word does not split it.

#### Scenario: Stray punctuation
- **WHEN** `countWords("wait - what ... ok")` is called
- **THEN** it returns `3`

#### Scenario: Hyphens and apostrophes stay inside a word
- **WHEN** `countWords("don't over-think it")` is called
- **THEN** it returns `3`

#### Scenario: Non-Latin letters
- **WHEN** `countWords("héllo wörld 123")` is called
- **THEN** it returns `3`

### Requirement: Non-string input is rejected
`countWords` SHALL throw a `TypeError` when `text` is not a string.

#### Scenario: Number input
- **WHEN** `countWords(42)` is called
- **THEN** a `TypeError` is thrown

#### Scenario: Missing input
- **WHEN** `countWords()` is called
- **THEN** a `TypeError` is thrown
