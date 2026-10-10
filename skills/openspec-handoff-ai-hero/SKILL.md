---
name: openspec-handoff-ai-hero
description: Run the AI Hero flow (mattpocock/skills - grill-with-docs, to-spec, to-tickets, implement, tdd, code-review) on an OpenSpec change folder. Design session in the proposal phase (grill-with-docs -> execution/grill.md); planning after handoff as the engineer's next steps (to-spec reading grill.md -> execution/spec.md, to-tickets); implementation with implement/tdd and code-review. Use when the change's execution tool is ai-hero.
---

# AI Hero on an OpenSpec change

Thin wrapper: you run the real AI Hero skills unmodified, with **this change folder as the issue tracker** and **the OpenSpec proposal + delta as the spec**. OpenSpec owns *what* (proposal, deltas). AI Hero owns *how* (grill decisions, spec, tickets, code, review).

Paths are relative to `openspec/changes/<id>/` (the "change folder").

- **Ignore OpenSpec's apply prompts.** `/opsx:propose` ends with "run /opsx-apply" and `openspec status` prints "Next: openspec instructions apply": this workflow never uses apply. After the proposal and specs, run `/sdd-handoff <id>`; after it, follow `/sdd-next-steps <id>`.
- **No sub-agents in the harness?** If it has no sub-agent (Task) tool, use the inline variant (`implement`; for `code-review`, run its Standards and Spec reviews one after the other) - or, when `apply_mode` requires the sub-agent variant, run each sub-agent role in-session and label it so in commits, reviews and the ledger (`[in-session, no sub-agent tool]`).
- AI Hero skills set `disable-model-invocation: true`. If you cannot call them with the Skill tool, ask the user to type the slash command, or read the installed `SKILL.md` and follow its process yourself.
- The issue tracker is the change folder: `docs/agents/issue-tracker.md` and `docs/agents/triage-labels.md` (installed by `sdd-pp init --tool ai-hero` when absent), pointed at by a marked agent-skills block in `AGENTS.md` - that is how AI Hero's skills find the tracker; `/setup-matt-pocock-skills` is not needed. Nothing goes to `.scratch/` or GitHub/Linear.

## Flow

