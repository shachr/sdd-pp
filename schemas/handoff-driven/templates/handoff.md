---
change: <change-id>
tool: <ai-hero | superpowers>
harness: <claude-code | cursor | codex | opencode>
base_ref: <git rev-parse HEAD at handoff>
execution_dir: execution/
apply_mode: <implement | implement-spec | executing-plans | subagent-driven-development>
---

# Handoff

## Source of truth

<!-- Links only. Never copy or reword requirement text, scenarios or SHALL/MUST sentences. -->
- Proposal: [proposal.md](proposal.md)
- Spec deltas:
  - [specs/<capability>/spec.md](specs/<capability>/spec.md)
- Design session (proposal phase): [execution/grill.md](execution/grill.md) | [execution/brainstorm.md](execution/brainstorm.md)

Design and implementation are owned by the execution tool (below); OpenSpec has no design step.
Implementation diff: `git diff <base_ref>...HEAD -- . ':!openspec'`

## Execution artifacts

<!-- Keep the rows for the chosen tool, delete the others. All paths are inside this change folder. -->
| Tool step | Writes to |
|-----------|-----------|
| ai-hero `grill-with-docs` (proposal phase, before handoff) | `execution/grill.md`; glossary terms -> `GLOSSARY.md`, ADRs -> `docs/adr/` |
| ai-hero `to-spec` (reads `execution/grill.md`; user-facing sections link the proposal/delta) | `execution/spec.md` |
| ai-hero `to-tickets` (scenarios cited by name) | `execution/tickets/NN-<slug>.md` |
| `/spec-check` (end of planning) | `execution/spec-check.md` |
| ai-hero `implement` / `implement-spec` (apply_mode) + `tdd`, then `code-review` | code + tests; review notes, if any, in `execution/reviews/` |
| superpowers `brainstorming` (proposal phase; stopped before writing-plans) | `execution/brainstorm.md` |
| superpowers `writing-plans` (reads `execution/brainstorm.md`) | `execution/plan-<change-id>.md` |
| `/spec-check` (end of planning) | `execution/spec-check.md` |
| superpowers `executing-plans` / `subagent-driven-development` (apply_mode) ledger | `execution/progress.md` |
| superpowers `requesting-code-review` (final review) | review notes, if any, in `execution/reviews/` |
| `/opsx:verify` report | `execution/verify.md` |

## Size check

- Requirements in deltas: <n> (budget 5)
- Tickets / plan tasks: <n> (budget 8)
- Split decision: <fits | slice k of n>

## Notes for the implementer

<!-- Constraints that are not requirements: branch name, commands to run, files to avoid. Optional. -->
