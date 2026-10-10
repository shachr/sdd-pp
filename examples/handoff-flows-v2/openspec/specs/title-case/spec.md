# title-case Specification

## Purpose
TBD - created by archiving change add-title-case. Update Purpose after archive.

## Requirements

### Requirement: Words are capitalised
`toTitleCase(text)` SHALL return the text with the first letter of every word uppercased and the rest of the word lowercased, where words are separated by spaces.

#### Scenario: Lowercase words
- **WHEN** `toTitleCase("hello world")` is called
- **THEN** it returns `"Hello World"`

#### Scenario: Shouting is calmed
- **WHEN** `toTitleCase("hELLO WORLD")` is called
- **THEN** it returns `"Hello World"`

### Requirement: Minor words stay lowercase
The words a, an, and, at, by, for, in, of, on, or, the and to SHALL be lowercase, except when they are the first or the last word of the text.

#### Scenario: Minor words inside the title
- **WHEN** `toTitleCase("the LORD of the rings")` is called
- **THEN** it returns `"The Lord of the Rings"`

#### Scenario: Minor word at the end
- **WHEN** `toTitleCase("what are you looking at")` is called
- **THEN** it returns `"What Are You Looking At"`

### Requirement: Spacing is preserved
The result SHALL contain exactly the same spaces, in the same positions, as the input.

#### Scenario: Space runs are kept
- **WHEN** `toTitleCase("  big   deal ")` is called
- **THEN** it returns `"  Big   Deal "`

#### Scenario: Empty text
- **WHEN** `toTitleCase("")` is called
- **THEN** it returns `""`

### Requirement: Non-string input is rejected
`toTitleCase` SHALL throw a `TypeError` when `text` is not a string.

#### Scenario: Number input
- **WHEN** `toTitleCase(42)` is called
- **THEN** a `TypeError` is thrown
