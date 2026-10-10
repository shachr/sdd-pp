---
change: add-truncate
tool: ai-hero
implementation_model: grok-bot
harness: opencode
base_ref: 043b06c439d165758c503d3c847ee094d2bd40c2
execution_dir: execution/
apply_mode: implement
---

# Handoff

## Source of truth

- Proposal: [proposal.md](proposal.md)
- Spec deltas:
  - [specs/truncation/spec.md](specs/truncation/spec.md)
- Design session (proposal phase): [execution/grill.md](execution/grill.md)

Design and implementation are owned by the execution tool (below); OpenSpec has no design step.
Implementation diff: `git diff <base_ref>...HEAD -- . ':!openspec'`

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

- Requirements in deltas: 3 (budget 5)
- Tickets / plan tasks: 2 expected (budget 8)
- Split decision: fits

## Notes for the implementer

- Work on `main` (single-session `implement`); commit per ticket.
- Code review runs in a fresh context with the local Ollama reviewer (qwen3:4b-instruct).
