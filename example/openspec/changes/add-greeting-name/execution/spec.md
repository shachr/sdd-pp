# Execution spec: add-greeting-name

> Source of truth: [proposal](../proposal.md) · [specs/greeting/spec.md](../specs/greeting/spec.md) · [design](../design.md) · [handoff](../handoff.md)
> Written by AI Hero `to-spec` (redirected here by `openspec-handoff-ai-hero`). Requirements are linked, never restated.

## Problem Statement

See [proposal - Why](../proposal.md#why).

## Solution

See [proposal - What Changes](../proposal.md#what-changes).

## Requirement map

- Requirement "Greeting by name" ([delta](../specs/greeting/spec.md)) - seam: `greet(name)` unit tests; CLI smoke test for argv wiring.
- Requirement "Blank name falls back to default" ([delta](../specs/greeting/spec.md)) - seam: `greet(name)` unit tests.
- Existing requirement "Default greeting" ([main spec](../../../specs/greeting/spec.md)) - regression: existing test stays green.

## Implementation Decisions

- `greet(name)` gains one optional string parameter; `undefined`, empty and whitespace-only all take the default branch (`name?.trim()` falsy).
- `cli.mjs` passes `process.argv[2]` and nothing else; extra arguments are ignored (design Non-Goal).
- No new modules, no dependencies.

## Testing Decisions

- Test external behavior only: return values of `greet()` and stdout of `cli.mjs`.
- `greet()` is the highest seam that covers both requirements without a process; one CLI test spawns `node src/cli.mjs Ada` to cover argv wiring.
- Prior art: `test/greet.test.mjs` (node:test + assert/strict).

## Out of Scope

See [design - Non-Goals](../design.md#goals--non-goals).
