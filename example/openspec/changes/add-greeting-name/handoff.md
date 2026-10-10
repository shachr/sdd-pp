---
change: add-greeting-name
tool: ai-hero
harness: claude-code
base_ref: 379bb4d863a58aceb1e9f57b7860da2f4d3ab47a
execution_dir: execution/
apply_mode: implement
---

# Handoff

## Source of truth

- Proposal: [proposal.md](proposal.md)
- Spec deltas:
  - [specs/greeting/spec.md](specs/greeting/spec.md) - both ADDED requirements

Design and implementation are owned by the execution tool (below); OpenSpec has no design step.

## Execution artifacts

| Tool step | Writes to |
|-----------|-----------|
| ai-hero `grill-with-docs` (proposal phase, before handoff) | `execution/grill.md` |
| ai-hero `to-spec` (reads `execution/grill.md`) | `execution/spec.md` |
| ai-hero `to-tickets` | `execution/tickets/NN-<slug>.md` |
| `/sdd-spec-check` (end of handoff) | `execution/spec-check.md` |
| ai-hero `implement` (apply_mode) + `tdd`, then `code-review` | code in `src/`, `test/`; ticket Status + checkboxes; `execution/reviews/code-review.md` |
| `/opsx:verify` report | `execution/verify.md` |

## Size check

- Requirements in deltas: 2 (budget 5)
- Tickets / plan tasks: 2 (budget 8)
- Split decision: fits

## Notes for the implementer

- Run `npm test` in `example/` after each ticket.
