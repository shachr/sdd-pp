# initials Specification

## Purpose
Derive the initials of a person's display name, for avatar placeholders and other compact labels.

## Requirements

### Requirement: Initials from name parts
The system SHALL return the first letter of every name part, uppercased and joined without separators, where name parts are separated by whitespace or hyphens.

#### Scenario: Two-part name
- **WHEN** the name is "Ada Lovelace"
- **THEN** the initials are "AL"

#### Scenario: Hyphenated name
- **WHEN** the name is "Jean-Luc Picard"
- **THEN** the initials are "JLP"

#### Scenario: Lowercase input
- **WHEN** the name is "grace  hopper"
- **THEN** the initials are "GH"

#### Scenario: Accented initial
- **WHEN** the name is "émile zola"
- **THEN** the initials are "ÉZ"

### Requirement: Letters only
The system SHALL take each part's initial from its first letter in any script, skipping any characters before it, and SHALL ignore parts that contain no letter.

#### Scenario: Leading punctuation
- **WHEN** the name is "Mary (Bob) 'Smith"
- **THEN** the initials are "MBS"

#### Scenario: Part without letters
- **WHEN** the name is "Louis 14 Bourbon"
- **THEN** the initials are "LB"

### Requirement: Blank name
The system SHALL return an empty string when the name contains no letters.

#### Scenario: Blank name
- **WHEN** the name is "", "   " or "-- 42"
- **THEN** the initials are ""
