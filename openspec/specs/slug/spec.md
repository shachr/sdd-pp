# slug Specification

## Purpose

Turns arbitrary text into URL-safe slugs so titles can be used in links and file names.

## Requirements

### Requirement: Slug format
`slugify(text)` SHALL return lowercase ASCII letters and digits separated by single dashes, with no leading or trailing dash.

#### Scenario: Words with spaces
- **WHEN** `slugify("Hello World")` is called
- **THEN** it returns `hello-world`

#### Scenario: Accents and punctuation
- **WHEN** `slugify("Crème brûlée!")` is called
- **THEN** it returns `creme-brulee`
