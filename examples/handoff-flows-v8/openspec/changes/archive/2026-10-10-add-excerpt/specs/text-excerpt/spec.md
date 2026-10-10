## Purpose

Shortens text into a single-line preview of a given maximum length that ends on a whole word and shows that it was shortened.

## ADDED Requirements

### Requirement: Excerpt within a length limit
The system SHALL return the text unchanged when it fits the maximum length, and otherwise SHALL return the longest prefix that ends on a whole word, followed by the ellipsis, within the maximum length.

#### Scenario: Text that fits
- **WHEN** the text "Hello world" is shortened to a maximum length of 20
- **THEN** the result is "Hello world"

#### Scenario: Cut at a word boundary
- **WHEN** the text "The quick brown fox" is shortened to a maximum length of 12
- **THEN** the result is "The quick…"

#### Scenario: First word too long
- **WHEN** the text "Supercalifragilistic word" is shortened to a maximum length of 8
- **THEN** the result is "Superca…"

#### Scenario: Trailing punctuation dropped
- **WHEN** the text "Hello, world and more" is shortened to a maximum length of 8
- **THEN** the result is "Hello…"

### Requirement: Ellipsis option
The system SHALL end a shortened result with "…" by default, and SHALL use the caller's ellipsis instead when one is given, including an empty one.

#### Scenario: Default ellipsis
- **WHEN** the text "one two three" is shortened to a maximum length of 9
- **THEN** the result is "one two…"

#### Scenario: Custom ellipsis
- **WHEN** the text "one two three" is shortened to a maximum length of 10 with the ellipsis "..."
- **THEN** the result is "one two..."

#### Scenario: No ellipsis
- **WHEN** the text "one two three" is shortened to a maximum length of 9 with an empty ellipsis
- **THEN** the result is "one two"

### Requirement: Whitespace normalisation
The system SHALL collapse every run of whitespace, including tabs and line breaks, into a single space and SHALL remove leading and trailing whitespace before measuring the text.

#### Scenario: Whitespace collapsed
- **WHEN** the text "  Hello \n\t world  " is shortened to a maximum length of 20
- **THEN** the result is "Hello world"

### Requirement: Length counted in characters
The system SHALL count the maximum length, including the ellipsis, in user-visible characters (Unicode code points), never splitting a character in two.

#### Scenario: Emoji count as one character
- **WHEN** the text "🙂🙂🙂 smile more" is shortened to a maximum length of 5
- **THEN** the result is "🙂🙂🙂…"

### Requirement: Input validation
The system SHALL reject a text that is not a string with a type error, and SHALL reject a maximum length that is not a non-negative integer or is shorter than the ellipsis with a range error.

#### Scenario: Text is not a string
- **WHEN** the number 42 is shortened to a maximum length of 10
- **THEN** a type error is raised

#### Scenario: Invalid maximum length
- **WHEN** the text "Hello" is shortened to a maximum length of -1, or of 1.5, or of 0 with the default ellipsis
- **THEN** a range error is raised
