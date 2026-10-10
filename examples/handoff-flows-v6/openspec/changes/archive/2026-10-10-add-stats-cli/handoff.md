---
change: add-stats-cli
tool: ai-hero
implementation_model: grok-bot
harness: opencode
base_ref: 7973ed10c780b2aeef9cae86d6a44eaa7dbaa4e2
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
| ai-hero `grill-with-docs` (proposal phase) | `execution/grill.md` |
| ai-hero `to-spec` (reads `execution/grill.md`) | `execution/spec.md` |
| ai-hero `to-tickets` | `execution/tickets/NN-<slug>.md` |
| `/spec-check` (end of planning; line estimate) | `execution/spec-check.md` |
| ai-hero `implement` (apply_mode) + `tdd` | code + tests; ticket Status/checkboxes |
| ai-hero `code-review` | `execution/reviews/code-review.md` |
| `/opsx:verify` report | `execution/verify.md` |

## Size check

- Requirements in deltas: 3 (split gate: <= 5), capabilities: 1 (<= 2)
- Tickets / plan tasks: 2 expected (budget 8)
- Line estimate: after planning (/spec-check; budget ~300)
- Split decision: slice 3 of 4 of [add-text-stats-cli](../add-text-stats-cli/slices.md)

## Notes for the implementer

- Branch `change/add-stats-cli` from main; user-visible behaviour stays behind `TEXTKIT_STATS=1` until remove-stats-cli-flag; archive on this branch and commit it with the code; merge locally. Nothing is pushed.
- Code review: no fresh session of the coding agent is available in this harness, so the weak fallback reviewer (local Ollama qwen3:4b-instruct) runs the Standards and Spec briefs in fresh contexts, labelled as such.
