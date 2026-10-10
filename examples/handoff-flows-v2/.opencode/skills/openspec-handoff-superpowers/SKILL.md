---
name: openspec-handoff-superpowers
description: Run the Superpowers flow (obra/superpowers - brainstorming, writing-plans, executing-plans or subagent-driven-development, requesting-code-review) against an OpenSpec change folder, with the OpenSpec proposal + delta as the spec and the plan and progress written into openspec/changes/<id>/execution/. Use after openspec-handoff when handoff.md says tool superpowers.
---

# Superpowers on an OpenSpec change

Thin wrapper: you run the real Superpowers skills unmodified. The OpenSpec change folder replaces `docs/superpowers/` as their home. OpenSpec owns *what* (proposal + delta); Superpowers owns *how* (brainstorming's written design and the plan).

Paths are relative to `openspec/changes/<id>/` (the "change folder").

## Before you start

- Read `handoff.md`. `tool` must be `superpowers`; you are `implementation_model`. If you are not that model, stop and say so.
- Read `proposal.md` and every `specs/**/spec.md`. They are the spec the plan argues from. There is no OpenSpec `design.md`.
- **Location override (user preference, which brainstorming and writing-plans honour):** the written design goes to `execution/design.md` (not `docs/superpowers/specs/`); the plan goes to `execution/plan-<id>.md` (not `docs/superpowers/plans/`). The unique filename gives the SDD workspace a unique name (`.superpowers/sdd/plan-<id>/`), so two changes never share a ledger.

## Flow

| Superpowers step | Run it? | Output |
|---|---|---|
| `brainstorming` | **Yes**, starting from the proposal + delta (they are what your partner already said). If decisions were delegated, answer on their behalf and mark those answers as your calls. | `execution/design.md` (see overrides) |
| `using-git-worktrees` | As Superpowers recommends | branch `change/<id>` |
| `writing-plans` | Yes | `execution/plan-<id>.md` |
| `/spec-check` | Yes, end of planning (stop on GAPS) | `execution/spec-check.md` |
| `subagent-driven-development` or `executing-plans` - as `apply_mode` in handoff.md | Yes, started by the engineer (not `/opsx:apply`) | code + tests; ledger in `.superpowers/sdd/plan-<id>/` (git-ignored); summary to `execution/progress.md` |
| `requesting-code-review` (final whole-branch review) | Yes | `execution/reviews/code-review.md` |
| `/adversarial-review` | Optional (different model) | `execution/reviews/<ts>-<model>.md` |
| `finishing-a-development-branch` | After review + verify | - |

### brainstorming overrides (`execution/design.md`)

- The conversation starts from the proposal + delta, so most of the "ground to cover" is already answered: ask (or, if delegated, answer) only what they leave open - mostly *how it gets made*.
- **Size the Work**: an OpenSpec change that reached `/handoff` is planned with writing-plans, so pick "a project with a written design" (say so; the user can override).
- **The Written Design**: first line `> Source of truth: [proposal](../proposal.md) · [spec delta](../specs/<cap>/spec.md) · [handoff](../handoff.md)`. *Intent and why* and *goals / non-goals* point at the proposal (Why / What Changes / out of scope) instead of retelling it; behaviour is cited by requirement/scenario name. *Constraints*, *the parts of the how they decided* and *what's left to the builder* are written in full.
- A question whose answer changes behaviour goes into the delta (re-validate), not the design.
- Builder check: dispatch the subagent if you have one; otherwise read the document as that builder yourself (the skill allows this). Record the three piles at the end of the design.
- HARD-GATE approval: the user's, or yours on their behalf if they delegated (say so in the design). Then writing-plans.

### writing-plans overrides (`execution/plan-<id>.md`)

- Header `**Spec:**` line: `[proposal](../proposal.md) · [specs/<cap>/spec.md](../specs/<cap>/spec.md) · [design](design.md) · [handoff](../handoff.md)` (also the "Source of truth" line).
- **Goal**: one sentence naming the capability and linking the delta; do not restate its rules.
- **Global Constraints**: one line per requirement, as a link to its **name** (`[delta](../specs/<cap>/spec.md) - "Requirement: <name>"`), plus non-behavioural constraints (dependencies, commands). Do not copy values or SHALL text even though writing-plans asks for it - the delta is the verbatim source, one click away.
- **Architecture, File Structure, Interfaces, Review Focus, task steps, test code, commands**: write in full as writing-plans says. Test code may contain the scenario values (code blocks are implementation, not restatement).
- Task titles name the component/slice (`### Task 1: text-statistics module - word counting`), not the rule. Prose in steps cites scenarios by name.
- Use `### Task N: <name>` headings (the size check counts them). At most 8 tasks (hard cap 12).
- Each task starts with `**Covers:** [delta](../specs/<cap>/spec.md) - "Requirement: <name>"` (one or more). check-handoff fails on a task that names no requirement or a nonexistent one; scaffolding folds into the task that needs it.
- Execution choice (writing-plans "Execution Handoff"): record it at the end of the plan; if decisions were delegated, choose yourself and say so.

## Phase boundary

- **Planning** (right after `/handoff`, or when `/opsx:propose|ff|continue` reaches `tasks`): brainstorming, writing-plans, `tasks.md`, then `/spec-check`. No code changes.
- **Implementation** (the engineer runs `executing-plans` or `subagent-driven-development`, as recorded in `apply_mode`; `/opsx:apply` is not used), then review and verify.

### Planning: after the plan exists

1. Run `openspec instructions tasks --change "<id>"` and write `tasks.md`: one checkbox per plan task linking `execution/plan-<id>.md#task-n-<slug>`, plus the review group.
2. Run `node .openspec-handoff/scripts/check-handoff.mjs <id>`; fix errors and read the warnings (likely paraphrases).
3. Run `/spec-check <id>`; stop on GAPS. Stop here if you were invoked for planning.

### Implementation (the engineer runs `executing-plans` / `subagent-driven-development`)

1. Execute with the `apply_mode` skill. When a task completes, tick its `tasks.md` box in the same commit.
2. Final whole-branch review with `requesting-code-review` (fresh reviewer subagent, or a self-review from `code-reviewer.md` without a subagent tool) -> `execution/reviews/code-review.md`; fix Critical/Important findings and tick 2.1.
3. Before deleting the SDD workspace, write `execution/progress.md`: source-of-truth line, then the ledger lines (task commits, rulings, deferred minors). `openspec validate <id> --strict` (2.2); `check-handoff` (2.3). `/adversarial-review` is optional.
4. Run `/opsx:verify <id>` and save the report verbatim to `execution/verify.md`. Then `finishing-a-development-branch`, then `/opsx:archive <id>` as written (agent-driven sync).
