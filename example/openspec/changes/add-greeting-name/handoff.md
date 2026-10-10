---
change: add-greeting-name
tool: ai-hero
implementation_model: claude-sonnet-4-5
harness: claude-code
base_ref: 379bb4d863a58aceb1e9f57b7860da2f4d3ab47a
execution_dir: execution/
diff_paths:
  - src
  - test
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
| ai-hero `grill-with-docs` | `execution/design.md` |
| ai-hero `to-tickets` | `execution/tickets/NN-<slug>.md` |
| ai-hero `implement` (+ `tdd`) | code in `src/`, `test/`; ticks `tasks.md` |
| `/adversarial-review` | `execution/reviews/<timestamp>-<reviewer-model>.md` |

## Size check

- Requirements in deltas: 2 (budget 5)
- Tickets / plan tasks: 2 (budget 8)
- Split decision: fits

## Notes for the implementer

- `diff_paths` scopes size checks to this example project (the toolkit repo is a monorepo).
- Run `npm test` in `example/` after each ticket.

## Reviews

- qwen2.5-coder:3b via code-review: [execution/reviews/20261009-230321-qwen2.5-coder-3b.md](execution/reviews/20261009-230321-qwen2.5-coder-3b.md)
- qwen2.5-coder:3b via code-review: [execution/reviews/20261009-230358-qwen2.5-coder-3b.md](execution/reviews/20261009-230358-qwen2.5-coder-3b.md)
- qwen2.5-coder:3b via code-review: [execution/reviews/20261009-230422-qwen2.5-coder-3b.md](execution/reviews/20261009-230422-qwen2.5-coder-3b.md)
