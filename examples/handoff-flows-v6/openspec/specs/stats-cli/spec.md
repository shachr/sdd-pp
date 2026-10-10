# stats-cli Specification

## Purpose
Show a text's length facts from the terminal, for people and for scripts.

## Requirements

### Requirement: Stats command
The system SHALL provide a `textkit stats` command that reads standard input and prints "words: <n>", "sentences: <n>" and "reading time: <n> min" on separate lines, and exits with code 0.

#### Scenario: Stats summary
- **WHEN** the user runs `textkit stats` with "Hi. How are you?" on standard input
- **THEN** the output is "words: 4", "sentences: 2" and "reading time: 1 min" on three lines and the exit code is 0

### Requirement: Stats JSON output
The system SHALL print the counts as one JSON object with the keys "words", "sentences" and "readingMinutes" when `textkit stats` is given the `--json` option.

#### Scenario: JSON flag
- **WHEN** the user runs `textkit stats --json` with "Hi. How are you?" on standard input
- **THEN** the output is {"words":4,"sentences":2,"readingMinutes":1} and the exit code is 0
