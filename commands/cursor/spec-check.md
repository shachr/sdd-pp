---
name: /spec-check
id: spec-check
category: Workflow
description: "Check the execution tool's design output against the OpenSpec proposal + delta specs (usage: /spec-check <change-id>)"
---

Arguments: <change-id> as given after the command.

Check the execution tool's design output against an OpenSpec change (handoff-driven schema). This is the only plan-vs-spec check: every delta requirement and scenario is planned, nothing is planned without a source or against the delta, and the plan cites requirements by name instead of restating them.

1. Pick the change: the id given, else the single active change from `openspec list --json` (ask if several).
2. Run `node .openspec-handoff/scripts/spec-check.mjs <change-id> --write`. It reads `proposal.md`, the delta specs and the tool's planning output (AI Hero: `execution/spec.md` user stories + `execution/tickets/`; Superpowers: `execution/plan-<change-id>.md` tasks), and writes `execution/spec-check.md` with the coverage table and the mechanical findings: **Missing** (requirement no unit names / scenario no unit mentions), **Unknown references** (a unit names a requirement or scenario that is not in the delta), **Added without source** (a story / ticket / task that names no delta requirement). It also lists **Spec changes since the last check**: requirements / scenarios added, changed, removed or renamed since the hashes recorded in `execution/.spec-check.json`, each with the stories / tickets / plan tasks citing it (report-only; never a gap by itself; the baseline moves when the mechanical checks pass).
3. Agent review (your judgement): read `proposal.md`, every delta and each unit the report lists. Replace the comment under `### Agent review` in `execution/spec-check.md` with these four lists, one bullet per finding (`<file>:<line> <unit> vs "Requirement: <name>" / Scenario "<name>": <what>`) or `- none`:
   - **Missing**: behaviour a requirement or scenario needs that the unit naming it does not plan (a dropped branch, error case or value).
   - **Invented**: behaviour a unit plans that no requirement or scenario asks for, or work the proposal puts out of scope.
   - **Contradicted**: a unit plans different behaviour from the requirement it names (different values, a different error type, a different order).
   - **Restated (advisory)**: a unit that restates requirement or scenario text instead of citing it by name - suggest the citation. Never changes the result.
4. Set the `### Result` line. The script writes `GAPS: ...` when a mechanical check failed, otherwise `PENDING: ...`. Replace PENDING: Missing, Invented and Contradicted all `- none` -> write exactly `PASS`; any finding there -> `GAPS: <n> agent finding(s)`. A mechanical GAPS line stays GAPS. Never leave PENDING in the saved report.
5. Line estimate after planning (warn-only; the ~300-line budget is checked only here - the split gate counts requirements and capabilities): every ticket / plan task should carry an `Estimate: ~N lines` line (code + tests). The report's "Size" section totals them against the budget; over it, suggest re-splitting with `/split-check <change-id>` (new slices join the same parent) before implementation. It never blocks.
6. Spec changes: if the section lists any, tell the engineer which units to adapt - re-run the tool's planning for the open ones; never overwrite a done ticket / finished task (plan new work for what changed instead). Do not edit the tool's files yourself unless asked.
7. Show the report. On **GAPS**: stop. Fix the design output (cite the requirement by name; drop unsourced or invented work; fix contradictions) - or, if the design found real missing behaviour, update the delta first (`openspec validate <change-id> --strict`), rerun the tool's planning command (it rewrites its files - see "Updating tool files" in the wrapper skill), then run /spec-check again. On **PASS**: planning is done; the engineer starts implementation with the tool's own command recorded as `apply_mode` in `handoff.md`.

Do not restate requirement text in the report; name requirements and scenarios.
