# casing Specification

## Purpose
Convert free-text phrases into case-styled identifiers consistently across apps.

## Requirements

### Requirement: Word splitting
The system SHALL treat every run of characters that are not letters, digits or combining marks, in any script, as a word separator, so that a letter written with a separate combining accent stays one word.

#### Scenario: Mixed separators
- **WHEN** the text is "hello-world_foo  bar!"
- **THEN** the camelCase result is "helloWorldFooBar"

#### Scenario: Decomposed accents
- **WHEN** the text is "élan vital" written with a separate combining accent (Unicode NFD)
- **THEN** the camelCase result is "élanVital" in the same decomposed form

### Requirement: Word casing
The system SHALL lower-case the first word entirely and, for every later word, upper-case its first character and lower-case the rest, joining the words with nothing between them.

#### Scenario: Shouting input
- **WHEN** the text is "HELLO WORLD"
- **THEN** the camelCase result is "helloWorld"

#### Scenario: Unicode letters
- **WHEN** the text is "élan vital"
- **THEN** the camelCase result is "élanVital"

### Requirement: Empty result
The system SHALL return an empty string when the text contains no letters or digits.

#### Scenario: Nothing to convert
- **WHEN** the text is "  --  "
- **THEN** the camelCase result is ""
