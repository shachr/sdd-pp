---
name: openspec-handoff-superpowers
description: Run the Superpowers flow (obra/superpowers - writing-plans, subagent-driven-development or executing-plans, requesting-code-review) against an OpenSpec change folder, writing the plan and progress into openspec/changes/<id>/execution/. Use after openspec-handoff when handoff.md says tool superpowers.
---

# Superpowers on an OpenSpec change

Thin wrapper: you run the real Superpowers skills; the OpenSpec change folder replaces `docs/superpowers/` as their home, and the OpenSpec deltas replace the brainstorming design doc as the spec.

Paths are relative to `openspec/changes/<id>/` (the "change folder").

## Before you start

- Read `handoff.md`. `tool` must be `superpowers`; you are `implementation_model`. If you are not that model, stop and say so.
- Read `proposal.md`, `design.md`, every `specs/**/spec.md`. These are the spec the plan argues from.
- **Location override (user preference, which writing-plans honours):** plans go to `execution/plan.md`, not `docs/superpowers/plans/`. Brainstorm notes, if any, go to `execution/brainstorm.md`, not `docs/superpowers/specs/`.

## Flow

| Superpowers step | Run it? | Output (override) |
|---|---|---|
| `brainstorming` | Skip by default - proposal + design already did this. Run only if design.md has blocking open questions | `execution/brainstorm.md`; decisions that change behavior go into the deltas via `/opsx:update`, design choices into `design.md` |
| `using-git-worktrees` | As Superpowers recommends | branch per change: `change/<id>` |
| `writing-plans` | Yes | `execution/plan.md` |
| `subagent-driven-development` (default) or `executing-plans` | Yes | Code + tests; workspace stays in git-ignored `.superpowers/sdd/`; final ledger summary to `execution/progress.md` |
| `requesting-code-review` | Per task, as the skill does | per-task reviews stay in the SDD workspace |
| Final review | Always | `/adversarial-review <id>` (different model) |
| `finishing-a-development-branch` | After review + verify | - |

### writing-plans overrides (`execution/plan.md`)

- Header `**Spec:**` line: `[proposal](../proposal.md) · [specs/<cap>/spec.md](../specs/<cap>/spec.md) · [design](../design.md) · [handoff](../handoff.md)`. This also satisfies the "Source of truth" rule.
- **Global Constraints**: list each constraint as a link to the requirement **name** in the delta (`../specs/<cap>/spec.md` - "Requirement: Greeting by name"). Do not copy values or SHALL text verbatim even though writing-plans asks for it - here the delta is the verbatim source, one click away.
- **Review Focus**, **File Structure**, task bodies, exact code and commands: write them in full as writing-plans says.
- Use `### Task N: <name>` headings (the size check counts them). At most 8 tasks (hard cap 12); more means split the change.

## Phase boundary

- **Planning** (run when the schema's `execution` artifact is next - from `/opsx:propose`, `/opsx:ff`, `/opsx:continue`, or right after `/handoff`): brainstorming (only if needed), writing-plans, then `tasks.md`. No code changes in this phase; when writing-plans offers the execution choice, record the choice in `execution/plan.md` and stop.
- **Implementation** (run from `/opsx:apply`): executing-plans or subagent-driven-development, then review and verify.

### Planning: after the plan exists

1. Run `openspec instructions tasks --change "<id>"` and write `tasks.md`: one checkbox per plan task linking `execution/plan.md#task-n-<slug>`, plus the review/verify group.
2. Run `node .openspec-handoff/scripts/check-handoff.mjs <id>`; fix errors. Stop here if you were invoked for planning.

### Implementation (from /opsx:apply)

1. Execute with `subagent-driven-development` (or `executing-plans`). When a task completes, tick its `tasks.md` box in the same commit.
2. Before deleting the SDD workspace, write `execution/progress.md`: source-of-truth line, then one line per task with its commit SHA and review verdict (copy the ledger lines; the ledger itself stays in `.superpowers/sdd/`).
3. Run `/adversarial-review <id>`, triage and fix Critical/Important findings, then `openspec validate <id> --strict` and `/opsx:verify <id>`.
