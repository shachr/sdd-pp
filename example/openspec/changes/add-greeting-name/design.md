# Design

## Context

See [proposal.md](proposal.md) - Why. `greet()` is a pure function; `cli.mjs` only prints its result.

## Goals / Non-Goals

**Goals:** keep `greet()` pure and testable without spawning a process.

**Non-Goals:** flags, localisation, multiple names (extra arguments are ignored).

## Decisions

- `greet(name?)` takes an optional string; the CLI passes `process.argv[2]`. Alternative (parsing in `greet`) rejected: it would couple the function to argv.
- Trim inside `greet()`, so the blank-name rule lives in one place.

## Risks / Trade-offs

- [Extra arguments silently ignored] → documented as a non-goal; revisit if users ask.
