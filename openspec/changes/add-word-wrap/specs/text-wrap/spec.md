# Spec Delta

## Purpose

Lets callers lay text out in lines of a maximum width for fixed-width output such as terminals and plain-text messages.

## ADDED Requirements

### Requirement: Wrap at word boundaries
The library SHALL break text into lines of at most the requested line width (default 80), breaking only between words and joining lines with a line break.

#### Scenario: Short text unchanged
- **WHEN** `wordWrap("hello world", 20)` is called
- **THEN** it returns `"hello world"`

#### Scenario: Wraps at the width
- **WHEN** `wordWrap("the quick brown fox", 10)` is called
- **THEN** it returns `"the quick\nbrown fox"`

#### Scenario: Default width
- **WHEN** `wordWrap` is called without a width on text of 100 one-letter words separated by single spaces
- **THEN** every returned line is at most 80 characters long and the first line is 79 characters long

#### Scenario: Spaces collapsed
- **WHEN** `wordWrap("  a \t  b  ", 10)` is called
- **THEN** it returns `"a b"`

### Requirement: Long words broken
The library SHALL cut a word longer than the line width into pieces of at most the line width, so no returned line is longer than the width.

#### Scenario: Word longer than the width
- **WHEN** `wordWrap("abcdefghij xy", 4)` is called
- **THEN** it returns `"abcd\nefgh\nij\nxy"`

### Requirement: Paragraphs kept
The library SHALL wrap each line of the input on its own and keep the input's line breaks, including empty lines.

#### Scenario: Paragraphs wrapped separately
- **WHEN** `wordWrap("aa bb\n\ncc dd", 5)` is called
- **THEN** it returns `"aa bb\n\ncc dd"`

#### Scenario: Empty text
- **WHEN** `wordWrap("", 10)` is called
- **THEN** it returns `""`

### Requirement: Input checked
The library SHALL reject text that is not a string with a TypeError and a width that is not a positive integer with a RangeError.

#### Scenario: Text is not a string
- **WHEN** `wordWrap(42, 10)` is called
- **THEN** it throws a TypeError

#### Scenario: Width is not a positive integer
- **WHEN** `wordWrap("a b", 0)` or `wordWrap("a b", 2.5)` is called
- **THEN** it throws a RangeError
