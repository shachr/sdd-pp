---
change: add-camel-case
tool: superpowers
implementation_model: grok-bot
harness: opencode
base_ref: 0f59559014594fc3f7429f333de978034bcc7aa1
execution_dir: execution/
apply_mode: executing-plans
---

# Handoff

## Source of truth

- Proposal: [proposal.md](proposal.md)
- Spec deltas:
  - [specs/casing/spec.md](specs/casing/spec.md)
- Design session (proposal phase): [execution/brainstorm.md](execution/brainstorm.md)

Design and implementation are owned by the execution tool (below); OpenSpec has no design step.
Implementation diff: `git diff <base_ref>...HEAD -- . ':!openspec'`

## Execution artifacts

| Tool step | Writes to |
|-----------|-----------|
| superpowers `brainstorming` (proposal phase; stopped before writing-plans) | `execution/brainstorm.md` |
| superpowers `writing-plans` (reads `execution/brainstorm.md`) | `execution/plan-add-camel-case.md` |
| `/spec-check` (end of planning) | `execution/spec-check.md` |
| superpowers `executing-plans` (apply_mode) ledger | `execution/progress.md` |
| superpowers `requesting-code-review` (final review) | `execution/reviews/code-review.md` |
| `/opsx:verify` report | `execution/verify.md` |

## Size check

- Requirements in deltas: 3 (budget 5)
- Tickets / plan tasks: 2 expected (budget 8)
- Split decision: fits

## Notes for the implementer

- Branch `change/add-camel-case`; finish with finishing-a-development-branch option 1 (merge locally). Nothing is pushed.
- Code review runs in a fresh context with the local Ollama reviewer (qwen3:4b-instruct).
