---
change: <change-id>
tool: <ai-hero | superpowers>
implementation_model: <exact-model-id>
harness: <claude-code | cursor | codex>
base_ref: <git rev-parse HEAD at handoff>
execution_dir: execution/
# reviewer_model: <optional; must differ from implementation_model>
---

# Handoff

## Source of truth

<!-- Links only. Never copy requirement text, scenarios or SHALL/MUST sentences. -->
- Proposal: [proposal.md](proposal.md)
- Design: [design.md](design.md) <!-- or "skipped (conditional; not needed)" -->
- Spec deltas:
  - [specs/<capability>/spec.md](specs/<capability>/spec.md)

## Execution artifacts

<!-- Keep the rows for the chosen tool, delete the others. All paths are inside this change folder. -->
| Tool step | Writes to |
|-----------|-----------|
| ai-hero `to-spec` | `execution/spec.md` |
| ai-hero `to-tickets` | `execution/tickets/NN-<slug>.md` |
| superpowers `writing-plans` | `execution/plan.md` |
| superpowers `subagent-driven-development` / `executing-plans` ledger | `execution/progress.md` |
| `/adversarial-review` | `execution/reviews/<timestamp>-<reviewer-model>.md` |

## Size check

- Requirements in deltas: <n> (budget 5)
- Tickets / plan tasks: <n> (budget 8)
- Split decision: <fits | slice k of n>

## Notes for the implementer

<!-- Constraints that are not requirements: branch name, commands to run, files to avoid. Optional. -->
