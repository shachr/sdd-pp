---
change: add-text-wrapping
tool: ai-hero
implementation_model: grok-bot
harness: grok-bot (agent on the shared box, following SKILL.md files as written)
base_ref: 7f9392da65aab86c74442afad8bb6d8d3a9d4b3b
execution_dir: execution/
reviewer_model: qwen3:4b-instruct
---

# Handoff

## Source of truth

- Proposal: [proposal.md](proposal.md)
- Spec deltas:
  - [specs/text-wrapping/spec.md](specs/text-wrapping/spec.md) - new capability, four ADDED requirements

Design and implementation are owned by the execution tool (below); OpenSpec has no design step.
Implementation diff: `git diff 7f9392d...HEAD -- . ':!openspec'`

## Execution artifacts

| Tool step | Writes to |
|-----------|-----------|
| ai-hero `grill-with-docs` (decisions answered on the user's behalf - user delegated) | `execution/design.md`; glossary terms -> `GLOSSARY.md`, ADRs -> `docs/adr/` |
| ai-hero `to-tickets` (fed from the delta, not from to-spec) | `execution/tickets/NN-<slug>.md` |
| ai-hero `implement` + `tdd`, then `code-review` | code + tests; `execution/reviews/self-review.md` |
| `/adversarial-review` | `execution/reviews/<timestamp>-<reviewer-model>.md` |
| `/opsx:verify` report | `execution/verify.md` |

## Size check

- Requirements in deltas: 4 (budget 5)
- Tickets / plan tasks: 2-3 (budget 8)
- Split decision: fits

## Notes for the implementer

- reviewer_model is the local Ollama model (qwen family, different from grok-bot) so the review stays free and local.
