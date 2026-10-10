# greeting Specification

## Purpose

The greeter prints a friendly greeting on the command line so users can check the tool is installed.

## Requirements

### Requirement: Default greeting
The `greet` command SHALL print `Hello, World!` followed by a newline and exit with status 0.

#### Scenario: Run without arguments
- **WHEN** the user runs `greet`
- **THEN** the output is `Hello, World!`
- **AND** the exit status is 0
