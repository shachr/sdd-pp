# case-conversion Specification

## Purpose

Converts identifiers and short phrases between naming styles (snake_case, kebab-case, camelCase) using one shared, predictable notion of where words start and end.

## Requirements

### Requirement: Word splitting
The case converters SHALL split their input into words the same way: any run of characters that are not letters or digits separates words and is dropped; a lower-case letter or digit followed by an upper-case letter starts a new word; in a run of upper-case letters followed by a lower-case letter, the last upper-case letter starts a new word. A letter followed by a digit SHALL NOT start a new word. Letters outside ASCII SHALL count as letters.

#### Scenario: Separators split words
- **WHEN** `snakeCase("user id-number.v")` is called
- **THEN** it returns `"user_id_number_v"`

#### Scenario: Lower-to-upper boundary
- **WHEN** `kebabCase("userId")` is called
- **THEN** it returns `"user-id"`

#### Scenario: Acronym kept as one word
- **WHEN** `snakeCase("XMLHttpRequest")` is called
- **THEN** it returns `"xml_http_request"`

#### Scenario: Digits stay with their word
- **WHEN** `snakeCase("version2Beta")` is called
- **THEN** it returns `"version2_beta"`

#### Scenario: Non-ASCII letters kept
- **WHEN** `kebabCase("caféCrème au lait")` is called
- **THEN** it returns `"café-crème-au-lait"`

### Requirement: snake_case conversion
`snakeCase(text)` SHALL return the words in lower case joined by `_`.

#### Scenario: snake_case output
- **WHEN** `snakeCase("Hello World")` is called
- **THEN** it returns `"hello_world"`

### Requirement: kebab-case conversion
`kebabCase(text)` SHALL return the words in lower case joined by `-`.

#### Scenario: kebab-case output
- **WHEN** `kebabCase("user_id")` is called
- **THEN** it returns `"user-id"`

### Requirement: camelCase conversion
`camelCase(text)` SHALL return the first word in lower case followed by each remaining word with its first letter in upper case and the rest in lower case, with no separator; acronyms are treated as ordinary words.

#### Scenario: camelCase output
- **WHEN** `camelCase("XML http_request")` is called
- **THEN** it returns `"xmlHttpRequest"`

#### Scenario: Already converted input unchanged
- **WHEN** `camelCase("userId")`, `snakeCase("user_id")` and `kebabCase("user-id")` are called
- **THEN** they return `"userId"`, `"user_id"` and `"user-id"`

### Requirement: Input handling
The case converters SHALL return an empty string for input with no letters or digits and SHALL reject input that is not a string.

#### Scenario: Empty or separator-only input
- **WHEN** `snakeCase("")`, `kebabCase("--")` or `camelCase(" _ ")` is called
- **THEN** each returns `""`

#### Scenario: Text is not a string
- **WHEN** `camelCase(42)` is called
- **THEN** it throws a `TypeError`
