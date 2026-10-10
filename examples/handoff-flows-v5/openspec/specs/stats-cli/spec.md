# stats-cli Specification

## Purpose
Show a text's length facts from the terminal, for people and for scripts.

## Requirements

### Requirement: Stats command
The system SHALL provide a `textkit stats` command that reads standard input and prints "words: <n>" and "sentences: <n>" on separate lines, and exits with code 0; any argument other than the `--json` option is a usage error (usage on standard error, exit code 2).

#### Scenario: Stats summary
- **WHEN** the user runs `textkit stats` with "Hi. How are you?" on standard input
- **THEN** the output is "words: 4" and "sentences: 2" on two lines and the exit code is 0

#### Scenario: Unknown stats option
- **WHEN** the user runs `textkit stats --xml`
- **THEN** standard error contains "stats: unknown option: --xml" and the usage, and the exit code is 2

### Requirement: Stats JSON output
The system SHALL print the counts as one JSON object with the keys "words" and "sentences" when `textkit stats` is given the `--json` option.

#### Scenario: JSON flag
- **WHEN** the user runs `textkit stats --json` with "Hi. How are you?" on standard input
- **THEN** the output is {"words":4,"sentences":2} and the exit code is 0
