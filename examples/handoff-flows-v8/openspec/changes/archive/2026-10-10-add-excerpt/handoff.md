---
change: add-excerpt
tool: ai-hero
base_ref: 3e0e68656fbfca283b9ce22659d8514947f5a825
execution_dir: execution/
apply_mode: implement
---

# Handoff

## Source of truth

- Proposal: [proposal.md](proposal.md)
- Spec deltas:
  - [specs/text-excerpt/spec.md](specs/text-excerpt/spec.md) - all five ADDED requirements
- Design session (proposal phase): [execution/grill.md](execution/grill.md)

Design and implementation are owned by the execution tool (below); OpenSpec has no design step.
Implementation diff: `git diff 3e0e68656fbfca283b9ce22659d8514947f5a825...HEAD -- . ':!openspec'`

## Execution artifacts

| Tool step | Writes to |
|-----------|-----------|
| ai-hero `grill-with-docs` (proposal phase, before handoff) | `execution/grill.md`; glossary terms -> `GLOSSARY.md` |
| ai-hero `to-spec` (reads `execution/grill.md`; user-facing sections link the proposal/delta) | `execution/spec.md` |
| ai-hero `to-tickets` (scenarios cited by name) | `execution/tickets/NN-<slug>.md` |
| `/spec-check` (end of planning) | `execution/spec-check.md` |
| ai-hero `implement` (apply_mode) + `tdd`, then `code-review` | code + tests; `execution/reviews/code-review.md` |
| `/opsx:verify` report | `execution/verify.md` |

## Size check

- Requirements in deltas: 5 (budget 5)
- Tickets / plan tasks: 2-3 expected (budget 8) - planning has not run yet
- Split decision: fits (/split-check: 5 requirements, 1 capability)

## Notes for the implementer

- Branch `change/add-excerpt` from main. `npm test` must stay green. No dependencies.
- harness omitted (optional): this run is driven from a plain shell, not one of the listed harnesses.
