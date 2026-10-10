---
name: openspec-handoff-superpowers
description: Run the Superpowers flow (obra/superpowers - brainstorming, writing-plans, executing-plans or subagent-driven-development, requesting-code-review) on an OpenSpec change folder. Design session in the proposal phase (brainstorming -> execution/brainstorm.md, stopped before writing-plans so OpenSpec writes the specs); planning after handoff as the engineer's next steps (writing-plans reading brainstorm.md -> execution/plan-<id>.md). Use when the change's execution tool is superpowers.
---

# Superpowers on an OpenSpec change

Thin wrapper: you run the real Superpowers skills unmodified. The OpenSpec change folder replaces `docs/superpowers/` as their home. OpenSpec owns *what* (proposal + delta); Superpowers owns *how* (brainstorming's written design and the plan).

Paths are relative to `openspec/changes/<id>/` (the "change folder").

- **Ignore OpenSpec's apply prompts.** `/opsx:propose` ends with "run /opsx-apply" and `openspec status` prints "Next: openspec instructions apply": this workflow never uses apply. After the proposal and specs, run `/sdd-handoff <id>`; after it, follow `/sdd-next-steps <id>`.
- **No sub-agents in the harness?** If it has no sub-agent (Task) tool, use the inline variant (`executing-plans`; the brainstorming builder check and reviews are read in-session, as the skills allow) - or, when `apply_mode` requires the sub-agent variant, run each sub-agent role in-session and label it so in commits, reviews and the ledger (`[in-session, no sub-agent tool]`).

**Location override (user preference, which brainstorming and writing-plans honour):** the written design goes to `execution/brainstorm.md` (not `docs/superpowers/specs/`); the plan goes to `execution/plan-<id>.md` (not `docs/superpowers/plans/`). The unique plan name gives the SDD workspace a unique name (`.superpowers/sdd/plan-<id>/`).

## Flow

| Phase | Superpowers step | Output |
|---|---|---|
| Proposal | `brainstorming` - **stopped after the written design** | `execution/brainstorm.md` |
| Proposal | (OpenSpec) proposal.md + delta, informed by the session | `proposal.md`, `specs/**/spec.md` |
| Specs (end) | `/sdd-split-check` split gate (> 5 requirements or > 2 capabilities: slices proposed, engineer approves, `/sdd-split-apply`; slices are named `<parent>-<nn>-<slice>`) | `execution/split-check.md` |
| Handoff (OpenSpec's last stage) | `/sdd-handoff` writes handoff.md, prints the next steps | `handoff.md` |
| Planning (engineer) | `writing-plans`, reading `execution/brainstorm.md` | `execution/plan-<id>.md` |
| Planning (engineer) | `/sdd-spec-check` (stop on GAPS) | `execution/spec-check.md` |
| Implementation | branch `change/<id>` before implementation: a plain branch or a worktree (`using-git-worktrees`) - either works; Superpowers recommends the worktree | branch `change/<id>` (plan, code and archive all go in its PR) |
| Implementation | `executing-plans` or `subagent-driven-development` (`apply_mode`) - not `/opsx:apply` | code + tests; `.superpowers/sdd/plan-<id>/` (git-ignored); `execution/progress.md` |
| Implementation | `requesting-code-review` (final whole-branch review) | any file it writes goes in `execution/reviews/` (optional) |
| Verify / archive | `/opsx:verify`, `/opsx:archive`, then `finishing-a-development-branch` | `execution/verify.md` |

## Design session (proposal phase)

Runs when `/opsx:propose`, `/opsx:new` + `/opsx:continue` or `/opsx:ff` reaches the proposal, before `proposal.md` is written.

1. `/sdd-tool <id>` (runs `node .openspec-handoff/scripts/sdd.mjs tool <id>`) must say `superpowers` (project default, or `/sdd-tool <id> --set superpowers` for a per-change override). `/sdd-tool <id>` creates `execution/brainstorm.md` (front matter `tool: superpowers` / `session: brainstorming`) when it is missing, for the project default as for `--set`.
2. Run `brainstorming` on the user's request (and the existing main specs it touches) as written: first message, questions, approaches, design sections, approval. If decisions were delegated, answer on the user's behalf and mark those answers as your calls.
   - **Size the Work**: pick "a project with a written design" (the engineer plans it with writing-plans after /sdd-handoff).
3. **The Written Design** goes to `execution/brainstorm.md` (keep the front matter). Write it as brainstorming says (intent and why, goals / non-goals, constraints, the parts of the how they decided, what's left to the builder), and end with `## Scenarios found`: names only of the behaviours the session surfaced - each becomes a requirement or scenario in the delta.
   - Builder check: dispatch the subagent if you have one; otherwise read the document as that builder yourself (the skill allows this). Record the three piles.
   - Approval (HARD-GATE): the user's, or yours on their behalf if delegated (say so).
4. **STOP brainstorming here.** Its terminal step says "invoke writing-plans". In this workflow that step is deferred until after `/sdd-handoff` (the engineer's first next step): do **not** invoke writing-plans, do not write a plan, and do not start implementation. Write at the end of `brainstorm.md`: `Next: OpenSpec proposal + specs + /sdd-handoff; writing-plans is the engineer's first next step after it.`
5. Hand back to OpenSpec: write `proposal.md` (what/why only - decisions stay in `brainstorm.md`) and the delta (every scenario from step 3, `## Purpose` first for a new capability). `openspec validate <id> --strict`.
6. Once the delta exists, cite it by name from the written design's goals; the conversation record and playbacks may keep the partner's words.

## Planning (after handoff - the engineer's first next steps)

After `/sdd-handoff` wrote `handoff.md` (`tool: superpowers`, the session file must exist) and printed the next steps: run `writing-plans`, reading `execution/brainstorm.md` as the approved design.

### writing-plans overrides (`execution/plan-<id>.md`)

- Header `**Spec:**` line: `[proposal](../proposal.md) · [specs/<cap>/spec.md](../specs/<cap>/spec.md) · [brainstorm](brainstorm.md) · [handoff](../handoff.md)`.
- **Goal**: one sentence naming the capability and linking the delta; do not restate its rules.
- **Global Constraints**: one line per requirement as a link to its **name** (`[delta](../specs/<cap>/spec.md) - "Requirement: <name>"`), plus non-behavioural constraints. No values or SHALL text.
- **Architecture, File Structure, Interfaces, Review Focus, task steps, test code, commands**: in full as writing-plans says. Test code may contain scenario values.
- `### Task N: <name>` headings, named after the component/slice. At most 8 tasks (hard cap 12).
- One `**Estimate:** ~N lines` line (code + tests) per task, after **Covers:**: `/sdd-spec-check` totals them as the size re-estimate after planning (warn-only, budget ~300).
- Each task starts with `**Covers:** [delta](../specs/<cap>/spec.md) - "Requirement: <name>"`. /sdd-spec-check reports a task that names no requirement or a nonexistent one. Cite requirement and scenario names **exactly** as in the delta (same words and case) - /sdd-spec-check matches names, so a paraphrased name is an unknown reference.
- Execution Handoff: record the choice (= `apply_mode`) at the end of the plan.

### Then

1. `/sdd-spec-check <id>` (the only plan-vs-spec check); stop on GAPS. On PASS it accepts the result (`--accept`: the spec-change baseline `execution/.spec-check.json`). Commit the plan and `.spec-check.json` on branch `change/<id>`. Planning ends here. There is no `tasks.md`: the plan's step checkboxes are the tracker (`openspec list` / `openspec status` do not see them - expected).


## Slice of a split change

A change created by `/sdd-split-apply` (id `<parent>-<nn>-<slice>`) (its proposal links the parent's `slices.md`) is a normal handoff-driven change with live deltas. Take it only when `/sdd-split-next <parent>` says READY (all `depends_on` done = archived folder on main). First take it: `/sdd-split-start <slice>` (finds the parent, refuses unless READY, marks it in-progress and prints the next lines); commit the mark on main (the next report trusts it; there is no branch scanning; `/sdd-split-start <slice> --undo` releases it). Then work on its own branch from main (`git switch -c change/<slice> main`).
- **Design session, narrowed:** the parent keeps the shared session (`../<parent>/execution/brainstorm.md`). Before `/sdd-handoff <slice>`, run a SHORT ``brainstorming`` session limited to this slice: read the parent's session file first, ask only what the slice needs (its seams, what earlier slices left in the code), and write the slice's own `execution/brainstorm.md` (first body line links the parent's session file). Do not re-decide what the parent settled; if the slice needs different behaviour, change its delta and record it in this slice's proposal `## Split notes` (`dropped:` / `added:` / `renamed_from:` / `split_from:`), then `split.mjs loss <parent>`. The parent never names requirements.
- **Parent session vs. slice: the delta wins.** Where the parent's design session (`../<parent>/execution/brainstorm.md`, frozen at the split commit, original names) and this slice's delta or split notes differ, the delta wins. The slice's narrowed `execution/brainstorm.md` has an `## Overrides` section listing which parent decisions it overrides (one line each: the parent decision, what the slice does instead, the split note or delta it points at; "None" if nothing). Never edit the parent's session after the split; `split.mjs loss <parent>` warns when a slice with split notes has no `## Overrides` section.
- A flagged slice keeps its user-visible behaviour behind the flag its delta describes; the cleanup slice removes the flag (its delta `## REMOVED Requirements`).
- **Done = archived on main.** After `/opsx:verify <slice>`, run `/sdd-slice-finish <slice>` on the slice branch (instead of `/opsx:archive`: it checks verify.md / progress.md, archives, and marks the slice done in the parent's `slices.md`) and commit the archive in the slice's own PR together with its code; after the merge, on main: `/sdd-split-next <parent>` (next-steps prints it). When every slice is done, the parent is archived last with `/sdd-split-archive <parent>`.

## Updating tool files after a delta edit

**One order after any delta edit** (a /sdd-spec-check gap, a split note, a re-split, a changed scenario):
1. Edit the delta, then `openspec validate <id> --strict`.
2. `/sdd-spec-check <id>`: its "Spec changes since the last check" section lists each requirement / scenario added, changed, removed or renamed since the last accepted PASS, with the units citing it, and a hint naming the open units to re-plan. The list stays on every run until a PASS is accepted - it is never reset by re-running.
3. Re-plan ONLY the open units the report names (below). Done units are never touched; a change that affects done work becomes a new plan task. Where a planned decision changed, write `superseded by delta edit: <reason>` next to it in the planning output; the design session file stays as-is (it is the record; the delta wins).
4. `/sdd-spec-check <id>` until PASS; the command then accepts it (`spec-check.mjs <id> --accept`), and you commit `execution/.spec-check.json` with the planning files.

Superpowers `writing-plans` writes a whole plan; it has no update mode. For step 3, rerun it with the existing plan as input and change only the open tasks the report names (keep their `### Task N:` numbers); changes no open task covers become new tasks numbered after the last. **Never reset a finished task** (all step checkboxes ticked) - refuse to overwrite it. If one was reset anyway (`git diff HEAD -- <plan>` shows it), restore the plan with `git checkout HEAD -- <plan>` and replan again.

## Implementation (the engineer runs `executing-plans` / `subagent-driven-development`)

1. Execute with the `apply_mode` skill. Tick each plan step checkbox (`- [x]`) as it is done, committed with the task (Superpowers' own completion: the ledger and the plan's step checkboxes).
2. Final whole-branch review with `requesting-code-review` - Superpowers' own review step; fix Critical/Important. BASE_SHA: `base_ref` in `handoff.md`; the requirements are this change folder (`proposal.md`, the `specs/**/spec.md` deltas, the plan). If it writes a file, keep it in `execution/reviews/`. CI also runs a code review on the PR, so no review file or label is required.
3. The SDD workspace is the directory Superpowers' `subagent-driven-development/scripts/sdd-workspace <plan>` prints (`.superpowers/sdd/plan-<id>/`, git-ignored); its ledger is `<workspace>/progress.md`. Before deleting the workspace, copy the ledger lines to `execution/progress.md`.
4. `/opsx:verify <id>`; save the report verbatim to `execution/verify.md`. Then `/opsx:archive <id>` as written, on the change branch, committed with the code; then `finishing-a-development-branch` (merge / PR with the archive in it). Archive first because finishing merges or opens the PR, and the archive must already be in it.
