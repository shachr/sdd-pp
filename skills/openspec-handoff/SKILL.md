---
name: openspec-handoff
description: Hand an OpenSpec change (handoff-driven schema) to an execution tool. Writes handoff.md recording the tool (ai-hero or superpowers) and the implementation model, then routes to the matching wrapper skill. Use when the user says "hand off", "/handoff", or wants AI Hero or Superpowers to implement an OpenSpec change.
---

# OpenSpec handoff

You are moving an OpenSpec change from *planning* (OpenSpec owns proposal + spec deltas) to *execution* (AI Hero or Superpowers). Stay thin: you record the handoff and point the tool at the change folder. You do not re-plan or restate requirements.

**Input**: `<change-id> [ai-hero|superpowers] [implementation-model]`. Infer missing values from the conversation; if still unknown, ask once.

## Steps

1. **Check the change is ready.** Run `openspec status --change "<id>" --json`. `schemaName` must be `handoff-driven`, and `proposal`, `specs`, `design` must be `done`. If not, stop and tell the user which artifact is missing (`/opsx:continue` or `/opsx:propose` creates it).
2. **Check size before handing off.** Read the proposal's *Size Budget*. If it is over budget (more than 5 requirements, 8 tickets/plan tasks, or 400 changed lines), stop and propose a split (see `.openspec-handoff/small-changes.md`). Handing off an oversized change makes review and `/opsx:verify` unreliable.
3. **Write `handoff.md`.** Run `openspec instructions handoff --change "<id>"` and follow it with the template it returns. Fill:
   - `tool`: `ai-hero` or `superpowers`
   - `implementation_model`: the exact model id that will write code (your own model id if you are the implementer; never a placeholder)
   - `harness`: claude-code, cursor, codex, ...
   - `base_ref`: output of `git rev-parse HEAD` right now
   - links to `proposal.md`, `design.md`, and every `specs/**/spec.md` delta - links only, no copied requirement text
4. **Lint.** Run `node .openspec-handoff/scripts/check-handoff.mjs <id>`. Fix every error before continuing.
5. **Route.** Use skill `openspec-handoff-ai-hero` for `tool: ai-hero`, or `openspec-handoff-superpowers` for `tool: superpowers`. They write `execution/` and `tasks.md`.
6. **Commit** `handoff.md` on its own (`handoff(<id>): <tool> / <model>`), so `base_ref` and the handoff are visible in history.

## Guardrails

- Requirements live only in `specs/**/spec.md`. If execution needs new behavior, update the delta (`/opsx:update`) and re-run `openspec validate <id> --strict` - do not describe the behavior in handoff.md or execution/.
- One change = one PR. Do not hand off two changes to one branch.
