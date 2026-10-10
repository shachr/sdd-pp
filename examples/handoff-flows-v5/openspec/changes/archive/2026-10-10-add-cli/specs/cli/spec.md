## Purpose

Use textkit from the terminal through one `textkit` command with sub-commands and predictable errors.

## ADDED Requirements

### Requirement: Slugify command
The system SHALL provide a `textkit slugify` command that prints the slug of its text argument followed by a newline, and exits with code 0.

#### Scenario: Slugify argument
- **WHEN** the user runs `textkit slugify "Hello World!"`
- **THEN** the output is "hello-world" and the exit code is 0

### Requirement: Command errors
The system SHALL print a usage message to standard error and exit with code 2 when the command is unknown or missing, or when a command is missing its argument.

#### Scenario: Unknown command
- **WHEN** the user runs `textkit frobnicate`
- **THEN** standard error contains "unknown command: frobnicate" and the usage, and the exit code is 2

#### Scenario: Missing argument
- **WHEN** the user runs `textkit` with no command, or `textkit slugify` with no text
- **THEN** standard error contains the usage and the exit code is 2
