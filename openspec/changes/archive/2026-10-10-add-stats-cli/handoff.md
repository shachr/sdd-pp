---
change: add-stats-cli
tool: ai-hero
implementation_model: grok-bot
harness: opencode
base_ref: 7dfeddb263650fa4e4a349c8fdd06456b24a0d21
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
| ai-hero `grill-with-docs` (proposal phase, before handoff) | `execution/grill.md`; glossary terms -> `GLOSSARY.md`, ADRs -> `docs/adr/` |
| ai-hero `to-spec` (reads `execution/grill.md`; user-facing sections link the proposal/delta) | `execution/spec.md` |
| ai-hero `to-tickets` (scenarios cited by name) | `execution/tickets/NN-<slug>.md` |
| `/spec-check` (end of planning) | `execution/spec-check.md` |
| ai-hero `implement` (apply_mode) + `tdd`, then `code-review` | code + tests; `execution/reviews/code-review.md` |
| `/opsx:verify` report | `execution/verify.md` |

## Size check

- Requirements in deltas: 3 (budget 5)
- Tickets / plan tasks: 2 expected (budget 8)
- Estimated lines: ~135 (budget ~300; /split-check: approved slice estimate)
- Split decision: slice 3 of 4 of [add-text-stats-cli](../add-text-stats-cli/slices.md)

## Notes for the implementer

- Branch `change/add-stats-cli` from main; flagged slice (TEXTKIT_STATS_CLI); merge locally. Nothing is pushed.
- Code review runs in a fresh context with the local Ollama reviewer (qwen3:4b-instruct).
- After archive: `node .openspec-handoff/scripts/split.mjs next add-text-stats-cli --write-tickets`.
