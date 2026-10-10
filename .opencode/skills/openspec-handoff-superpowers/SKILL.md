---
name: openspec-handoff-superpowers
description: Run the Superpowers flow (obra/superpowers - writing-plans, executing-plans or subagent-driven-development, requesting-code-review) against an OpenSpec change folder, with the OpenSpec proposal + delta as the spec and the plan and progress written into openspec/changes/<id>/execution/. Use after openspec-handoff when handoff.md says tool superpowers.
---

# Superpowers on an OpenSpec change

Thin wrapper: you run the real Superpowers skills unmodified. The OpenSpec change folder replaces `docs/superpowers/` as their home, and the proposal + delta replace the brainstorming design doc as the spec. OpenSpec owns *what*; Superpowers owns *how* (the plan is the design).

Paths are relative to `openspec/changes/<id>/` (the "change folder").

## Before you start

- Read `handoff.md`. `tool` must be `superpowers`; you are `implementation_model`. If you are not that model, stop and say so.
- Read `proposal.md` and every `specs/**/spec.md`. They are the spec the plan argues from. There is no OpenSpec `design.md`.
- **Location override (user preference, which writing-plans honours):** the plan goes to `execution/plan-<id>.md` (not `docs/superpowers/plans/`). The unique filename gives the SDD workspace a unique name (`.superpowers/sdd/plan-<id>/`), so two changes never share a ledger.

## Flow

| Superpowers step | Run it? | Output |
|---|---|---|
| `brainstorming` | **No.** The proposal + delta are the brainstorm's output. If the proposal leaves a behaviour question open, fix the delta first. | - |
| `using-git-worktrees` | As Superpowers recommends | branch `change/<id>` |
| `writing-plans` | Yes | `execution/plan-<id>.md` |
| `subagent-driven-development` (if you have a subagent tool) or `executing-plans` | Yes, from `/opsx:apply` | code + tests; ledger in `.superpowers/sdd/plan-<id>/` (git-ignored); summary to `execution/progress.md` |
| `requesting-code-review` | As the skill does (per task / final) | stays in the SDD workspace; summary in `execution/progress.md` |
| Final review | Always | `/adversarial-review <id>` (different model) |
| `finishing-a-development-branch` | After review + verify | - |

### writing-plans overrides (`execution/plan-<id>.md`)

- Header `**Spec:**` line: `[proposal](../proposal.md) · [specs/<cap>/spec.md](../specs/<cap>/spec.md) · [handoff](../handoff.md)` (also the "Source of truth" line).
- **Goal**: one sentence naming the capability and linking the delta; do not restate its rules.
- **Global Constraints**: one line per requirement, as a link to its **name** (`[delta](../specs/<cap>/spec.md) - "Requirement: <name>"`), plus non-behavioural constraints (dependencies, commands). Do not copy values or SHALL text even though writing-plans asks for it - the delta is the verbatim source, one click away.
- **Architecture, File Structure, Interfaces, Review Focus, task steps, test code, commands**: write in full as writing-plans says. Test code may contain the scenario values (code blocks are implementation, not restatement).
- Task titles name the component/slice (`### Task 1: text-statistics module - word counting`), not the rule. Prose in steps cites scenarios by name.
- Use `### Task N: <name>` headings (the size check counts them). At most 8 tasks (hard cap 12).
- Execution choice (writing-plans "Execution Handoff"): record it at the end of the plan; if decisions were delegated, choose yourself and say so.

## Phase boundary

- **Planning** (right after `/handoff`, or when `/opsx:propose|ff|continue` reaches `tasks`): writing-plans, then `tasks.md`. No code changes.
- **Implementation** (`/opsx:apply`): executing-plans or subagent-driven-development, then review and verify.

### Planning: after the plan exists

1. Run `openspec instructions tasks --change "<id>"` and write `tasks.md`: one checkbox per plan task linking `execution/plan-<id>.md#task-n-<slug>`, plus the review group.
2. Run `node .openspec-handoff/scripts/check-handoff.mjs <id>`; fix errors. Stop here if you were invoked for planning.

### Implementation (from /opsx:apply)

1. Execute with `subagent-driven-development` (or `executing-plans`). When a task completes, tick its `tasks.md` box in the same commit.
2. After the final review, before deleting the SDD workspace, write `execution/progress.md`: source-of-truth line, then the ledger lines (task commits, rulings, deferred minors).
3. Run `/adversarial-review <id>`, triage (`execution/reviews/triage.md`) and fix Critical/Important findings, tick 2.1; `openspec validate <id> --strict` (2.2); `check-handoff` (2.3).
4. Run `/opsx:verify <id>` and save the report verbatim to `execution/verify.md`. Then `finishing-a-development-branch`, then `/opsx:archive <id>` as written (agent-driven sync).
