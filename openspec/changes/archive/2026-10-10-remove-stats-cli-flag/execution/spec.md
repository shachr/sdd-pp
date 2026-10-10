> Source of truth: [proposal](../proposal.md) · [spec delta](../specs/stats-cli/spec.md) · [grill session](grill.md)

Status: ready-for-agent

## Problem Statement

See [proposal.md](../proposal.md) - "Why".

## Solution

Release `textkit stats`: remove the stats-cli flag as the [delta](../specs/stats-cli/spec.md) says ("Requirement: Stats command flag", REMOVED).

## User Stories

1. As a terminal user, I want `textkit stats` without setting an environment variable, so that the released command just works - [delta](../specs/stats-cli/spec.md) "Requirement: Stats command flag" (removed).

## Implementation Decisions

- Delete `availableCommands` and the flag check in `src/cli.mjs`; the command table is the list of commands (grill Q2).
- Tests stop setting TEXTKIT_STATS_CLI; the flag tests are deleted; a test pins that stats works with an empty environment (grill Q2, Q3).

## Testing Decisions

- Existing scenario tests of the archived stats-cli spec keep passing with no environment variable.

## Out of Scope

- Any change to the stats output.
