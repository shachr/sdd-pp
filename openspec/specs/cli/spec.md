# cli Specification

## Purpose
Use textkit from the terminal through one `textkit` command with sub-commands and predictable errors.

## Requirements

### Requirement: Slugify command
The system SHALL provide a `textkit slugify` command that prints the slug of its text argument, or of standard input when no argument is given, followed by a newline, and exits with code 0.

#### Scenario: Slugify argument
- **WHEN** the user runs `textkit slugify "Hello World!"`
- **THEN** the output is "hello-world" and the exit code is 0

#### Scenario: Slugify from stdin
- **WHEN** the user runs `textkit slugify` with "Café au lait" on standard input
- **THEN** the output is "cafe-au-lait" and the exit code is 0

### Requirement: Usage errors
The system SHALL print a usage message to standard error and exit with code 2 when the command is unknown or missing.

#### Scenario: Unknown command
- **WHEN** the user runs `textkit frobnicate`
- **THEN** standard error contains "unknown command: frobnicate" and the usage, and the exit code is 2

#### Scenario: Missing argument
- **WHEN** the user runs `textkit` with no command
- **THEN** standard error contains the usage and the exit code is 2
