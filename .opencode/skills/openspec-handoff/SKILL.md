---
name: openspec-handoff
description: Hand an OpenSpec change (handoff-driven schema) to an execution tool. Writes handoff.md recording the tool (ai-hero or superpowers) and the implementation model, then runs that tool's planning through its wrapper skill. Use when the user says "hand off", "/handoff", or wants AI Hero or Superpowers to implement an OpenSpec change.
---

# OpenSpec handoff

You are moving an OpenSpec change from *requirements* (OpenSpec owns proposal + spec deltas, nothing else) to *execution* (AI Hero or Superpowers own design, plan, code and review). Stay thin: record the handoff and point the tool at the change folder. Do not re-plan or restate requirements.

**Input**: `<change-id> [ai-hero|superpowers] [implementation-model]`. Infer missing values from the conversation; if still unknown, ask once.

## Steps

1. **Check the change is ready.** Run `openspec status --change "<id>" --json`. `schemaName` must be `handoff-driven`; `proposal` and `specs` must be `done`. Run `openspec validate "<id>" --strict`; it must pass. If anything is missing, stop (`/opsx:continue` or `/opsx:propose` creates it). A `design.md` in the change folder is a smell: design belongs to the execution tool - move its decisions into the tool's planning output.
2. **Check size.** Read the proposal's *Size Budget*. Over budget (more than 5 requirements, 8 tickets/plan tasks, or 400 changed lines): stop and propose a split (`.openspec-handoff/small-changes.md`).
3. **Write `handoff.md`.** Run `openspec instructions handoff --change "<id>"` and follow it with the template it returns. Fill:
   - `tool`: `ai-hero` or `superpowers`
   - `implementation_model`: the exact model id that will write code (your own model id if you are the implementer; never a placeholder)
   - `harness`: claude-code, cursor, codex, opencode, ...
   - `base_ref`: `git rev-parse HEAD` right now
   - `apply_mode`: the tool's own implement command the engineer will run - ai-hero: `implement` (one session) or `implement-spec` (subagents); superpowers: `executing-plans` (inline) or `subagent-driven-development`. Ask once if unknown; default to the subagent variant only if the harness has a subagent tool.
   - links to `proposal.md` and every `specs/**/spec.md` delta - links only
4. **Lint.** `node .openspec-handoff/scripts/check-handoff.mjs <id>`. Fix every error.
5. **Commit** (`handoff(<id>): <tool> / <model>`). `base_ref` stays the commit before any implementation.
6. **Plan.** Run the *Planning* part of `openspec-handoff-ai-hero` (`tool: ai-hero`: grill-with-docs -> to-spec -> to-tickets) or `openspec-handoff-superpowers` (`tool: superpowers`: brainstorming -> writing-plans). It writes `execution/` and `tasks.md`.
7. **Spec check.** Run `/spec-check <id>` (`node .openspec-handoff/scripts/spec-check.mjs <id> --write`, then your contradiction review in `execution/spec-check.md`). On GAPS: stop and fix the design output (or the delta), then re-run. On PASS: commit (`plan(<id>): ...`) and stop. Tell the engineer to start implementation with the tool's own command from `apply_mode` (`/implement`, `/implement-spec`, `executing-plans`, `subagent-driven-development`). `/opsx:apply` is not used in this workflow; `openspec status` task progress is whatever `tasks.md` shows.

## Guardrails

- Requirements live only in `specs/**/spec.md`. If execution needs new behaviour, update the delta and re-run `openspec validate <id> --strict` - never describe behaviour in handoff.md or execution/.
- One change = one PR.
