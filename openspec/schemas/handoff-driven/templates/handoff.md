---
change: <change-id>
tool: <ai-hero | superpowers>
implementation_model: <exact-model-id>
harness: <claude-code | cursor | codex | opencode>
base_ref: <git rev-parse HEAD at handoff>
execution_dir: execution/
# reviewer_model: <optional; must differ from implementation_model>
---

# Handoff

## Source of truth

<!-- Links only. Never copy or paraphrase requirement text, scenarios or SHALL/MUST sentences. -->
- Proposal: [proposal.md](proposal.md)
- Spec deltas:
  - [specs/<capability>/spec.md](specs/<capability>/spec.md)

Design and implementation are owned by the execution tool (below); OpenSpec has no design step.
Implementation diff: `git diff <base_ref>...HEAD -- . ':!openspec'`

## Execution artifacts

<!-- Keep the rows for the chosen tool, delete the others. All paths are inside this change folder. -->
| Tool step | Writes to |
|-----------|-----------|
| ai-hero `grill-with-docs` (decisions answered on the user's behalf if delegated) | `execution/design.md`; glossary terms -> `GLOSSARY.md`, ADRs -> `docs/adr/` |
| ai-hero `to-tickets` (fed from the delta, not from to-spec) | `execution/tickets/NN-<slug>.md` |
| ai-hero `implement` + `tdd`, then `code-review` | code + tests; `execution/reviews/self-review.md` |
| superpowers `writing-plans` | `execution/plan-<change-id>.md` |
| superpowers `executing-plans` / `subagent-driven-development` ledger | `execution/progress.md` |
| `/adversarial-review` | `execution/reviews/<timestamp>-<reviewer-model>.md` |
| `/opsx:verify` report | `execution/verify.md` |

## Size check

- Requirements in deltas: <n> (budget 5)
- Tickets / plan tasks: <n> (budget 8)
- Split decision: <fits | slice k of n>

## Notes for the implementer

<!-- Constraints that are not requirements: branch name, commands to run, files to avoid. Optional. -->
