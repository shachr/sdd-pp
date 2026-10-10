---
name: openspec-handoff-superpowers
description: Run the Superpowers flow (obra/superpowers - brainstorming, writing-plans, executing-plans or subagent-driven-development, requesting-code-review) on an OpenSpec change folder. Design session in the proposal phase (brainstorming -> execution/brainstorm.md, stopped before writing-plans so OpenSpec writes the specs); planning at handoff (writing-plans reading brainstorm.md -> execution/plan-<id>.md). Use when the change's execution tool is superpowers.
---

# Superpowers on an OpenSpec change

Thin wrapper: you run the real Superpowers skills unmodified. The OpenSpec change folder replaces `docs/superpowers/` as their home. OpenSpec owns *what* (proposal + delta); Superpowers owns *how* (brainstorming's written design and the plan).

Paths are relative to `openspec/changes/<id>/` (the "change folder").

**Location override (user preference, which brainstorming and writing-plans honour):** the written design goes to `execution/brainstorm.md` (not `docs/superpowers/specs/`); the plan goes to `execution/plan-<id>.md` (not `docs/superpowers/plans/`). The unique plan name gives the SDD workspace a unique name (`.superpowers/sdd/plan-<id>/`).

## Flow

| Phase | Superpowers step | Output |
|---|---|---|
| Proposal | `brainstorming` - **stopped after the written design** | `execution/brainstorm.md` |
| Proposal | (OpenSpec) proposal.md + delta, informed by the session | `proposal.md`, `specs/**/spec.md` |
| Handoff (OpenSpec's last stage) | `/handoff` writes handoff.md, prints the next steps | `handoff.md` |
| Planning (engineer) | `writing-plans`, reading `execution/brainstorm.md` | `execution/plan-<id>.md` |
| Planning (engineer) | `/spec-check` (stop on GAPS) | `execution/spec-check.md` |
| Implementation | `using-git-worktrees` as Superpowers recommends | branch `change/<id>` |
| Implementation | `executing-plans` or `subagent-driven-development` (`apply_mode`) - not `/opsx:apply` | code + tests; `.superpowers/sdd/plan-<id>/` (git-ignored); `execution/progress.md` |
| Implementation | `requesting-code-review` (final whole-branch review) | `execution/reviews/code-review.md` |
| Verify / archive | `/opsx:verify`, `finishing-a-development-branch`, `/opsx:archive` | `execution/verify.md` |
| Optional | `/adversarial-review` (different model) | `execution/reviews/<ts>-<model>.md` |

## Design session (proposal phase)

Runs when `/opsx:propose`, `/opsx:new` + `/opsx:continue` or `/opsx:ff` reaches the proposal, before `proposal.md` is written.

1. `node .openspec-handoff/scripts/execution-tool.mjs <id>` must say `superpowers` (project default, or `--set superpowers` for a per-change override). `--set` creates `execution/brainstorm.md` with front matter `tool: superpowers` / `session: brainstorming`; create it the same way if it does not exist.
2. Run `brainstorming` on the user's request (and the existing main specs it touches) as written: first message, questions, approaches, design sections, approval. If decisions were delegated, answer on the user's behalf and mark those answers as your calls.
   - **Size the Work**: pick "a project with a written design" (the change will be planned with writing-plans at handoff).
3. **The Written Design** goes to `execution/brainstorm.md` (keep the front matter): first body line `> Source of truth: [proposal](../proposal.md) · [specs/<cap>/spec.md](../specs/<cap>/spec.md)`. Write it as brainstorming says (intent and why, goals / non-goals, constraints, the parts of the how they decided, what's left to the builder), and end with `## Scenarios found`: names only of the behaviours the session surfaced - each becomes a requirement or scenario in the delta.
   - Builder check: dispatch the subagent if you have one; otherwise read the document as that builder yourself (the skill allows this). Record the three piles.
   - Approval (HARD-GATE): the user's, or yours on their behalf if delegated (say so).
4. **STOP brainstorming here.** Its terminal step says "invoke writing-plans". In this workflow that step is deferred to `/handoff`: do **not** invoke writing-plans, do not write a plan, and do not start implementation. Write at the end of `brainstorm.md`: `Next: OpenSpec proposal + specs; writing-plans runs at /handoff.`
5. Hand back to OpenSpec: write `proposal.md` (what/why only - decisions stay in `brainstorm.md`) and the delta (every scenario from step 3, `## Purpose` first for a new capability). `openspec validate <id> --strict`. `check-handoff` warns on implementation detail in proposal.md.
6. Once the delta exists, cite it by name from the written design's goals; the conversation record and playbacks may keep the partner's words (paraphrase warnings on them are expected and advisory).

## Planning (after handoff - the engineer's first next steps)

After `/handoff` wrote `handoff.md` (`tool: superpowers`, the session file must exist) and printed the next steps: run `writing-plans`, reading `execution/brainstorm.md` as the approved design.

### writing-plans overrides (`execution/plan-<id>.md`)

- Header `**Spec:**` line: `[proposal](../proposal.md) · [specs/<cap>/spec.md](../specs/<cap>/spec.md) · [brainstorm](brainstorm.md) · [handoff](../handoff.md)`.
- **Goal**: one sentence naming the capability and linking the delta; do not restate its rules.
- **Global Constraints**: one line per requirement as a link to its **name** (`[delta](../specs/<cap>/spec.md) - "Requirement: <name>"`), plus non-behavioural constraints. No values or SHALL text.
- **Architecture, File Structure, Interfaces, Review Focus, task steps, test code, commands**: in full as writing-plans says. Test code may contain scenario values.
- `### Task N: <name>` headings, named after the component/slice. At most 8 tasks (hard cap 12).
- Each task starts with `**Covers:** [delta](../specs/<cap>/spec.md) - "Requirement: <name>"`. check-handoff fails on a task that names no requirement or a nonexistent one.
- Execution Handoff: record the choice (= `apply_mode`) at the end of the plan.

### Then

1. `node .openspec-handoff/scripts/check-handoff.mjs <id>`; fix errors, read warnings.
2. `/spec-check <id>`; stop on GAPS. Planning ends here. There is no `tasks.md`: the plan's step checkboxes are the tracker.

## Implementation (the engineer runs `executing-plans` / `subagent-driven-development`)

1. Execute with the `apply_mode` skill. Tick each plan step checkbox (`- [x]`) as it is done, committed with the task (that is the progress `check-handoff` reads).
2. Final whole-branch review with `requesting-code-review` -> `execution/reviews/code-review.md`. Dispatch the reviewer as a **fresh subagent** from `code-reviewer.md`. Without a subagent tool, run the filled `code-reviewer.md` in another fresh context (a new session or a local model); if neither is possible, write "self-review" at the top. Fix Critical/Important.
3. Before deleting the SDD workspace, write `execution/progress.md` (source-of-truth line, ledger lines). `openspec validate <id> --strict`; `check-handoff <id> --expect-complete` (fails while a plan step is unticked).
4. `/opsx:verify <id>`; save the report verbatim to `execution/verify.md`. Then `finishing-a-development-branch`, then `/opsx:archive <id>` as written.
