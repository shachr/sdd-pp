---
description: Check the execution tool's design output (to-spec + tickets, or the plan) against the OpenSpec proposal + delta specs
argument-hint: <change-id>
allowed-tools: Bash(openspec:*), Bash(node .openspec-handoff/scripts/*)
---

Arguments: $ARGUMENTS

Check that the execution tool's design output covers an OpenSpec change (handoff-driven schema): every delta requirement and scenario is planned, nothing is planned without a source, nothing contradicts the delta.

1. Pick the change: the id given, else the single active change from `openspec list --json` (ask if several).
2. Run `node .openspec-handoff/scripts/spec-check.mjs <change-id> --write`. It reads `proposal.md`, the delta specs and the tool's planning output (AI Hero: `execution/spec.md` user stories + `execution/tickets/`; Superpowers: `execution/plan-<change-id>.md` tasks), and writes `execution/spec-check.md` with the coverage table and the mechanical findings: **Missing** (requirement no unit names / scenario no unit mentions), **Unknown references** (names a requirement or scenario that is not in the delta), **Added without source** (a story / ticket / task that names no delta requirement).
3. Contradictions (your judgement): read `proposal.md`, every delta and each unit the report lists. For each unit, compare what it plans with the requirement(s) and scenarios it names: different values, a different error type, a dropped branch, or work the proposal puts out of scope. Replace the comment under `### Contradictions (agent review)` in `execution/spec-check.md` with one bullet per contradiction (`<file>:<line> <unit> vs "Requirement: <name>" / Scenario "<name>": <what differs>`) or `- none`. If you found any, change the `### Result` line to `GAPS: ...` as well.
4. Size re-estimate (warn-only): every ticket / plan task should carry an `Estimate: ~N lines` line (code + tests). The report's "Size" section totals them against the ~300-line budget; over it, suggest re-splitting with `/split-check <change-id>` (new slices join the same parent) before implementation. It never blocks.
5. Show the report. On **GAPS**: stop. Fix the design output (cite the requirement by name; drop unsourced work) - or, if the design found real missing behaviour, update the delta first (`openspec validate <change-id> --strict`), rerun the tool's planning command (it rewrites its files - see "Updating tool files" in the wrapper skill), then run /spec-check again. On **PASS**: planning is done; the engineer starts implementation with the tool's own command recorded as `apply_mode` in `handoff.md`.

Do not restate requirement text in the report; name requirements and scenarios.