| Phase | AI Hero step | Output |
|---|---|---|
| Proposal | `grill-with-docs` (= `grilling` + `domain-modeling`) | `execution/grill.md`; `GLOSSARY.md`, `docs/adr/` (linked) |
| Proposal | (OpenSpec) proposal.md + delta, informed by the session | `proposal.md`, `specs/**/spec.md` |
| Specs (end) | `/sdd-split-check` split gate (> 5 requirements or > 2 capabilities: slices proposed, engineer approves, `/sdd-split-apply`; slices are named `<parent>-<nn>-<slice>`) | `execution/split-check.md` |
| Handoff (OpenSpec's last stage) | `/sdd-handoff` writes handoff.md, prints the next steps | `handoff.md` |
| Planning (engineer) | `to-spec`, reading `execution/grill.md` | `execution/spec.md` |
| Planning (engineer) | `to-tickets` | `execution/tickets/NN-<slug>.md` |
| Planning (engineer) | `/sdd-spec-check` (stop on GAPS) | `execution/spec-check.md` |
| Implementation | `implement` or `implement-spec` (`apply_mode`) + `tdd` - not `/opsx:apply` | code + tests; ticket `Status: done` + checkboxes |
| Implementation | `code-review` (implement calls it) | any file it writes goes in `execution/reviews/` (optional) |
| Verify / archive | `/opsx:verify`, then `/opsx:archive` | `execution/verify.md` |

## Design session (proposal phase)

Runs when `/opsx:propose`, `/opsx:new` + `/opsx:continue` or `/opsx:ff` reaches the proposal, before `proposal.md` is written. `openspec instructions proposal` says so.

1. `/sdd-tool <id>` (runs `node .openspec-handoff/scripts/sdd.mjs tool <id>`) must say `ai-hero` (project default or `--set ai-hero`). `/sdd-tool <id>` only shows the tool and writes nothing; `--set ai-hero` starts `execution/grill.md` (front matter `tool: ai-hero` / `session: grill-with-docs`). With the project default and no `--set`, write that front matter yourself when you start `execution/grill.md`.
2. Run `grill-with-docs` on the user's request (and the existing main specs it touches). If the user delegated decisions, answer each round yourself with the recommended answer (or a better one) and mark those answers as yours.
3. Write `execution/grill.md`:
   - keep the front matter
   - `## Grilling record`: each round's questions and answers
   - `## Decisions`: settled *how* - module boundaries, interfaces, data shapes, algorithms, test seams
   - `## Scenarios found`: names only of behaviours the grilling surfaced - each one becomes a requirement or scenario in the delta (the delta holds its WHEN/THEN, not this file)
   - links to `GLOSSARY.md` / ADRs written by domain-modeling
4. Hand back to OpenSpec: write `proposal.md` (what/why only - no decisions, file layouts or algorithms; those stay in grill.md) and the delta (every scenario from step 3, `## Purpose` first for a new capability). `openspec validate <id> --strict`.
5. Once the delta exists, point the behavioural answers in the grilling record at it by name (`-> delta Scenario "<name>"`) instead of keeping the rule's wording twice.

## Planning (after handoff - the engineer's first next steps)

After `/sdd-handoff` wrote `handoff.md` (`tool: ai-hero`, the session file must exist) and printed the next steps:

### to-spec (`execution/spec.md`) - reads `execution/grill.md`

- The grilling already happened: to-spec's seams check (step 2) is answered from `execution/grill.md`; do not re-grill.
- **Problem Statement** / **Solution**: one or two sentences pointing at `../proposal.md` - do not retell them.
- **User Stories**: numbered, each naming the requirement it covers as `"Requirement: <name>"` with a link to the delta (/sdd-spec-check reports a story that names none or a nonexistent one), plus its scenarios by name. A story no requirement covers is a behaviour gap: add it to the delta first.
- **Implementation Decisions**, **Testing Decisions**, **Out of Scope**, **Further Notes**: in full, as the template says; summarise and link the decisions in `grill.md` rather than repeating the record.
- Publishing = writing the file; `Status: ready-for-agent` line near the top.

### to-tickets (`execution/tickets/`)

- One file per ticket, `NN-<slug>.md`, dependency order, AI Hero's local ticket template (`What to build`, `Blocked by`, `Status`, checkboxes).
- **What to build**: the requirement(s) this slice makes work, by name + link (`[delta](../../specs/<cap>/spec.md) - "Requirement: <name>"`), plus the slice's path through the code. Do not re-describe behaviour.
- Checkboxes: one per scenario, by name only: `- [ ] Scenario "<name>" passes`. Cite scenario and requirement names **exactly** as in the delta (same words and case) - /sdd-spec-check matches names, so a paraphrased name is an unknown reference.
- One `Estimate: ~N lines` line (code + tests) per ticket: `/sdd-spec-check` totals them as the size re-estimate after planning (warn-only, budget ~300).
- At most 8 tickets (hard cap 12). Quiz step: if decisions were delegated, approve the breakdown yourself and note it in `grill.md`.

### Then

1. `/sdd-spec-check <id>` (the only plan-vs-spec check); stop on GAPS. On PASS it accepts the result (`--accept`: the spec-change baseline `execution/.spec-check.json`). Commit `execution/` - planning files and `.spec-check.json` - on branch `change/<id>`. Planning ends here. There is no `tasks.md`: the tickets are the tracker (`openspec list` / `openspec status` do not see their checkboxes - expected).


## Slice of a split change

A change created by `/sdd-split-apply` (id `<parent>-<nn>-<slice>`) (its proposal links the parent's `slices.md`) is a normal handoff-driven change with live deltas. Take it only when `/sdd-split-next <parent>` says READY (all `depends_on` done = archived folder on main). First take it: `/sdd-slice-start <slice>` (finds the parent, refuses unless READY, marks it in-progress and prints the next lines); commit the mark on main (the next report trusts it; there is no branch scanning; `/sdd-slice-start <slice> --undo` releases it). Then work on its own branch from main (`git switch -c change/<slice> main`).
- **Design session, narrowed:** the parent keeps the shared session (`../<parent>/execution/grill.md`). Before `/sdd-handoff <slice>`, run a SHORT ``grill-with-docs`` session limited to this slice: read the parent's session file first, ask only what the slice needs (its seams, what earlier slices left in the code), and write the slice's own `execution/grill.md` (first body line links the parent's session file). Do not re-decide what the parent settled; if the slice needs different behaviour, change its delta and record it in this slice's proposal `## Split notes` (`dropped:` / `added:` / `renamed_from:` / `split_from:`), then `split.mjs loss <parent>`. The parent never names requirements.
- **Parent session vs. slice: the delta wins.** Where the parent's design session (`../<parent>/execution/grill.md`, frozen at the split commit, original names) and this slice's delta or split notes differ, the delta wins. The slice's narrowed `execution/grill.md` has an `## Overrides` section listing which parent decisions it overrides (one line each: the parent decision, what the slice does instead, the split note or delta it points at; "None" if nothing). Never edit the parent's session after the split; `split.mjs loss <parent>` warns when a slice with split notes has no `## Overrides` section.
- A flagged slice keeps its user-visible behaviour behind the flag its delta describes; the cleanup slice removes the flag (its delta `## REMOVED Requirements`).
- **Done = archived on main.** After `/opsx:verify <slice>`, run `/sdd-slice-finish <slice>` on the slice branch (instead of `/opsx:archive`: it checks verify.md / progress.md, archives, and marks the slice done in the parent's `slices.md`) and commit the archive in the slice's own PR together with its code; after the merge, on main: `/sdd-split-next <parent>` (next-steps prints it). When every slice is done, the parent is archived last with `/sdd-split-finish <parent>`.

## Updating tool files after a delta edit

**One order after any delta edit** (a /sdd-spec-check gap, a split note, a re-split, a changed scenario):
1. Edit the delta, then `openspec validate <id> --strict`.
2. `/sdd-spec-check <id>`: its "Spec changes since the last check" section lists each requirement / scenario added, changed, removed or renamed since the last accepted PASS, with the units citing it, and a hint naming the open units to re-plan. The list stays on every run until a PASS is accepted - it is never reset by re-running.
3. Re-plan ONLY the open units the report names (below). Done units are never touched; a change that affects done work becomes a new ticket. Where a planned decision changed, write `superseded by delta edit: <reason>` next to it in the planning output; the design session file stays as-is (it is the record; the delta wins).
4. `/sdd-spec-check <id>` until PASS; the command then accepts it (`spec-check.mjs <id> --accept`), and you commit `execution/.spec-check.json` with the planning files.

AI Hero's `to-spec` and `to-tickets` have no update mode (`to-tickets` drafts a new set numbered from 01; on a real tracker it only creates issues). So, for step 3:
- **User stories** the report names: run `to-spec` again with the existing `execution/spec.md` as input and change only those stories (and the decisions they need); keep every other story as it is.
- **Open tickets** the report names: rewrite only those (same number), from `to-tickets` run for that work only, reading the existing tickets as context. Changes no open ticket covers: new tickets, numbered after the last one. On a real tracker, close obsolete issues by hand.
- **Never overwrite a ticket marked `Status: done`** (refuse, even if asked to regenerate everything). If one was reset anyway, restore it with `git checkout HEAD -- <ticket>` (`git diff HEAD -- execution/tickets/` shows it).

## Implementation (the engineer runs `implement` / `implement-spec`)

1. Implement with the `apply_mode` command. Ticket done: `Status: done` + tick its scenario checkboxes in the same commit (AI Hero's own completion: a ticket is done when its Status says so). With `implement-spec`, its integration branch is `change/<id>`; each ticket's `Status: done` + checkboxes go in the ticket-branch commit with its code, before that branch is merged into `change/<id>`.
2. `code-review` - AI Hero's own review step (`implement` calls it); fix what it finds. Fixed point: `base_ref` in `handoff.md` (`git diff <base_ref>...HEAD`); the spec is this change folder (`proposal.md`, the `specs/**/spec.md` deltas, `execution/spec.md`, the tickets). If it writes a file, keep it in `execution/reviews/`. CI also runs a code review on the PR, so no review file or label is required.
3. `/opsx:verify <id>`; save the report verbatim to `execution/verify.md`. Then `/opsx:archive <id>` as written, on the change branch, and commit the archive in the change's PR with its code; then merge the PR.
