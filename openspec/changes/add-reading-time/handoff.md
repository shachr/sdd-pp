---
change: add-reading-time
tool: ai-hero
implementation_model: grok-bot
harness: opencode
base_ref: 8473d68a318c09d560ac81cd093995606b712c0c
execution_dir: execution/
apply_mode: implement
---

# Handoff

## Source of truth

- Proposal: [proposal.md](proposal.md)
- Spec deltas:
  - [specs/reading-time/spec.md](specs/reading-time/spec.md)
- Design session (proposal phase): [execution/grill.md](execution/grill.md)

Design and implementation are owned by the execution tool (below); OpenSpec has no design step.
Implementation diff: `git diff 8473d68a318c09d560ac81cd093995606b712c0c...HEAD -- . ':!openspec'`

## Execution artifacts

| Tool step | Writes to |
|-----------|-----------|
| ai-hero `grill-with-docs` (proposal phase, before handoff) | `execution/grill.md`; glossary terms -> `GLOSSARY.md` |
| ai-hero `to-spec` (reads `execution/grill.md`) | `execution/spec.md` |
| ai-hero `to-tickets` | `execution/tickets/NN-<slug>.md` |
| `/spec-check` (end of planning) | `execution/spec-check.md` |
| ai-hero `implement` (apply_mode) + `tdd`, then `code-review` | code + tests; `execution/reviews/code-review.md` |
| `/opsx:verify` report | `execution/verify.md` |

## Size check

- Requirements in deltas: 3 (budget 5)
- Tickets / plan tasks: 2 (budget 8)
- Split decision: fits

## Notes for the implementer

- Run `npm test` after each ticket.
