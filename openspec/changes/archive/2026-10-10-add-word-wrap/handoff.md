---
change: add-word-wrap
tool: ai-hero
harness: other
base_ref: e2a0255a1ab6ed10fab062df53ca4b1477acfa29
execution_dir: execution/
apply_mode: implement-spec
---

# Handoff

## Source of truth

- Proposal: [proposal.md](proposal.md)
- Spec deltas:
  - [specs/text-wrap/spec.md](specs/text-wrap/spec.md)
- Design session (proposal phase): [execution/grill.md](execution/grill.md)

Design and implementation are owned by the execution tool (below); OpenSpec has no design step.
Implementation diff: `git diff <base_ref>...HEAD -- . ':!openspec'`

## Execution artifacts

| Tool step | Writes to |
|-----------|-----------|
| ai-hero `grill-with-docs` (proposal phase, before handoff) | `execution/grill.md`; glossary terms -> `GLOSSARY.md`, ADRs -> `docs/adr/` |
| ai-hero `to-spec` (reads `execution/grill.md`; user-facing sections link the proposal/delta) | `execution/spec.md` |
| ai-hero `to-tickets` (scenarios cited by name) | `execution/tickets/NN-<slug>.md` |
| `/spec-check` (end of planning) | `execution/spec-check.md` |
| ai-hero `implement` / `implement-spec` (apply_mode) + `tdd`, then `code-review` | code + tests; review notes, if any, in `execution/reviews/` |
| `/opsx:verify` report | `execution/verify.md` |

## Size check

- Requirements in deltas: 4 (budget 5)
- Tickets / plan tasks: 2 expected (planning not run yet; budget 8)
- Split decision: fits

## Notes for the implementer

- Harness: this run is driven by an agent without a sub-agent tool (harness recorded as `other`); `implement-spec` was required by the user, so its sub-agent steps run in-session and are labelled as such.
