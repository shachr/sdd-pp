---
change: remove-stats-cli-flag
tool: ai-hero
implementation_model: grok-bot
harness: opencode
base_ref: 28d3ab95758f1b367052342b06ac2b1d138b3825
execution_dir: execution/
apply_mode: implement
---

# Handoff

## Source of truth

- Proposal: [proposal.md](proposal.md)
- Spec deltas:
  - [specs/stats-cli/spec.md](specs/stats-cli/spec.md)
- Design session (proposal phase): [execution/grill.md](execution/grill.md) (narrowed; parent session [../add-text-stats-cli/execution/grill.md](../add-text-stats-cli/execution/grill.md))

Design and implementation are owned by the execution tool (below); OpenSpec has no design step.
Implementation diff: `git diff <base_ref>...HEAD -- . ':!openspec'`

## Execution artifacts

| Tool step | Writes to |
|-----------|-----------|
| ai-hero `grill-with-docs` (proposal phase, before handoff) | `execution/grill.md` |
| ai-hero `to-spec` (reads `execution/grill.md`) | `execution/spec.md` |
| ai-hero `to-tickets` (scenarios cited by name) | `execution/tickets/NN-<slug>.md` |
| `/spec-check` (end of planning) | `execution/spec-check.md` |
| ai-hero `implement` (apply_mode) + `tdd`, then `code-review` | code + tests; `execution/reviews/code-review.md` |
| `/opsx:verify` report | `execution/verify.md` |

## Size check

- Requirements in deltas: 1 (budget 5)
- Tickets / plan tasks: 1 expected (budget 8)
- Estimated lines: ~25 (budget ~300; /split-check: approved slice estimate)
- Split decision: slice 4 of 4 of [add-text-stats-cli](../add-text-stats-cli/slices.md) (cleanup: removes flag stats-cli)

## Notes for the implementer

- Branch `change/remove-stats-cli-flag` from main; merge locally. Nothing is pushed.
- Code review runs in a fresh context with the local Ollama reviewer (qwen3:4b-instruct).
- After archive: `split.mjs loss add-text-stats-cli --final --write`, then `openspec archive add-text-stats-cli --skip-specs --yes`.
