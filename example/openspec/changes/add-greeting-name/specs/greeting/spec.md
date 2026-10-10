# Spec Delta

## ADDED Requirements

### Requirement: Greeting by name
When the `greet` command receives a name argument it SHALL print `Hello, <name>!` with surrounding whitespace removed from the name, followed by a newline, and exit with status 0.

#### Scenario: Name given
- **WHEN** the user runs `greet Ada`
- **THEN** the output is `Hello, Ada!`

#### Scenario: Name with surrounding spaces
- **WHEN** the user runs `greet "  Ada  "`
- **THEN** the output is `Hello, Ada!`

### Requirement: Blank name falls back to default
When the name argument is empty or only whitespace the `greet` command SHALL print the default greeting `Hello, World!`.

#### Scenario: Whitespace-only name
- **WHEN** the user runs `greet "   "`
- **THEN** the output is `Hello, World!`
