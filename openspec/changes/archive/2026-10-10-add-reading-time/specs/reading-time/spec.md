## Purpose

Estimate how long a text takes to read, in whole minutes, so callers can show a consistent "N min read" label.

## ADDED Requirements

### Requirement: Reading time estimate
The system SHALL estimate reading time as the number of words divided by the reading speed in words per minute, rounded up to a whole number of minutes, using 200 words per minute when the caller gives no speed.

#### Scenario: Default reading speed
- **WHEN** the text has 400 words and no reading speed is given
- **THEN** the estimate is 2 minutes

#### Scenario: Partial minute rounds up
- **WHEN** the text has 201 words and no reading speed is given
- **THEN** the estimate is 2 minutes

#### Scenario: Custom reading speed
- **WHEN** the text has 300 words and the reading speed is 100 words per minute
- **THEN** the estimate is 3 minutes

#### Scenario: Empty text
- **WHEN** the text is empty or contains only whitespace
- **THEN** the estimate is 0 minutes

### Requirement: Word counting
The system SHALL count as a word every whitespace-separated run of characters that contains at least one letter or digit, in any script.

#### Scenario: Punctuation-only tokens ignored
- **WHEN** the text is "wait — what ... ok"
- **THEN** 3 words are counted

#### Scenario: Mixed whitespace
- **WHEN** words are separated by tabs, newlines and repeated spaces, as in "café\tnaïve\n\n  über"
- **THEN** 3 words are counted

### Requirement: Reading speed validation
The system SHALL reject a reading speed that is not a finite number greater than zero with a RangeError.

#### Scenario: Invalid speed rejected
- **WHEN** the reading speed is 0, -5, NaN or Infinity
- **THEN** a RangeError is thrown
