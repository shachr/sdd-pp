## Purpose

Convert free-text phrases into case-styled identifiers consistently across apps.

## ADDED Requirements

### Requirement: Word splitting
The system SHALL treat every run of characters that are not letters or digits, in any script, as a word separator.

#### Scenario: Mixed separators
- **WHEN** the text is "hello-world_foo  bar!"
- **THEN** the camelCase result is "helloWorldFooBar"

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
