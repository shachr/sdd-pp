---
name: openspec-handoff-superpowers
description: Run the Superpowers flow (obra/superpowers - brainstorming, writing-plans, executing-plans or subagent-driven-development, requesting-code-review) on an OpenSpec change folder. Design session in the proposal phase (brainstorming -> execution/brainstorm.md, stopped before writing-plans so OpenSpec writes the specs); planning after handoff as the engineer's next steps (writing-plans reading brainstorm.md -> execution/plan-<id>.md). Use when the change's execution tool is superpowers.
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
| Specs (end) | `/split-check` split gate (> 5 requirements or > 2 capabilities: slices proposed, engineer approves, `/split-apply`; slices are named `<parent>-<nn>-<slice>`) | `execution/split-check.md` |
| Handoff (OpenSpec's last stage) | `/handoff` writes handoff.md, prints the next steps | `handoff.md` |
| Planning (engineer) | `writing-plans`, reading `execution/brainstorm.md` | `execution/plan-<id>.md` |
| Planning (engineer) | `/spec-check` (stop on GAPS) | `execution/spec-check.md` |
| Implementation | `using-git-worktrees` as Superpowers recommends | branch `change/<id>` |
| Implementation | `executing-plans` or `subagent-driven-development` (`apply_mode`) - not `/opsx:apply` | code + tests; `.superpowers/sdd/plan-<id>/` (git-ignored); `execution/progress.md` |
| Implementation | `requesting-code-review` (final whole-branch review) | `execution/reviews/code-review.md` |
| Verify / archive | `/opsx:verify`, `finishing-a-development-branch`, `/opsx:archive` | `execution/verify.md` |

## Design session (proposal phase)

Runs when `/opsx:propose`, `/opsx:new` + `/opsx:continue` or `/opsx:ff` reaches the proposal, before `proposal.md` is written.

1. `/tool <id>` (runs `node .openspec-handoff/scripts/sdd.mjs tool <id>`) must say `superpowers` (project default, or `/tool <id> --set superpowers` for a per-change override). `--set` creates `execution/brainstorm.md` with front matter `tool: superpowers` / `session: brainstorming`; create it the same way if it does not exist.
2. Run `brainstorming` on the user's request (and the existing main specs it touches) as written: first message, questions, approaches, design sections, approval. If decisions were delegated, answer on the user's behalf and mark those answers as your calls.
   - **Size the Work**: pick "a project with a written design" (the engineer plans it with writing-plans after /handoff).
3. **The Written Design** goes to `execution/brainstorm.md` (keep the front matter): first body line `> Source of truth: [proposal](../proposal.md) · [specs/<cap>/spec.md](../specs/<cap>/spec.md)`. Write it as brainstorming says (intent and why, goals / non-goals, constraints, the parts of the how they decided, what's left to the builder), and end with `## Scenarios found`: names only of the behaviours the session surfaced - each becomes a requirement or scenario in the delta.
   - Builder check: dispatch the subagent if you have one; otherwise read the document as that builder yourself (the skill allows this). Record the three piles.
   - Approval (HARD-GATE): the user's, or yours on their behalf if delegated (say so).
4. **STOP brainstorming here.** Its terminal step says "invoke writing-plans". In this workflow that step is deferred until after `/handoff` (the engineer's first next step): do **not** invoke writing-plans, do not write a plan, and do not start implementation. Write at the end of `brainstorm.md`: `Next: OpenSpec proposal + specs + /handoff; writing-plans is the engineer's first next step after it.`
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
- One `**Estimate:** ~N lines` line (code + tests) per task, after **Covers:**: `/spec-check` totals them as the size re-estimate after planning (warn-only, budget ~300).
- Each task starts with `**Covers:** [delta](../specs/<cap>/spec.md) - "Requirement: <name>"`. check-handoff fails on a task that names no requirement or a nonexistent one.
- Execution Handoff: record the choice (= `apply_mode`) at the end of the plan.

### Then

1. `node .openspec-handoff/scripts/check-handoff.mjs <id>`; fix errors, read warnings.
2. `/spec-check <id>`; stop on GAPS. Planning ends here. There is no `tasks.md`: the plan's step checkboxes are the tracker.


## Slice of a split change

A change created by `/split-apply` (id `<parent>-<nn>-<slice>`) (its proposal links the parent's `slices.md`) is a normal handoff-driven change with live deltas. Take it only when `/split-next <parent>` says READY (all `depends_on` done = archived folder on main). First mark it: `/split-mark <parent> <slice> in-progress`, committed on main (the next report trusts this mark; there is no branch scanning). Then work on its own branch from main (`git switch -c change/<slice> main`).
- **Design session, narrowed:** the parent keeps the shared session (`../<parent>/execution/brainstorm.md`). Before `/handoff <slice>`, run a SHORT ``brainstorming`` session limited to this slice: read the parent's session file first, ask only what the slice needs (its seams, what earlier slices left in the code), and write the slice's own `execution/brainstorm.md` (first body line links the parent's session file). Do not re-decide what the parent settled; if the slice needs different behaviour, change its delta and record it in this slice's proposal `## Split notes` (`dropped:` / `added:` / `renamed_from:` / `split_from:`), then `split.mjs loss <parent>`. The parent never names requirements.
- **Parent session vs. slice: the delta wins.** Where the parent's design session (`../<parent>/execution/brainstorm.md`, frozen at the split commit, original names) and this slice's delta or split notes differ, the delta wins. The slice's narrowed `execution/brainstorm.md` has an `## Overrides` section listing which parent decisions it overrides (one line each: the parent decision, what the slice does instead, the split note or delta it points at; "None" if nothing). Never edit the parent's session after the split; check-handoff warns when a slice with split notes has no `## Overrides` section.
- A flagged slice keeps its user-visible behaviour behind the flag its delta describes; the cleanup slice removes the flag (its delta `## REMOVED Requirements`).
- **Done = archived on main.** Run `/opsx:archive <slice>` on the slice branch and commit the archive in the slice's own PR together with its code; after the merge, on main: `/split-next <parent>` (next-steps prints it). When every slice is done, the parent is archived last with `/split-archive <parent>`.

## Updating tool files after a delta edit

Superpowers `writing-plans` writes a whole plan; it has no update mode. Rerun it with the existing plan as input and **never reset a finished task** (all step checkboxes ticked) - refuse to overwrite it; replan only open tasks, keeping their `### Task N:` numbers stable where possible.
If a finished task was reset anyway, `check-handoff` fails with "done work reset" (it compares with git HEAD); restore the plan with `git checkout HEAD -- <plan>` and replan again.
After any delta edit (a /spec-check gap, a split note, a re-split): `openspec validate <id> --strict`, rerun the planning command so its files match the delta, then `check-handoff <id>` and `/spec-check <id>` again.

## Implementation (the engineer runs `executing-plans` / `subagent-driven-development`)

1. Execute with the `apply_mode` skill. Tick each plan step checkbox (`- [x]`) as it is done, committed with the task (that is the progress `check-handoff` reads).
2. Final whole-branch review with `requesting-code-review` -> `execution/reviews/code-review.md`. **Reviewer: a fresh session of your own coding agent** - dispatch it as a fresh subagent from `code-reviewer.md`, or run the filled `code-reviewer.md` in a new session, and write "fresh session" at the top of the review file. If that is impossible, run it here and write "self-review" at the top instead (check-handoff warns when the review says neither). Fix Critical/Important.
3. Before deleting the SDD workspace, write `execution/progress.md` (source-of-truth line, ledger lines). `openspec validate <id> --strict`; `check-handoff <id> --expect-complete` (fails while a plan step is unticked).
4. `/opsx:verify <id>`; save the report verbatim to `execution/verify.md`. Then `/opsx:archive <id>` as written, on the change branch, committed with the code; then `finishing-a-development-branch` (merge / PR with the archive in it).
