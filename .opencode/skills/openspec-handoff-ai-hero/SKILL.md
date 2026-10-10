---
name: openspec-handoff-ai-hero
description: Run the AI Hero flow (mattpocock/skills - grill-with-docs, to-spec, to-tickets, implement, tdd, code-review) on an OpenSpec change folder. Design session in the proposal phase (grill-with-docs -> execution/grill.md); planning after handoff as the engineer's next steps (to-spec reading grill.md -> execution/spec.md, to-tickets); implementation with implement/tdd and code-review. Use when the change's execution tool is ai-hero.
---

# AI Hero on an OpenSpec change

Thin wrapper: you run the real AI Hero skills unmodified, with **this change folder as the issue tracker** and **the OpenSpec proposal + delta as the spec**. OpenSpec owns *what* (proposal, deltas). AI Hero owns *how* (grill decisions, spec, tickets, code, review).

Paths are relative to `openspec/changes/<id>/` (the "change folder").

- AI Hero skills set `disable-model-invocation: true`. If you cannot call them with the Skill tool, ask the user to type the slash command, or read the installed `SKILL.md` and follow its process yourself.
- The issue tracker is the change folder: `docs/agents/issue-tracker.md` (installed from `.openspec-handoff/issue-tracker-openspec.md` by `/setup-matt-pocock-skills` -> "Other"). Nothing goes to `.scratch/` or GitHub/Linear.

## Flow

