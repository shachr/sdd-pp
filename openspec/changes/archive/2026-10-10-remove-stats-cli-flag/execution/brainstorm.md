---
tool: superpowers
session: brainstorming
---

> Source of truth: [proposal](../proposal.md) · specs: ../specs/<capability>/spec.md

# brainstorming session: remove-stats-cli-flag

> Parent session (shared, read first): [../add-text-stats-cli/execution/grill.md](../../add-text-stats-cli/execution/grill.md) · delta: [specs/stats-cli/spec.md](../specs/stats-cli/spec.md)

Narrowed session for the cleanup slice `remove-stats-cli-flag` of the split change [add-text-stats-cli](../../add-text-stats-cli/slices.md), run with Superpowers `brainstorming`, limited to this slice. add-stats-cli left the flag as `STATS_FLAG` / `visible()` in `src/cli.mjs` and the "Flag off" / "Flag on" tests in `test/cli-stats.test.mjs`. Decisions were delegated: every answer is **Grok Bot's call on the user's behalf**.

## Conversation record

- First message: delegated - "release `textkit stats`: remove the dark-launch gate".
- Q: What goes? -> `STATS_FLAG`, `visible()`, `commandNames()` (usage lists every command again), the flag tests, and the `ON` env in the remaining stats tests. (Grok Bot's call)
- Q: Keep a test that `stats` now works without the variable? -> yes, the "Stats summary" test runs without env; plus the usage lists `stats`. (Grok Bot's call)
- Q: The proposal listed `stats-cli` as a new capability (written at split time) - correct it? -> yes, it is modified now (add-stats-cli created it). (Grok Bot's call)
- Approaches: only one sensible one (delete the gate). (Grok Bot's call)

## Written design

### Intent and why
The stats sub-command is released. Behaviour: the [delta](../specs/stats-cli/spec.md) removes "Requirement: Stats command flag".

### Goals
- No trace of the gate in code or tests.

### Non-goals
- No change to the stats output.

### Decided how
- Delete the flag helpers in `src/cli.mjs` and use `Object.keys(COMMANDS)` again; drop the flag tests; remove `env: ON`.

### Left to the builder
- Nothing else.

## Scenarios found

Names only - this slice removes one requirement; no new scenarios.

## Builder check result

Skipped - one-requirement removal with a single obvious approach; the brainstorming skill's builder check was not run for this slice (time; recorded as a deviation).

## Approval

Written design approved by Grok Bot on the user's behalf (decisions delegated).
