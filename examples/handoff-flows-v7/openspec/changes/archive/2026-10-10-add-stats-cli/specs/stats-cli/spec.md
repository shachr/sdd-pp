## Purpose

Show a text's length facts from the terminal, for people and for scripts.

## ADDED Requirements

### Requirement: Stats command
The system SHALL provide a `textkit-stats` command that reads the file named by its argument, or standard input when there is none, prints "words: <n>", "sentences: <n>" and "reading time: <n> min" on separate lines, and exits with code 0.

#### Scenario: Stats summary
- **WHEN** the user runs `textkit-stats` with "Hi. How are you?" on standard input
- **THEN** the output is "words: 4", "sentences: 2" and "reading time: 1 min" on three lines and the exit code is 0

#### Scenario: Stats from a file
- **WHEN** the user runs `textkit-stats notes.txt` and notes.txt contains "Hi. How are you?"
- **THEN** the output is the same three lines and the exit code is 0

### Requirement: Stats JSON output
The system SHALL print the counts as one JSON object with the keys "words", "sentences" and "readingMinutes" when `textkit-stats` is given the `--json` option.

#### Scenario: JSON flag
- **WHEN** the user runs `textkit-stats --json` with "Hi. How are you?" on standard input
- **THEN** the output is {"words":4,"sentences":2,"readingMinutes":1} and the exit code is 0

### Requirement: Stats errors
The system SHALL print a usage message to standard error and exit with code 2 when `textkit-stats` is given an unknown option or a file it cannot read.

#### Scenario: Unknown option
- **WHEN** the user runs `textkit-stats --xml`
- **THEN** standard error shows the usage message and the exit code is 2

#### Scenario: Unreadable file
- **WHEN** the user runs `textkit-stats missing.txt` and the file does not exist
- **THEN** standard error names the file and shows the usage message, and the exit code is 2
