---
change: add-title-case
tool: superpowers
implementation_model: grok-bot
harness: grok-bot (agent on the shared box, following SKILL.md files as written)
base_ref: ad1db2b9023576f60db3f46c524f6e3c86fc4e42
execution_dir: execution/
reviewer_model: qwen3:4b-instruct
---

# Handoff

## Source of truth

- Proposal: [proposal.md](proposal.md)
- Spec deltas:
  - [specs/title-case/spec.md](specs/title-case/spec.md) - new capability, four ADDED requirements

Design and implementation are owned by the execution tool (below); OpenSpec has no design step.
Implementation diff: `git diff ad1db2b...HEAD -- . ':!openspec'`

## Execution artifacts

| Tool step | Writes to |
|-----------|-----------|
| superpowers `brainstorming` (written design; intent/goals link the proposal; answers on the user's behalf - user delegated) | `execution/design.md` |
| superpowers `writing-plans` | `execution/plan-add-title-case.md` |
| superpowers `executing-plans` ledger (SDD workspace `.superpowers/sdd/plan-add-title-case/`) | `execution/progress.md` |
| `/adversarial-review` | `execution/reviews/<timestamp>-<reviewer-model>.md` |
| `/opsx:verify` report | `execution/verify.md` |

## Size check

- Requirements in deltas: 4 (budget 5)
- Tickets / plan tasks: 3 (budget 8)
- Split decision: fits

## Notes for the implementer

- reviewer_model is the local Ollama model (qwen family, different from grok-bot).
- No subagent tool in this harness: executing-plans (inline) rather than subagent-driven-development.
