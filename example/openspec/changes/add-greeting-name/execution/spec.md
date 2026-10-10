> Source of truth: [proposal](../proposal.md) · [spec delta](../specs/greeting/spec.md) · [grill session](grill.md)

# Spec: add-greeting-name (AI Hero `to-spec` output)

**Status:** ready-for-agent

## Problem Statement

See [proposal - Why](../proposal.md#why).

## Solution

See [proposal - What Changes](../proposal.md#what-changes); behaviour is the [greeting delta](../specs/greeting/spec.md).

## User Stories

1. As a CLI user, I get greeted by name - [delta](../specs/greeting/spec.md) "Requirement: Greeting by name" (scenarios "Name given", "Name with surrounding spaces").
2. As a CLI user who passes a blank name, I still get a greeting - [delta](../specs/greeting/spec.md) "Requirement: Blank name falls back to default" (scenario "Whitespace-only name").

## Implementation Decisions

- `greet()` gains an optional name parameter; the CLI only forwards argv (see [grill session](grill.md)).

## Testing Decisions

- Test at the `greet()` seam plus one CLI test through `node:test`, one test per scenario, named after it.

## Out of Scope

See [proposal](../proposal.md).
