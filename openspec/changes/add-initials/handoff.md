---
change: add-initials
tool: superpowers
implementation_model: grok-bot
harness: opencode
base_ref: 23577f25b0b9554bf7472057c47f6b56b3aea757
execution_dir: execution/
apply_mode: executing-plans
---

# Handoff

## Source of truth

- Proposal: [proposal.md](proposal.md)
- Spec deltas:
  - [specs/initials/spec.md](specs/initials/spec.md)
- Design session (proposal phase): [execution/brainstorm.md](execution/brainstorm.md)

Design and implementation are owned by the execution tool (below); OpenSpec has no design step.
Implementation diff: `git diff 23577f25b0b9554bf7472057c47f6b56b3aea757...HEAD -- . ':!openspec'`

## Execution artifacts

| Tool step | Writes to |
|-----------|-----------|
| superpowers `brainstorming` (proposal phase; stopped before writing-plans) | `execution/brainstorm.md` |
| superpowers `writing-plans` (reads `execution/brainstorm.md`) | `execution/plan-add-initials.md` |
| `/spec-check` (end of planning) | `execution/spec-check.md` |
| superpowers `executing-plans` (apply_mode) ledger | `execution/progress.md` |
| superpowers `requesting-code-review` (final review) | `execution/reviews/code-review.md` |
| `/opsx:verify` report | `execution/verify.md` |

## Size check

- Requirements in deltas: 3 (budget 5)
- Tickets / plan tasks: 2 (budget 8)
- Split decision: fits

## Notes for the implementer

- Project default tool is ai-hero; this change overrides it (`tool: superpowers` in execution/brainstorm.md front matter).
- Branch `change/add-initials`; `npm test` after each task. apply_mode executing-plans: the harness has no subagent tool.
