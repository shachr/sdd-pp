> Source of truth: [proposal](../proposal.md) · [specs/greeting/spec.md](../specs/greeting/spec.md) · [handoff](../handoff.md)

# Design: add-greeting-name (AI Hero `grill-with-docs` output)

## Grilling record

Round 1 (answers given on the user's behalf, recommended answers accepted):

- Q1 Where does the argv handling live - in `greet()` or in `cli.mjs`? -> `cli.mjs` passes `process.argv[2]`; `greet()` stays a pure function testable without a process.
- Q2 Where does whitespace handling live? -> inside `greet()`, so requirement "Blank name falls back to default" is implemented in one place.
- Q3 Which seams do we test? -> `greet()` unit tests for both requirements; one CLI test that spawns the script for the argv wiring.

No glossary terms or ADRs: nothing hard to reverse.

## Decisions

- `greet(name?)` gains one optional string parameter; `undefined`, empty and whitespace-only take the default branch (`name?.trim()` falsy).
- `cli.mjs` passes `process.argv[2]` and nothing else; extra arguments are ignored.
- No new modules, no dependencies. Prior art for tests: `test/greet.test.mjs` (node:test + assert/strict).
