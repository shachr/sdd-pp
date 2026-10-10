## Purpose

Measure a text - words, sentences and reading time - so callers can show length facts consistently.

## ADDED Requirements

### Requirement: Word count
The system SHALL count as a word every whitespace-separated run of characters that contains at least one letter or digit.

#### Scenario: Words in a sentence
- **WHEN** the text is "Hello, big   world - again"
- **THEN** the word count is 4

#### Scenario: Whitespace only
- **WHEN** the text is empty or contains only whitespace
- **THEN** the word count is 0

### Requirement: Sentence count
The system SHALL count a sentence for every run of text that ends in ".", "!" or "?", plus one for trailing text with at least one word and no terminal punctuation.

#### Scenario: Sentences ending in punctuation
- **WHEN** the text is "Hi. How are you? Great!"
- **THEN** the sentence count is 3

#### Scenario: No terminal punctuation
- **WHEN** the text is "One. two words"
- **THEN** the sentence count is 2

### Requirement: Reading time estimate
The system SHALL estimate the reading time in whole minutes as the word count divided by 200, rounded up.

#### Scenario: Short text reads in one minute
- **WHEN** the text has 1 to 200 words
- **THEN** the reading time is 1 minute