| Phase | AI Hero step | Output |
|---|---|---|
| Proposal | `grill-with-docs` (= `grilling` + `domain-modeling`) | `execution/grill.md`; `GLOSSARY.md`, `docs/adr/` (linked) |
| Proposal | (OpenSpec) proposal.md + delta, informed by the session | `proposal.md`, `specs/**/spec.md` |
| Specs (end) | `/split-check` size gate (~300 lines code + tests; over it: slices proposed, engineer approves, `split.mjs apply`) | `execution/size-estimate.md`, `execution/split-check.md` |
| Handoff (OpenSpec's last stage) | `/handoff` writes handoff.md, prints the next steps | `handoff.md` |
| Planning (engineer) | `to-spec`, reading `execution/grill.md` | `execution/spec.md` |
| Planning (engineer) | `to-tickets` | `execution/tickets/NN-<slug>.md` |
| Planning (engineer) | `/spec-check` (stop on GAPS) | `execution/spec-check.md` |
| Implementation | `implement` or `implement-spec` (`apply_mode`) + `tdd` - not `/opsx:apply` | code + tests; ticket `Status: done` + checkboxes |
| Implementation | `code-review` (implement calls it) | `execution/reviews/code-review.md` |
| Verify / archive | `/opsx:verify`, then `/opsx:archive` | `execution/verify.md` |
| Optional | `/adversarial-review` (different model) | `execution/reviews/<ts>-<model>.md` |

## Design session (proposal phase)

Runs when `/opsx:propose`, `/opsx:new` + `/opsx:continue` or `/opsx:ff` reaches the proposal, before `proposal.md` is written. `openspec instructions proposal` says so.

1. `node .openspec-handoff/scripts/execution-tool.mjs <id>` must say `ai-hero` (project default or `--set ai-hero`). `--set` creates `execution/grill.md` with front matter `tool: ai-hero` / `session: grill-with-docs`; create it the same way if it does not exist.
2. Run `grill-with-docs` on the user's request (and the existing main specs it touches). If the user delegated decisions, answer each round yourself with the recommended answer (or a better one) and mark those answers as yours.
3. Write `execution/grill.md`:
   - keep the front matter; first body line `> Source of truth: [proposal](../proposal.md) · [specs/<cap>/spec.md](../specs/<cap>/spec.md)`
   - `## Grilling record`: each round's questions and answers
   - `## Decisions`: settled *how* - module boundaries, interfaces, data shapes, algorithms, test seams
   - `## Scenarios found`: names only of behaviours the grilling surfaced - each one becomes a requirement or scenario in the delta (the delta holds its WHEN/THEN, not this file)
   - links to `GLOSSARY.md` / ADRs written by domain-modeling
4. Hand back to OpenSpec: write `proposal.md` (what/why only - no decisions, file layouts or algorithms; those stay in grill.md) and the delta (every scenario from step 3, `## Purpose` first for a new capability). `openspec validate <id> --strict`. `check-handoff` warns on implementation detail in proposal.md.
5. Once the delta exists, point the behavioural answers in the grilling record at it by name (`-> delta Scenario "<name>"`) instead of keeping the rule's wording twice; `check-handoff` flags likely paraphrases as warnings.

## Planning (after handoff - the engineer's first next steps)

After `/handoff` wrote `handoff.md` (`tool: ai-hero`, the session file must exist) and printed the next steps:

### to-spec (`execution/spec.md`) - reads `execution/grill.md`

- First line: `> Source of truth: [proposal](../proposal.md) · [spec delta](../specs/<cap>/spec.md) · [grill session](grill.md)`
- The grilling already happened: to-spec's seams check (step 2) is answered from `execution/grill.md`; do not re-grill.
- **Problem Statement** / **Solution**: one or two sentences pointing at `../proposal.md` - do not retell them.
- **User Stories**: numbered, each naming the requirement it covers as `"Requirement: <name>"` with a link to the delta (check-handoff fails on a story that names none or a nonexistent one), plus its scenarios by name. A story no requirement covers is a behaviour gap: add it to the delta first.
- **Implementation Decisions**, **Testing Decisions**, **Out of Scope**, **Further Notes**: in full, as the template says; summarise and link the decisions in `grill.md` rather than repeating the record.
- Publishing = writing the file; `Status: ready-for-agent` line near the top.

### to-tickets (`execution/tickets/`)

- One file per ticket, `NN-<slug>.md`, dependency order, AI Hero's local ticket template (`What to build`, `Blocked by`, `Status`, checkboxes).
- First line: `> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/<cap>/spec.md) · [spec](../spec.md) · [grill session](../grill.md)`
- **What to build**: the requirement(s) this slice makes work, by name + link (`[delta](../../specs/<cap>/spec.md) - "Requirement: <name>"`), plus the slice's path through the code. Do not re-describe behaviour.
- Checkboxes: one per scenario, by name only: `- [ ] Scenario "<name>" passes`.
- One `Estimate: ~N lines` line (code + tests) per ticket: `/spec-check` totals them as the size re-estimate after planning (warn-only, budget ~300).
- At most 8 tickets (hard cap 12). Quiz step: if decisions were delegated, approve the breakdown yourself and note it in `grill.md`.

### Then

1. `node .openspec-handoff/scripts/check-handoff.mjs <id>`; fix errors, read warnings.
2. `/spec-check <id>`; stop on GAPS. Planning ends here. There is no `tasks.md`: the tickets are the tracker.


## Slice of a split change

A change created by `split.mjs apply` (its proposal links the parent's `slices.md`) is a normal handoff-driven change with live deltas. Take it only when `node .openspec-handoff/scripts/split.mjs next <parent>` says READY (all `depends_on` archived), on its own branch from main (`git switch -c change/<slice> main`).
- **Design session, narrowed:** the parent keeps the shared session (`../<parent>/execution/grill.md`). Before `/handoff <slice>`, run a SHORT ``grill-with-docs`` session limited to this slice: read the parent's session file first, ask only what the slice needs (its seams, what earlier slices left in the code), and write the slice's own `execution/grill.md` (first body line links the parent's session file). Do not re-decide what the parent settled; if the slice needs different behaviour, change its delta and record an amendment in the parent (`slices.md`), then `split.mjs loss <parent>`.
- A flagged slice keeps its user-visible behaviour behind the flag its delta describes; the cleanup slice removes the flag (its delta `## REMOVED Requirements`).
- After `/opsx:archive <slice>`: `node .openspec-handoff/scripts/split.mjs next <parent> --write-tickets` (next-steps prints it).

## Updating tool files after a delta edit

AI Hero's `to-spec` and `to-tickets` have no update mode: `to-spec` writes the whole spec again, and `to-tickets` drafts a new set and publishes it ("write one file per ticket ... numbered from 01"; on a real tracker it creates new issues and never modifies existing ones). So:
1. `to-spec` again -> overwrite `execution/spec.md`.
2. Tickets: keep tickets with `Status: done` as they are. Delete the open ones, then run `to-tickets` for the remaining work only, numbering after the last kept ticket (it reads the existing files as context). On a real tracker, close the obsolete issues by hand.
After any delta edit (a /spec-check gap, an amendment, a re-split): `openspec validate <id> --strict`, rerun the planning command so its files match the delta, then `check-handoff <id>` and `/spec-check <id>` again.

## Implementation (the engineer runs `implement` / `implement-spec`)

1. Implement with the `apply_mode` command. Ticket done: `Status: done` + tick its scenario checkboxes in the same commit (that is the progress `check-handoff` reads).
2. `code-review` -> `execution/reviews/code-review.md`. Run its Standards and Spec reviewers as **fresh sub-agents** (no access to this conversation). Without a sub-agent tool, run the same briefs in another fresh context (a new session or a local model); if neither is possible, write "self-review" at the top. Fix Critical/Important findings. Then `openspec validate <id> --strict` and `check-handoff <id> --expect-complete` (fails while a ticket is open).
3. `/opsx:verify <id>`; save the report verbatim to `execution/verify.md`. Then `/opsx:archive <id>` as written.
