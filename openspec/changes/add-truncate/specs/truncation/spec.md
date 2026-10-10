## Purpose

Shorten text to a length limit for previews, so every caller cuts text the same predictable way.

## ADDED Requirements

### Requirement: Short text unchanged
The system SHALL return the text unchanged, without an ellipsis, when its length does not exceed the limit.

#### Scenario: Fits already
- **WHEN** the text is "hello" and the limit is 10
- **THEN** the result is "hello"

#### Scenario: Exact length
- **WHEN** the text is "hello" and the limit is 5
- **THEN** the result is "hello"

### Requirement: Truncation with ellipsis
The system SHALL shorten longer text so that the result, including the ellipsis, is no longer than the limit, cutting at the last word boundary when the kept part has one and mid-word otherwise, with no whitespace before the ellipsis; the default ellipsis is "…".

#### Scenario: Cut at word boundary
- **WHEN** the text is "the quick brown fox" and the limit is 12
- **THEN** the result is "the quick…"

#### Scenario: Long single word
- **WHEN** the text is "supercalifragilistic" and the limit is 6
- **THEN** the result is "super…"

#### Scenario: Custom ellipsis
- **WHEN** the text is "the quick brown fox", the limit is 12 and the ellipsis is "..."
- **THEN** the result is "the quick..."

### Requirement: Limit validation
The system SHALL reject a limit that is not a whole number of at least 1 and at least the ellipsis length, with a RangeError.

#### Scenario: Invalid limit rejected
- **WHEN** the limit is 0, -1, 2.5 or NaN, or the limit is 2 with the ellipsis "..."
- **THEN** a RangeError is thrown
